import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { explainFailure, failedSteps, listDeployRuns, runState } from "../lib/admin/actions";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { planPost, readPost } from "../lib/admin/forms";
import type { GithubSession } from "../lib/admin/github";
import { hasLiveChanges, liveChanges } from "../lib/admin/live";
import { checkWorkbook, schema } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

const session: GithubSession = { owner: "acme", repo: "site", branch: "main", path: "data/oewer_database.xlsx", token: "github_pat_TEST" };

function fakeFetch(handler: (url: string) => { status?: number; body?: unknown } | undefined) {
  const calls: string[] = [];
  const fn = (async (url: string | URL) => {
    calls.push(String(url));
    const r = handler(String(url)) ?? { status: 404, body: { message: "Not Found" } };
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { fn, calls };
}

describe("runState", () => {
  it("turns GitHub's status and conclusion into one plain state", () => {
    expect(runState("queued", null)).toBe("waiting");
    expect(runState("waiting", null)).toBe("waiting");
    expect(runState("in_progress", null)).toBe("building");
    expect(runState("completed", "success")).toBe("live");
    expect(runState("completed", "failure")).toBe("failed");
    expect(runState("completed", "timed_out")).toBe("failed");
    expect(runState("completed", "cancelled")).toBe("cancelled");
  });
});

describe("listDeployRuns", () => {
  const raw = (id: number, status: string, conclusion: string | null, sha = "abc") => ({ id, head_sha: sha, display_title: `Commit ${id}`, status, conclusion, html_url: `https://github.com/acme/site/actions/runs/${id}`, created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T10:01:00Z" });

  it("asks for the deploy workflow on the branch and maps the runs", async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { workflow_runs: [raw(2, "in_progress", null), raw(1, "completed", "success")] } }));
    const runs = await listDeployRuns(session, {}, fn);
    expect(calls[0]).toBe("https://api.github.com/repos/acme/site/actions/workflows/deploy.yml/runs?branch=main&per_page=5");
    expect(runs.map((r) => [r.id, r.state, r.title])).toEqual([[2, "building", "Commit 2"], [1, "live", "Commit 1"]]);
  });
  it("can ask for one commit", async () => {
    const { fn, calls } = fakeFetch(() => ({ body: { workflow_runs: [] } }));
    expect(await listDeployRuns(session, { sha: "deadbeef", limit: 1 }, fn)).toEqual([]);
    expect(calls[0]).toContain("head_sha=deadbeef");
    expect(calls[0]).toContain("per_page=1");
  });
  it("explains a token without Actions access instead of showing a raw error", async () => {
    for (const status of [403, 404]) {
      const { fn } = fakeFetch(() => ({ status, body: { message: "Resource not accessible by personal access token" } }));
      await expect(listDeployRuns(session, {}, fn)).rejects.toMatchObject({ kind: "forbidden", message: expect.stringContaining("Actions: Read") });
    }
  });
});

describe("failedSteps and explainFailure", () => {
  it("lists the steps that failed", async () => {
    const jobs = [{ name: "build", conclusion: "failure", steps: [{ name: "Checkout", conclusion: "success" }, { name: "Validate workbook", conclusion: "failure" }, { name: "Build static site", conclusion: "skipped" }] }, { name: "deploy", conclusion: "skipped", steps: [] }];
    const { fn } = fakeFetch(() => ({ body: { jobs } }));
    expect(await failedSteps(session, 7, fn)).toEqual(["Validate workbook"]);
  });
  it("falls back to the failed job when no step is named", async () => {
    const { fn } = fakeFetch(() => ({ body: { jobs: [{ name: "deploy", conclusion: "failure" }] } }));
    expect(await failedSteps(session, 7, fn)).toEqual(["deploy"]);
  });
  it("says in plain words what each kind of failure means for the live site", () => {
    expect(explainFailure(["Validate workbook"])).toMatch(/did not pass validation/);
    expect(explainFailure(["Build static site"])).toMatch(/live site was left as it was/);
    expect(explainFailure(["Run actions/deploy-pages@v4"])).toMatch(/Pages/);
    expect(explainFailure(["Something else"])).toMatch(/live site was left as it was/);
  });
});

describe("liveChanges", () => {
  let dir: string;
  let seed: Uint8Array;
  let before: WorkbookData;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "oewer-live-"));
    const file = join(dir, "seed.xlsx");
    await buildSeedWorkbook(file);
    seed = new Uint8Array(await readFile(file));
    before = (await checkWorkbook(seed as unknown as ArrayBuffer, seed.length)).data;
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  async function after(changes: Change[]): Promise<WorkbookData> {
    const wb = await loadWorkbook(seed);
    applyChanges(wb, schema, changes);
    const bytes = await saveWorkbook(wb);
    return (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length)).data;
  }
  const set = (sheet: string, pk: string, column: string, b: string, a: string): Change => ({ type: "set", sheet, pk, column, before: b, after: a });

  it("reports nothing when nothing visible changes", () => {
    expect(hasLiveChanges(liveChanges(before, before))).toBe(false);
  });
  it("says which items disappear when a tool becomes a draft, and which appear when it returns", async () => {
    const hidden = await after([set("tools", "TOOL0010", "status", "published", "draft")]);
    expect(liveChanges(before, hidden)).toEqual({ appear: [], disappear: ["tool “Word Counter”"], edited: [] });
    expect(liveChanges(hidden, before).appear).toEqual(["tool “Word Counter”"]);
  });
  it("reports an edited article, including a change to just one of its blocks", async () => {
    const form = readPost(before, "POST0001");
    form.blocks[0] = { ...form.blocks[0]!, content: "A reworded opening." };
    const next = await after(planPost(before, form).changes);
    expect(liveChanges(before, next)).toEqual({ appear: [], disappear: [], edited: ["article “How EMI Is Calculated”"] });
  });
  it("reports a new published article as appearing, and a deleted one as disappearing", async () => {
    const form = { ...readPost(before, ""), title: "Brand new", slug: "brand-new", category_id: "BCAT0001", author_id: "AUTH0001", status: "published", blocks: [{ block_id: "", block_type: "paragraph", content: "Hello.", asset_path: "" }] };
    const added = await after(planPost(before, form).changes);
    expect(liveChanges(before, added).appear).toEqual(["article “Brand new”"]);
    expect(liveChanges(added, before).disappear).toEqual(["article “Brand new”"]);
  });
  it("ignores edits to items that are not on the site", async () => {
    const draftBefore = await after([set("tools", "TOOL0010", "status", "published", "draft")]);
    const draftEdited = await (async () => {
      const wb = await loadWorkbook(seed);
      applyChanges(wb, schema, [set("tools", "TOOL0010", "status", "published", "draft"), set("tools", "TOOL0010", "description", "Count words, characters, sentences and reading time as you type.", "A new description")]);
      const bytes = await saveWorkbook(wb);
      return (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length)).data;
    })();
    expect(hasLiveChanges(liveChanges(draftBefore, draftEdited))).toBe(false);
  });
});
