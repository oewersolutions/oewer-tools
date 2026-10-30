import type { Change } from "./changes";
import { cellString, type Row } from "./table";
import type { SheetDef } from "../workbook/types";

/** CSV export and import for one sheet. */

export const MAX_IMPORT_ROWS = 2000;

/** RFC 4180: quoted fields, doubled quotes, CRLF or LF line ends, an optional byte order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f !== ""));
}

const quote = (f: string) => (/[",\r\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f);

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}

export function sheetToCsv(def: SheetDef, rows: Row[]): string {
  return toCsv([def.columns.map((c) => c.name), ...rows.map((r) => def.columns.map((c) => cellString(r.values[c.name])))]);
}

export interface ImportPlan {
  changes: Change[];
  added: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

/**
 * Turn a CSV into changes for one sheet. Rows whose ID exists become updates of the cells that differ; rows with a new
 * ID are added. Rows missing from the file are left alone: an import never deletes.
 */
export function planImport(sheet: string, def: SheetDef, csv: string, existing: Row[]): ImportPlan {
  const plan: ImportPlan = { changes: [], added: 0, updated: 0, unchanged: 0, errors: [] };
  const table = parseCsv(csv);
  if (table.length === 0) return { ...plan, errors: ["The file is empty."] };

  const header = table[0]!.map((h) => h.trim());
  const known = new Set(def.columns.map((c) => c.name));
  const unknown = header.filter((h) => !known.has(h));
  if (unknown.length > 0) plan.errors.push(`Unknown column${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}. The columns of ${sheet} are ${def.columns.map((c) => c.name).join(", ")}.`);
  if (new Set(header).size !== header.length) plan.errors.push("A column name appears twice in the first row.");
  const pkIndex = header.indexOf(def.primary_key);
  if (pkIndex === -1) plan.errors.push(`The file needs a ${def.primary_key} column to say which record each row is.`);
  if (table.length - 1 > MAX_IMPORT_ROWS) plan.errors.push(`The file has ${table.length - 1} rows; the limit is ${MAX_IMPORT_ROWS}.`);
  if (plan.errors.length > 0) return plan;

  const byId = new Map(existing.map((r) => [r.id, r]));
  const seen = new Set<string>();
  table.slice(1).forEach((cells, n) => {
    const line = n + 2;
    if (cells.length !== header.length) return void plan.errors.push(`Line ${line} has ${cells.length} values but the header has ${header.length}.`);
    const id = (cells[pkIndex] ?? "").trim();
    if (id === "") return void plan.errors.push(`Line ${line} has no ${def.primary_key}.`);
    if (seen.has(id)) return void plan.errors.push(`Line ${line}: ${id} appears more than once in the file.`);
    seen.add(id);

    const values = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    const current = byId.get(id);
    if (!current) {
      plan.changes.push({ type: "add", sheet, values });
      plan.added++;
      return;
    }
    let changed = false;
    for (const column of header) {
      if (column === def.primary_key) continue;
      const before = cellString(current.values[column]);
      if (before !== values[column]) {
        plan.changes.push({ type: "set", sheet, pk: id, column, before, after: values[column]! });
        changed = true;
      }
    }
    if (changed) plan.updated++;
    else plan.unchanged++;
  });
  return plan;
}
