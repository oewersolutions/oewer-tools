import { describe, expect, it } from "vitest";
import { commitFiles, fromBase64, type GithubSession } from "../lib/admin/github";

const session: GithubSession = { owner: "acme", repo: "site", branch: "main", path: "data/oewer_database.xlsx", token: "github_pat_TEST" };

/** A tiny pretend of GitHub's Git data API: blobs, trees, commits and a branch that can move. */
function fakeGit(opts: { movedAt?: number[]; failBlob?: number } = {}) {
  const log: string[] = [];
  const blobs = new Map<string, Uint8Array>();
  let head = "head0";
  let attempt = 0;
  let blobCount = 0;
  const trees: { base_tree: string; tree: { path: string; sha: string }[] }[] = [];
  const fn = (async (url: string | URL, init: RequestInit = {}) => {
    const u = new URL(String(url));
    const method = init.method ?? "GET";
    const path = u.pathname.replace("/repos/acme/site", "");
    log.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (method === "POST" && path === "/git/blobs") {
      if (opts.failBlob === ++blobCount) return json({ message: "Resource not accessible by personal access token" }, 403);
      const sha = `blob${blobs.size}`;
      blobs.set(sha, fromBase64(body.content));
      return json({ sha });
    }
    if (method === "GET" && path === "/git/ref/heads/main") return json({ object: { sha: head } });
    if (method === "GET" && path.startsWith("/git/commits/")) return json({ tree: { sha: `tree-of-${path.split("/").pop()}` } });
    if (method === "POST" && path === "/git/trees") {
      trees.push(body);
      return json({ sha: `tree${trees.length}` });
    }
    if (method === "POST" && path === "/git/commits") return json({ sha: `commit${trees.length}`, html_url: `https://github.com/acme/site/commit/commit${trees.length}` });
    if (method === "PATCH" && path === "/git/refs/heads/main") {
      attempt++;
      if (opts.movedAt?.includes(attempt)) {
        head = `head${attempt}`; // somebody else saved first
        return json({ message: "Update is not a fast forward" }, 422);
      }
      expect(body.force).toBe(false);
      head = body.sha;
      return json({});
    }
    return json({ message: "Not Found" }, 404);
  }) as typeof fetch;
  return { fn, log, blobs, trees: () => trees };
}

const files = [
  { path: "public/images/blog/x/cover-ab12cd-1600.webp", bytes: new Uint8Array([1, 2, 3, 4]) },
  { path: "/public/images/blog/x/cover-ab12cd-800.webp", bytes: new Uint8Array([5, 6]) },
];

describe("commitFiles", () => {
  it("saves every file in one commit, on top of the branch's latest commit, without force", async () => {
    const git = fakeGit();
    const result = await commitFiles(session, files, "Admin: add cover for x", git.fn);
    expect(result.commitSha).toBe("commit1");
    expect(result.commitUrl).toContain("/commit/commit1");
    expect([...git.blobs.values()].map((b) => [...b])).toEqual([[1, 2, 3, 4], [5, 6]]);
    expect(git.trees()).toHaveLength(1);
    expect(git.trees()[0]!.base_tree).toBe("tree-of-head0");
    expect(git.trees()[0]!.tree.map((t) => t.path)).toEqual(["public/images/blog/x/cover-ab12cd-1600.webp", "public/images/blog/x/cover-ab12cd-800.webp"]); // no leading slash
    expect(git.log.filter((l) => l.startsWith("PATCH"))).toHaveLength(1);
  });

  it("starts again on top of the other person's commit when the branch moved, without making the files twice", async () => {
    const git = fakeGit({ movedAt: [1] });
    const result = await commitFiles(session, files, "m", git.fn);
    expect(git.log.filter((l) => l === "POST /git/blobs")).toHaveLength(2); // blobs are made once
    expect(git.log.filter((l) => l.startsWith("PATCH"))).toHaveLength(2);
    expect(git.trees().map((t) => t.base_tree)).toEqual(["tree-of-head0", "tree-of-head1"]); // the retry builds on their commit
    expect(result.commitSha).toBe("commit2");
  });

  it("gives up with a clear message when the branch keeps moving", async () => {
    const git = fakeGit({ movedAt: [1, 2, 3] });
    await expect(commitFiles(session, files, "m", git.fn)).rejects.toMatchObject({ kind: "conflict", message: expect.stringContaining("keeps changing") });
  });

  it("passes on GitHub's own message when the token may not write", async () => {
    const git = fakeGit({ failBlob: 1 });
    await expect(commitFiles(session, files, "m", git.fn)).rejects.toMatchObject({ kind: "forbidden" });
    expect(git.log.some((l) => l.startsWith("PATCH"))).toBe(false); // the branch was never touched
  });

  it("refuses to make an empty commit", async () => {
    await expect(commitFiles(session, [], "m", fakeGit().fn)).rejects.toThrow(/nothing to save/);
  });
});
