import { describe, expect, it } from "vitest";
import { commitWorkbook, fromBase64, GithubError, parseRepo, readWorkbookFile, toBase64, verifySession, type GithubSession } from "../lib/admin/github";

const session: GithubSession = { owner: "acme", repo: "site", branch: "main", path: "data/oewer_database.xlsx", token: "github_pat_TEST" };

type Handler = (url: string, init: RequestInit) => { status?: number; body?: unknown; headers?: Record<string, string> } | undefined;
function fakeFetch(handler: Handler) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const r = handler(String(url), init) ?? { status: 404, body: { message: "Not Found" } };
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
  return { fn, calls };
}

describe("parseRepo", () => {
  it("splits owner/name and rejects anything else", () => {
    expect(parseRepo("oewersolutions/oewer-tools")).toEqual({ owner: "oewersolutions", repo: "oewer-tools" });
    expect(parseRepo(" a/b.c ")).toEqual({ owner: "a", repo: "b.c" });
    for (const bad of ["", "nope", "a/b/c", "a b/c", "/c", "a/"]) expect(parseRepo(bad)).toBeNull();
  });
});

describe("base64", () => {
  it("round-trips bytes, including large and non-text data", () => {
    const bytes = Uint8Array.from({ length: 100_000 }, (_, i) => (i * 31) % 256);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });
  it("ignores line breaks, as GitHub inserts them", () => {
    expect(fromBase64("aGVs\nbG8=")).toEqual(new TextEncoder().encode("hello"));
  });
});

describe("verifySession", () => {
  it("reports the repository and whether the token can write", async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { full_name: "acme/site", permissions: { push: true } } }));
    expect(await verifySession(session, fn)).toEqual({ fullName: "acme/site", canPush: true });
    expect(calls[0]!.url).toBe("https://api.github.com/repos/acme/site");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer github_pat_TEST");
  });
  it("reports a read-only token", async () => {
    const { fn } = fakeFetch(() => ({ body: { full_name: "acme/site", permissions: { push: false } } }));
    expect((await verifySession(session, fn)).canPush).toBe(false);
  });
});

describe("errors", () => {
  const kindFor = async (status: number, headers?: Record<string, string>, body: unknown = { message: "x" }) => {
    const { fn } = fakeFetch(() => ({ status, body, headers }));
    try {
      await verifySession(session, fn);
    } catch (e) {
      return (e as GithubError).kind;
    }
    return "none";
  };
  it("maps GitHub statuses to clear kinds", async () => {
    expect(await kindFor(401)).toBe("auth");
    expect(await kindFor(403)).toBe("forbidden");
    expect(await kindFor(403, { "x-ratelimit-remaining": "0" })).toBe("rate_limit");
    expect(await kindFor(404)).toBe("not_found");
    expect(await kindFor(409)).toBe("conflict");
    expect(await kindFor(422, undefined, { message: "sha wasn't supplied" })).toBe("conflict");
    expect(await kindFor(500)).toBe("other");
  });
  it("reports a network failure", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    await expect(verifySession(session, down)).rejects.toMatchObject({ kind: "network" });
  });
  it("never puts the token in an error message", async () => {
    const { fn } = fakeFetch(() => ({ status: 401, body: { message: "Bad credentials" } }));
    await expect(verifySession(session, fn)).rejects.toSatisfy((e: unknown) => !(e as Error).message.includes("github_pat_TEST"));
  });
});

describe("readWorkbookFile", () => {
  it("returns the bytes and the SHA of that version", async () => {
    const data = Uint8Array.from([1, 2, 3, 250]);
    const { fn, calls } = fakeFetch((url) => {
      if (url.includes("/contents/")) return { body: { type: "file", sha: "abc123", size: 4 } };
      if (url.includes("/git/blobs/abc123")) return { body: { encoding: "base64", content: toBase64(data) } };
    });
    const file = await readWorkbookFile(session, fn);
    expect(file).toEqual({ bytes: data, sha: "abc123", size: 4 });
    expect(calls[0]!.url).toBe("https://api.github.com/repos/acme/site/contents/data/oewer_database.xlsx?ref=main");
  });
  it("fails clearly when the path is not a file", async () => {
    const { fn } = fakeFetch(() => ({ body: [{ type: "file" }] }));
    await expect(readWorkbookFile(session, fn)).rejects.toMatchObject({ kind: "not_found" });
  });
});

describe("commitWorkbook", () => {
  it("sends the previous SHA, the branch and the new content", async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { content: { sha: "newsha" }, commit: { sha: "c1", html_url: "https://github.com/acme/site/commit/c1" } } }));
    const result = await commitWorkbook(session, Uint8Array.from([9, 8, 7]), "oldsha", "Edit cell", fn);
    expect(result).toEqual({ commitSha: "c1", commitUrl: "https://github.com/acme/site/commit/c1", fileSha: "newsha" });
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).toEqual({ message: "Edit cell", content: toBase64(Uint8Array.from([9, 8, 7])), sha: "oldsha", branch: "main" });
    expect(calls[0]!.init.method).toBe("PUT");
  });
  it("reports a conflict when the file changed meanwhile", async () => {
    const { fn } = fakeFetch(() => ({ status: 409, body: { message: "data/oewer_database.xlsx does not match abc" } }));
    await expect(commitWorkbook(session, new Uint8Array(1), "old", "m", fn)).rejects.toMatchObject({ kind: "conflict" });
  });
});
