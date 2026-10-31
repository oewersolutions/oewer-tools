import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWorkbook, schema } from "../lib/workbook";
import { migrateWorkbook } from "../lib/workbook/migrate-file";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let current: Uint8Array;
/** The seed workbook made to look like one saved by the previous version: without the 1.0.2 columns. */
let old: Uint8Array;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-migrate-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  current = new Uint8Array(await readFile(file));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(current as unknown as ArrayBuffer);
  const find = (sheet: string, name: string) => wb.getWorksheet(sheet)!.getRow(1).values!.toString().split(",").indexOf(name);
  wb.getWorksheet("posts")!.spliceColumns(find("posts", "cover_image"), 2);
  wb.getWorksheet("post_blocks")!.spliceColumns(find("post_blocks", "caption"), 1);
  const settings = wb.getWorksheet("site_settings")!;
  settings.eachRow((row) => {
    if (row.getCell(1).value === "schema_version") row.getCell(2).value = "1.0.1";
  });
  // some formatting that has to survive
  wb.getWorksheet("posts")!.getRow(1).getCell(1).font = { bold: true, color: { argb: "FF174F49" } };
  old = new Uint8Array(await wb.xlsx.writeBuffer());
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe("migrateWorkbook", () => {
  it("the old-shaped workbook really is rejected by the current code", async () => {
    const r = await checkWorkbook(old as unknown as ArrayBuffer, old.length);
    expect(r.issues.some((i) => i.code === "header_mismatch")).toBe(true);
    expect(r.issues.some((i) => i.code === "schema_version_mismatch")).toBe(true);
  });

  it("brings it to the current version, valid, with the new columns empty", async () => {
    const result = await migrateWorkbook(old, schema.schema_version);
    expect(result.status).toBe("migrated");
    if (result.status !== "migrated") return;
    expect(result.from).toBe("1.0.1");
    expect(result.to).toBe(schema.schema_version);
    expect(result.steps).toHaveLength(1);
    const check = await checkWorkbook(result.bytes as unknown as ArrayBuffer, result.bytes.length);
    expect(check.issues).toEqual([]);
    expect(check.data.posts!.every((p) => p.values.cover_image === "" && p.values.cover_alt === "")).toBe(true);
    expect(check.data.post_blocks!.every((b) => b.values.caption === "")).toBe(true);
  });

  it("keeps every existing value and the formatting, changing only what the migration adds", async () => {
    const result = await migrateWorkbook(old, schema.schema_version);
    if (result.status !== "migrated") throw new Error("not migrated");
    const before = await checkWorkbook(current as unknown as ArrayBuffer, current.length);
    const after = await checkWorkbook(result.bytes as unknown as ArrayBuffer, result.bytes.length);
    const strip = (rows: { values: Record<string, unknown> }[], drop: string[]) => rows.map((r) => Object.fromEntries(Object.entries(r.values).filter(([k]) => !drop.includes(k))));
    for (const sheet of Object.keys(before.data)) {
      const drop = ["cover_image", "cover_alt", "caption"];
      expect(strip(after.data[sheet]!, drop), sheet).toEqual(strip(before.data[sheet]!, drop));
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.bytes as unknown as ArrayBuffer);
    expect(wb.getWorksheet("posts")!.getRow(1).getCell(1).font?.bold).toBe(true);
  });

  it("does nothing to a workbook that is already current", async () => {
    expect(await migrateWorkbook(current, schema.schema_version)).toEqual({ status: "up_to_date", version: schema.schema_version });
  });

  it("refuses when there is no path, and for files that are not workbooks", async () => {
    const result = await migrateWorkbook(old, "9.9.9");
    expect(result).toMatchObject({ status: "cannot" });
    expect(await migrateWorkbook(new TextEncoder().encode("nope"), schema.schema_version)).toMatchObject({ status: "cannot" });
  });
});
