import type { ColumnDef, SheetDef, WorkbookData } from "../workbook/types";

/** Helpers for showing a sheet as a table: searching, filtering, sorting and paging. Pure, so they are unit tested. */

export interface Row {
  /** The record ID (the sheet's primary key). */
  id: string;
  values: Record<string, unknown>;
}

export function cellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace(/\.\d{3}Z$/, "Z");
  return String(value);
}

export function toRows(data: WorkbookData, sheet: string, def: SheetDef): Row[] {
  return (data[sheet] ?? []).map((r) => ({ id: cellString(r.values[def.primary_key]), values: r.values }));
}

export interface Query {
  search: string;
  filterColumn: string;
  filterValue: string;
  sortColumn: string;
  sortDescending: boolean;
}

export const EMPTY_QUERY: Query = { search: "", filterColumn: "", filterValue: "", sortColumn: "", sortDescending: false };

/** Columns that make sense as a filter: a small set of values. */
export const filterableColumns = (def: SheetDef): ColumnDef[] => def.columns.filter((c) => c.type === "enum" || c.type === "bool" || c.type === "ref");

export function filterOptions(column: ColumnDef, rows: Row[], enums: Record<string, string[]>): string[] {
  if (column.type === "bool") return ["true", "false"];
  if (column.type === "enum") return enums[column.enum ?? ""] ?? [];
  return [...new Set(rows.map((r) => cellString(r.values[column.name])))].filter(Boolean).sort();
}

function compare(a: string, b: string): number {
  const x = Number(a);
  const y = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(x) && Number.isFinite(y)) return x - y;
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

export function queryRows(rows: Row[], def: SheetDef, q: Query): Row[] {
  const needle = q.search.trim().toLowerCase();
  let out = rows.filter((r) => {
    if (q.filterColumn && q.filterValue !== "" && cellString(r.values[q.filterColumn]) !== q.filterValue) return false;
    if (!needle) return true;
    return def.columns.some((c) => cellString(r.values[c.name]).toLowerCase().includes(needle));
  });
  if (q.sortColumn) {
    const column = q.sortColumn;
    out = [...out].sort((a, b) => compare(cellString(a.values[column]), cellString(b.values[column])) * (q.sortDescending ? -1 : 1));
  }
  return out;
}

export interface Page<T> {
  items: T[];
  /** 1-based, clamped to the available pages. */
  page: number;
  pages: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length };
}

/** The next free ID for a sheet whose IDs look like PREFIX0001, or "" when the sheet has no such pattern. */
export function nextId(def: SheetDef, existing: string[]): string {
  const match = /^\^([A-Z]+)\\d\{(\d+)\}\$$/.exec(def.id_pattern ?? "");
  if (!match) return "";
  const [, prefix, width] = match;
  const used = existing.map((id) => (id.startsWith(prefix!) ? Number(id.slice(prefix!.length)) : 0)).filter(Number.isFinite);
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(Number(width), "0")}`;
}

/** The IDs a "ref" column may point at, e.g. "tools.tool_id" -> the tool IDs. */
export function refOptions(column: ColumnDef, data: WorkbookData): string[] {
  const [sheet, key] = (column.ref ?? "").split(".");
  if (!sheet || !key) return [];
  return (data[sheet] ?? []).map((r) => cellString(r.values[key])).filter(Boolean);
}
