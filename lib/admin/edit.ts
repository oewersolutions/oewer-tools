import ExcelJS from "exceljs";
import type { ColumnDef, Schema } from "../workbook/types";

/** Browser-side workbook editing for the admin page. */

export class EditError extends Error {}

/** Turn what was typed into the value stored in the cell, following the column's type. */
export function coerceValue(column: ColumnDef, text: string): string | number | boolean {
  if (column.type === "bool") {
    const t = text.trim().toLowerCase();
    if (t === "true" || t === "yes") return true;
    if (t === "false" || t === "no") return false;
    throw new EditError(`${column.name} must be true or false.`);
  }
  if (column.type === "int" || column.type === "number") {
    const t = text.trim();
    if (t === "") return "";
    const n = Number(t);
    if (!Number.isFinite(n) || (column.type === "int" && !Number.isInteger(n))) throw new EditError(`${column.name} must be a ${column.type === "int" ? "whole " : ""}number.`);
    return n;
  }
  return text;
}

export async function loadWorkbook(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  return wb;
}

export async function saveWorkbook(wb: ExcelJS.Workbook): Promise<Uint8Array> {
  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

export interface CellRef {
  sheet: string;
  /** Row number as shown in Excel (row 1 is the header). */
  row: number;
  column: string;
}

function locate(wb: ExcelJS.Workbook, schema: Schema, ref: CellRef) {
  const def = schema.sheets[ref.sheet];
  const ws = wb.getWorksheet(ref.sheet);
  if (!def || !ws) throw new EditError(`There is no sheet called ${ref.sheet}.`);
  const column = def.columns.find((c) => c.name === ref.column);
  if (!column) throw new EditError(`${ref.sheet} has no column called ${ref.column}.`);
  if (!Number.isInteger(ref.row) || ref.row < 2 || ref.row > ws.rowCount) throw new EditError(`Row must be between 2 and ${ws.rowCount}.`);
  const header = ws.getRow(1);
  let columnNumber = 0;
  header.eachCell((cell, n) => {
    if (String(cell.value) === ref.column) columnNumber = n;
  });
  if (columnNumber === 0) throw new EditError(`The ${ref.column} column is missing from the header row.`);
  return { ws, column, cell: ws.getCell(ref.row, columnNumber) };
}

/** The text currently in a cell. */
export function readCell(wb: ExcelJS.Workbook, schema: Schema, ref: CellRef): string {
  const { cell } = locate(wb, schema, ref);
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().replace(/\.\d{3}Z$/, "Z");
  return typeof v === "object" ? "" : String(v);
}

/** Change one cell. Returns the previous text. */
export function setCell(wb: ExcelJS.Workbook, schema: Schema, ref: CellRef, text: string): string {
  const { column, cell } = locate(wb, schema, ref);
  const before = readCell(wb, schema, ref);
  cell.value = coerceValue(column, text);
  return before;
}
