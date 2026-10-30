import { describe, expect, it } from "vitest";
import { planImport, parseCsv, sheetToCsv, toCsv } from "../lib/admin/csv";
import { EMPTY_QUERY, filterOptions, filterableColumns, nextId, paginate, queryRows, refOptions, toRows } from "../lib/admin/table";
import { schema } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";

const def = schema.sheets.tools!;
const row = (n: number, over: Record<string, unknown> = {}) => ({
  row: n + 1,
  values: { tool_id: `TOOL000${n}`, category_id: "TCAT0001", name: `Tool ${n}`, slug: `tool-${n}`, description: "d", component_key: "k", status: n % 2 ? "published" : "draft", featured: n === 1, sort_order: n, ...over },
});
const data: WorkbookData = { tools: [row(1), row(2), row(3), row(4)], tool_categories: [{ row: 2, values: { category_id: "TCAT0001" } }, { row: 3, values: { category_id: "TCAT0002" } }] };
const rows = toRows(data, "tools", def);

describe("queryRows", () => {
  it("returns everything for an empty query, in sheet order", () => {
    expect(queryRows(rows, def, EMPTY_QUERY).map((r) => r.id)).toEqual(["TOOL0001", "TOOL0002", "TOOL0003", "TOOL0004"]);
  });
  it("searches every column, ignoring case", () => {
    expect(queryRows(rows, def, { ...EMPTY_QUERY, search: "TOOL 3" }).map((r) => r.id)).toEqual(["TOOL0003"]);
    expect(queryRows(rows, def, { ...EMPTY_QUERY, search: "published" }).map((r) => r.id)).toEqual(["TOOL0001", "TOOL0003"]);
    expect(queryRows(rows, def, { ...EMPTY_QUERY, search: "zzz" })).toEqual([]);
  });
  it("filters by a column value, including booleans", () => {
    expect(queryRows(rows, def, { ...EMPTY_QUERY, filterColumn: "status", filterValue: "draft" }).map((r) => r.id)).toEqual(["TOOL0002", "TOOL0004"]);
    expect(queryRows(rows, def, { ...EMPTY_QUERY, filterColumn: "featured", filterValue: "true" }).map((r) => r.id)).toEqual(["TOOL0001"]);
  });
  it("combines search and filter, and sorts numbers as numbers", () => {
    expect(queryRows(rows, def, { ...EMPTY_QUERY, search: "tool", filterColumn: "status", filterValue: "draft" })).toHaveLength(2);
    const q = { ...EMPTY_QUERY, sortColumn: "sort_order", sortDescending: true };
    expect(queryRows([...rows, ...toRows({ tools: [row(10)] }, "tools", def)], def, q).map((r) => r.id)[0]).toBe("TOOL00010");
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 53 }, (_, i) => i);
  it("slices pages and counts them", () => {
    expect(paginate(items, 1, 25)).toMatchObject({ page: 1, pages: 3, total: 53 });
    expect(paginate(items, 3, 25).items).toHaveLength(3);
  });
  it("clamps an out-of-range page and handles no rows", () => {
    expect(paginate(items, 99, 25).page).toBe(3);
    expect(paginate(items, -4, 25).page).toBe(1);
    expect(paginate([], 1, 25)).toEqual({ items: [], page: 1, pages: 1, total: 0 });
  });
});

describe("ids, filters and references", () => {
  it("suggests the next free ID from the sheet's pattern", () => {
    expect(nextId(def, ["TOOL0001", "TOOL0007", "TOOL0003"])).toBe("TOOL0008");
    expect(nextId(def, [])).toBe("TOOL0001");
    expect(nextId(schema.sheets.post_blocks!, ["BLK00009"])).toBe("BLK00010");
    expect(nextId(schema.sheets.site_settings!, ["a"])).toBe(""); // keyed by name, not a numbered ID
  });
  it("offers filters for enum, bool and ref columns", () => {
    expect(filterableColumns(def).map((c) => c.name)).toEqual(["category_id", "status", "featured"]);
    const status = def.columns.find((c) => c.name === "status")!;
    expect(filterOptions(status, rows, schema.enums)).toEqual(["draft", "published", "archived"]);
  });
  it("lists the IDs a reference column can point at", () => {
    expect(refOptions(def.columns.find((c) => c.name === "category_id")!, data)).toEqual(["TCAT0001", "TCAT0002"]);
  });
});

describe("CSV", () => {
  it("round-trips quotes, commas, line breaks and a BOM", () => {
    const table = [["a", "b,c", 'say "hi"', "two\nlines", ""]];
    expect(parseCsv("﻿" + toCsv(table))).toEqual(table);
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("exports a sheet with its header", () => {
    const csv = sheetToCsv(def, rows.slice(0, 1));
    expect(csv.split("\r\n")[0]).toBe(def.columns.map((c) => c.name).join(","));
    expect(csv).toContain("TOOL0001,TCAT0001,Tool 1");
  });
});

describe("planImport", () => {
  const header = "tool_id,name,status";
  it("updates changed cells, adds new IDs, and leaves the rest", () => {
    const p = planImport("tools", def, `${header}\nTOOL0001,Renamed,published\nTOOL0002,Tool 2,draft\nTOOL0009,Brand new,draft`, rows);
    expect(p.errors).toEqual([]);
    expect(p).toMatchObject({ added: 1, updated: 1, unchanged: 1 });
    expect(p.changes[0]).toEqual({ type: "set", sheet: "tools", pk: "TOOL0001", column: "name", before: "Tool 1", after: "Renamed" });
    expect(p.changes[1]).toMatchObject({ type: "add", values: { tool_id: "TOOL0009", name: "Brand new" } });
    expect(p.changes).toHaveLength(2); // TOOL0003 and TOOL0004 are not in the file, and are not deleted
  });
  it("reports unusable files without producing changes", () => {
    expect(planImport("tools", def, "", rows).errors).toEqual(["The file is empty."]);
    expect(planImport("tools", def, "name\nx", rows).errors[0]).toMatch(/needs a tool_id column/);
    expect(planImport("tools", def, "tool_id,bogus\nT,1", rows).errors[0]).toMatch(/Unknown column: bogus/);
    expect(planImport("tools", def, "tool_id,tool_id\nT,1", rows).errors.join(" ")).toMatch(/appears twice/);
  });
  it("reports bad lines but keeps going", () => {
    const p = planImport("tools", def, `${header}\nTOOL0001,Only two\n,No id,draft\nTOOL0002,A,draft\nTOOL0002,B,draft`, rows);
    expect(p.errors).toEqual(["Line 2 has 2 values but the header has 3.", "Line 3 has no tool_id.", "Line 5: TOOL0002 appears more than once in the file."]);
  });
});
