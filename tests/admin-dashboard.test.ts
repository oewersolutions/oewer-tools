import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contentCounts, plainCounts } from "../lib/admin/dashboard";
import { checkWorkbook } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let data: WorkbookData;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-dash-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  const bytes = new Uint8Array(await readFile(file));
  data = (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length)).data!;
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("dashboard counts", () => {
  it("counts tools, articles and pages by status; every row is counted once", () => {
    const [tools, posts, pages] = contentCounts(data);
    expect([tools!.label, posts!.label, pages!.label]).toEqual(["Tools", "Articles", "Pages"]);
    expect(tools!.total).toBe(data.tools!.length);
    expect(posts!.total).toBe(data.posts!.length);
    for (const c of contentCounts(data)) expect(c.published + c.draft + c.archived).toBe(c.total);
    expect(tools!.published).toBe(data.tools!.filter((r) => r.values.status === "published").length);
  });
  it("copes with missing sheets", () => {
    expect(contentCounts({}).every((c) => c.total === 0)).toBe(true);
    expect(plainCounts({}).every((c) => c.total === 0)).toBe(true);
  });
  it("totals the sheets that have no status", () => {
    expect(plainCounts(data).find((c) => c.label === "Tags")!.total).toBe(data.tags!.length);
  });
});
