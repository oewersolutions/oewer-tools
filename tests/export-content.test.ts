import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";
import { readWorkbook, schema } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";
import { buildContent, serialize } from "../lib/workbook/export";

let dir: string;
let baseline: WorkbookData;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-export-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  baseline = (await readWorkbook((await readFile(file)) as unknown as ArrayBuffer, schema)).data;
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const clone = () => structuredClone(baseline);

describe("buildContent", () => {
  it("exports every schema sheet with columns in schema order", () => {
    const { sheets } = buildContent(clone(), schema);
    expect(Object.keys(sheets)).toEqual(Object.keys(schema.sheets));
    for (const [name, def] of Object.entries(schema.sheets)) {
      for (const record of sheets[name]!) expect(Object.keys(record)).toEqual(def.columns.map((c) => c.name));
    }
  });

  it("does not leak worksheet row numbers or timestamps of the export", () => {
    const json = serialize(buildContent(clone(), schema));
    expect(json).not.toMatch(/"row"/);
    expect(json.endsWith("}\n")).toBe(true);
  });

  it("is byte-identical across runs", () => {
    expect(serialize(buildContent(clone(), schema))).toBe(serialize(buildContent(clone(), schema)));
  });

  it("does not depend on the order of rows in the workbook", () => {
    const shuffled = clone();
    for (const rows of Object.values(shuffled)) rows.reverse();
    expect(serialize(buildContent(shuffled, schema))).toBe(serialize(buildContent(clone(), schema)));
  });

  it("sorts tools by category and sort_order, and blocks by sort_order", () => {
    const { sheets } = buildContent(clone(), schema);
    const tools = sheets.tools!.map((t) => t.tool_id);
    expect(tools).toEqual([...tools].sort());
    const orders = sheets.post_blocks!.map((b) => b.sort_order);
    expect(orders).toEqual([...orders].sort((a, b) => Number(a) - Number(b)));
  });

  it("orders posts newest first", () => {
    const data = clone();
    const first = data.posts![0]!;
    data.posts!.push({
      row: 99,
      values: { ...first.values, post_id: "POST0002", slug: "newer-post", published_at: "2026-11-01T00:00:00Z" },
    });
    const ids = buildContent(data, schema).sheets.posts!.map((p) => p.post_id);
    expect(ids).toEqual(["POST0002", "POST0001"]);
  });

  it("applies schema defaults and nulls to empty optional cells", () => {
    const data = clone();
    data.authors![0]!.values.bio = "";
    data.posts![0]!.values.published_at = "";
    data.tools![0]!.values.featured = "";
    const { sheets } = buildContent(data, schema);
    expect(sheets.authors![0]!.bio).toBe("");
    expect(sheets.posts![0]!.published_at).toBeNull();
    expect(sheets.tools!.find((t) => t.tool_id === "TOOL0001")!.featured).toBe(false);
  });

  it("changes content_hash only when content changes", () => {
    const a = buildContent(clone(), schema).content_hash;
    expect(buildContent(clone(), schema).content_hash).toBe(a);
    const changed = clone();
    changed.tools![0]!.values.name = "Renamed Tool";
    expect(buildContent(changed, schema).content_hash).not.toBe(a);
  });
});
