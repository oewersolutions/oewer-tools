import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyChanges } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { toBase64, type GithubSession } from "../lib/admin/github";
import { listHistory, restoreMessage, restoreVersion } from "../lib/admin/history";
import { schema } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

const session: GithubSession = { owner: "acme", repo: "site", branch: "main", path: "data/oewer_database.xlsx", token: "github_pat_TEST" };
const OLD = "1".repeat(40);
const NEW = "2".repeat(40);

let dir: string;
let seed: Uint8Array;
let changed: Uint8Array;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-history-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  seed = new Uint8Array(await readFile(file));
  const wb = await loadWorkbook(seed);
  applyChanges(wb, schema, [{ type: "add", sheet: "tags", values: { tag_id: "TAG9001", name: "History test", slug: "history-test" } }]);
  changed = await saveWorkbook(wb);
});
afterAll(() => rm(dir, { recursive: true, force: true }));

function fakeFetch(handler: (url: string, init: RequestInit) => { status?: number; body?: unknown } | undefined) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const r = handler(String(url), init) ?? { status: 404, body: { message: "Not Found" } };
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { fn, calls };
}

describe("listHistory", () => {
  it("asks for commits that changed the workbook on the branch and maps them", async () => {
    const { fn, calls } = fakeFetch(() => ({
      body: [
        { sha: NEW, html_url: "u2", commit: { message: "Admin: update 2 records\n\nbody", author: { name: "A", date: "2026-10-30T10:00:00Z" } }, author: { login: "anand" } },
        { sha: OLD, html_url: "u1", commit: { message: "First", author: { name: "Bot", date: "2026-10-29T10:00:00Z" } }, author: null },
      ],
    }));
    const entries = await listHistory(session, 10, fn);
    expect(calls[0]!.url).toBe("https://api.github.com/repos/acme/site/commits?sha=main&path=data%2Foewer_database.xlsx&per_page=10");
    expect(entries.map((e) => [e.sha, e.title, e.author])).toEqual([[NEW, "Admin: update 2 records", "anand"], [OLD, "First", "Bot"]]);
  });
});

describe("restoreVersion", () => {
  const entry = { sha: OLD, title: "First", author: "x", date: "", url: "" };
  const handler = (bytes: Uint8Array, fileSha: string) => (url: string, init: RequestInit) => {
    if (url.includes(`/contents/`) && (init.method ?? "GET") === "GET") {
      expect(url).toContain(`ref=${OLD}`);
      return { body: { type: "file", sha: fileSha, size: bytes.length } };
    }
    if (url.includes("/git/blobs/")) return { body: { encoding: "base64", content: toBase64(bytes) } };
    if (init.method === "PUT") return { body: { content: { sha: "f".repeat(40) }, commit: { sha: "c".repeat(40), html_url: "cu" } } };
    return undefined;
  };

  it("commits the old bytes as a new version on top of the current one", async () => {
    const { fn, calls } = fakeFetch(handler(seed, "a".repeat(40)));
    const result = await restoreVersion(session, entry, { bytes: changed, sha: "b".repeat(40), size: changed.length }, fn);
    expect(result.status).toBe("restored");
    const put = calls.find((c) => c.init.method === "PUT")!;
    const body = JSON.parse(String(put.init.body));
    expect(body.sha).toBe("b".repeat(40));
    expect(body.message).toBe(restoreMessage(entry));
    expect(body.message).toMatch(/^Restore workbook to version 1111111: First$/);
    expect(body.content).toBe(toBase64(seed));
  });

  it("does nothing when the old version is already the current one", async () => {
    const { fn, calls } = fakeFetch(handler(seed, "a".repeat(40)));
    expect((await restoreVersion(session, entry, { bytes: seed, sha: "a".repeat(40), size: seed.length }, fn)).status).toBe("unchanged");
    expect(calls.some((c) => c.init.method === "PUT")).toBe(false);
  });

  it("refuses an old version that is not a valid workbook today", async () => {
    const { fn, calls } = fakeFetch(handler(new TextEncoder().encode("not a workbook"), "a".repeat(40)));
    const result = await restoreVersion(session, entry, { bytes: seed, sha: "b".repeat(40), size: seed.length }, fn);
    expect(result.status).toBe("invalid");
    expect(calls.some((c) => c.init.method === "PUT")).toBe(false);
  });

  it("reports a conflict if the workbook moved on while restoring", async () => {
    const base = handler(seed, "a".repeat(40));
    const { fn } = fakeFetch((url, init) => (init.method === "PUT" ? { status: 409, body: { message: "does not match" } } : base(url, init)));
    await expect(restoreVersion(session, entry, { bytes: changed, sha: "b".repeat(40), size: changed.length }, fn)).rejects.toMatchObject({ kind: "conflict" });
  });
});
