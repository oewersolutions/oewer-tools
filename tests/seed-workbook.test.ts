import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

interface Schema {
  sheets: Record<string, { primary_key: string; id_pattern?: string; columns: { name: string }[] }>;
}
const schema = JSON.parse(
  readFileSync(new URL("../schemas/workbook_schema.json", import.meta.url), "utf-8"),
) as Schema;

let dir: string;
let wb: ExcelJS.Workbook;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-seed-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("seed workbook", () => {
  it("has exactly the schema's sheets, in order", () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(Object.keys(schema.sheets));
  });

  it("has headers that match the schema columns", () => {
    for (const [name, def] of Object.entries(schema.sheets)) {
      const header = (wb.getWorksheet(name)!.getRow(1).values as unknown[]).slice(1);
      expect(header, name).toEqual(def.columns.map((c) => c.name));
    }
  });

  it("has unique primary keys that match the id pattern", () => {
    for (const [name, def] of Object.entries(schema.sheets)) {
      const col = def.columns.findIndex((c) => c.name === def.primary_key) + 1;
      const ids: string[] = [];
      wb.getWorksheet(name)!.eachRow((row, n) => {
        if (n > 1) ids.push(String(row.getCell(col).value));
      });
      expect(ids.length, `${name} has rows`).toBeGreaterThan(0);
      expect(new Set(ids).size, `${name} unique`).toBe(ids.length);
      if (def.id_pattern) for (const id of ids) expect(id).toMatch(new RegExp(def.id_pattern));
    }
  });
});
