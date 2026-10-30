import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { coerceValue, EditError, loadWorkbook, readCell, saveWorkbook, setCell } from "../lib/admin/edit";
import { checkWorkbook, schema } from "../lib/workbook";
import { buildSeedWorkbook } from "../scripts/create-seed-workbook";

let dir: string;
let bytes: Uint8Array;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "oewer-edit-"));
  const file = join(dir, "seed.xlsx");
  await buildSeedWorkbook(file);
  bytes = new Uint8Array(await readFile(file));
});
afterAll(() => rm(dir, { recursive: true, force: true }));

const check = (b: Uint8Array) => checkWorkbook(b as unknown as ArrayBuffer, b.byteLength);

describe("coerceValue", () => {
  const col = (type: string) => ({ name: "c", type });
  it("follows the column type", () => {
    expect(coerceValue(col("bool"), "Yes")).toBe(true);
    expect(coerceValue(col("bool"), "false")).toBe(false);
    expect(coerceValue(col("int"), " 12 ")).toBe(12);
    expect(coerceValue(col("string"), "  keep spaces ")).toBe("  keep spaces ");
  });
  it("rejects values of the wrong kind", () => {
    expect(() => coerceValue(col("bool"), "maybe")).toThrow(EditError);
    expect(() => coerceValue(col("int"), "1.5")).toThrow(EditError);
    expect(() => coerceValue(col("int"), "abc")).toThrow(EditError);
  });
});

describe("editing a cell and saving the workbook", () => {
  it("round-trips: the saved file is valid and has exactly the one change", async () => {
    const ref = { sheet: "tools", row: 2, column: "name" };
    const wb = await loadWorkbook(bytes);
    const before = readCell(wb, schema, ref);
    expect(setCell(wb, schema, ref, "Image Squeezer")).toBe(before);

    const saved = await saveWorkbook(wb);
    const reread = await loadWorkbook(saved);
    expect(readCell(reread, schema, ref)).toBe("Image Squeezer");
    expect(readCell(reread, schema, { sheet: "tools", row: 3, column: "name" })).toBe(readCell(wb, schema, { sheet: "tools", row: 3, column: "name" }));

    const result = await check(saved);
    expect(result.issues).toEqual([]);
    const original = await check(bytes);
    const changed = Object.entries(result.data).flatMap(([sheet, rows]) =>
      rows.flatMap((r, i) => Object.keys(r.values).filter((k) => r.values[k] !== original.data[sheet]![i]!.values[k]).map((k) => `${sheet}.${k}`)),
    );
    expect(changed).toEqual(["tools.name"]);
  });

  it("stores booleans and numbers as such, so they stay valid", async () => {
    const wb = await loadWorkbook(bytes);
    setCell(wb, schema, { sheet: "tools", row: 2, column: "featured" }, "false");
    setCell(wb, schema, { sheet: "tools", row: 2, column: "sort_order" }, "7");
    const result = await check(await saveWorkbook(wb));
    expect(result.issues).toEqual([]);
    expect(result.data.tools![0]!.values.featured).toBe(false);
    expect(result.data.tools![0]!.values.sort_order).toBe(7);
  });

  it("lets validation catch a bad edit before anything is saved", async () => {
    const wb = await loadWorkbook(bytes);
    setCell(wb, schema, { sheet: "tools", row: 2, column: "status" }, "live");
    const result = await check(await saveWorkbook(wb));
    expect(result.issues.some((i) => i.sheet === "tools" && i.column === "status")).toBe(true);
  });

  it("refuses cells that do not exist", async () => {
    const wb = await loadWorkbook(bytes);
    expect(() => setCell(wb, schema, { sheet: "nope", row: 2, column: "x" }, "v")).toThrow(EditError);
    expect(() => setCell(wb, schema, { sheet: "tools", row: 2, column: "nope" }, "v")).toThrow(EditError);
    expect(() => setCell(wb, schema, { sheet: "tools", row: 1, column: "name" }, "v")).toThrow(/Row must be/);
    expect(() => setCell(wb, schema, { sheet: "tools", row: 9999, column: "name" }, "v")).toThrow(/Row must be/);
  });
});
