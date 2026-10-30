import type ExcelJS from "exceljs";
import { coerceValue, EditError } from "./edit";
import type { Schema, SheetDef } from "../workbook/types";

/**
 * Changes to the workbook, described by record ID (the sheet's primary key) rather than row number, so they still
 * make sense after someone else adds or removes rows. Applying a change to a newer version of the workbook either
 * works, is already done, or is reported as a conflict.
 */
export type Change =
  | { type: "set"; sheet: string; pk: string; column: string; /** what the person saw */ before: string; after: string }
  | { type: "add"; sheet: string; values: Record<string, string> }
  | { type: "delete"; sheet: string; pk: string };

export type ConflictKind = "changed" | "row_missing" | "id_taken";

export interface Conflict {
  /** Position of the change in the list that was applied. */
  index: number;
  change: Change;
  kind: ConflictKind;
  /** The value now in the workbook, when that is what conflicts. */
  theirs?: string;
}

export interface ApplyResult {
  conflicts: Conflict[];
  /** Changes that were already in place and needed nothing. */
  alreadyDone: number[];
}

export function describeChange(change: Change): string {
  switch (change.type) {
    case "set":
      return `${change.sheet} ${change.pk}, ${change.column}: ${show(change.before)} → ${show(change.after)}`;
    case "add":
      return `${change.sheet}: add a row${change.values[firstKey(change.values)] ? ` (${change.values[firstKey(change.values)]})` : ""}`;
    case "delete":
      return `${change.sheet} ${change.pk}: delete the row`;
  }
}

const show = (v: string) => (v === "" ? "(empty)" : v.length > 40 ? `${v.slice(0, 40)}…` : v);
const firstKey = (o: Record<string, string>) => Object.keys(o)[0] ?? "";

function sheetOf(wb: ExcelJS.Workbook, schema: Schema, name: string): { ws: ExcelJS.Worksheet; def: SheetDef } {
  const def = schema.sheets[name];
  const ws = wb.getWorksheet(name);
  if (!def || !ws) throw new EditError(`There is no sheet called ${name}.`);
  return { ws, def };
}

function columnNumbers(ws: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  ws.getRow(1).eachCell((cell, n) => map.set(String(cell.value), n));
  return map;
}

const cellText = (cell: ExcelJS.Cell): string => {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().replace(/\.\d{3}Z$/, "Z");
  return typeof v === "object" ? "" : String(v);
};

/** Row number of the record with this ID, or 0. */
export function findRecord(wb: ExcelJS.Workbook, schema: Schema, sheet: string, pk: string): number {
  const { ws, def } = sheetOf(wb, schema, sheet);
  const pkColumn = columnNumbers(ws).get(def.primary_key);
  if (!pkColumn) throw new EditError(`${sheet} has no ${def.primary_key} column.`);
  for (let r = 2; r <= ws.rowCount; r++) if (cellText(ws.getCell(r, pkColumn)) === pk) return r;
  return 0;
}

/** The record ID in a given row, or "" when the row is empty. */
export function recordIdAt(wb: ExcelJS.Workbook, schema: Schema, sheet: string, row: number): string {
  const { ws, def } = sheetOf(wb, schema, sheet);
  if (!Number.isInteger(row) || row < 2 || row > ws.rowCount) throw new EditError(`Row must be between 2 and ${ws.rowCount}.`);
  const pkColumn = columnNumbers(ws).get(def.primary_key);
  return pkColumn ? cellText(ws.getCell(row, pkColumn)) : "";
}

/**
 * Apply changes in order. Conflicts are collected, not thrown, and the changes that conflict are left out.
 * `force` lists the change indexes whose conflict the person chose to override with their own version.
 */
export function applyChanges(wb: ExcelJS.Workbook, schema: Schema, changes: Change[], force: ReadonlySet<number> = new Set()): ApplyResult {
  const result: ApplyResult = { conflicts: [], alreadyDone: [] };

  changes.forEach((change, index) => {
    const { ws, def } = sheetOf(wb, schema, change.sheet);
    const columns = columnNumbers(ws);

    if (change.type === "set") {
      const column = def.columns.find((c) => c.name === change.column);
      const columnNumber = columns.get(change.column);
      if (!column || !columnNumber) throw new EditError(`${change.sheet} has no column called ${change.column}.`);
      const row = findRecord(wb, schema, change.sheet, change.pk);
      if (row === 0) return void result.conflicts.push({ index, change, kind: "row_missing" });
      const cell = ws.getCell(row, columnNumber);
      const current = cellText(cell);
      if (current === change.after) return void result.alreadyDone.push(index);
      if (current !== change.before && !force.has(index)) return void result.conflicts.push({ index, change, kind: "changed", theirs: current });
      cell.value = coerceValue(column, change.after);
      return;
    }

    if (change.type === "add") {
      const pk = change.values[def.primary_key] ?? "";
      if (pk !== "" && findRecord(wb, schema, change.sheet, pk) !== 0) {
        if (force.has(index)) return;
        return void result.conflicts.push({ index, change, kind: "id_taken" });
      }
      const row = ws.getRow(ws.rowCount + 1);
      for (const column of def.columns) {
        const n = columns.get(column.name);
        const text = change.values[column.name];
        if (n && text !== undefined && text !== "") row.getCell(n).value = coerceValue(column, text);
      }
      row.commit();
      return;
    }

    const row = findRecord(wb, schema, change.sheet, change.pk);
    if (row === 0) return void result.alreadyDone.push(index);
    ws.spliceRows(row, 1);
  });

  return result;
}

/** Add a "set" to a list of pending changes, merging with an earlier change to the same cell. */
export function queueSet(pending: Change[], next: Extract<Change, { type: "set" }>): Change[] {
  const i = pending.findIndex((c) => c.type === "set" && c.sheet === next.sheet && c.pk === next.pk && c.column === next.column);
  if (i === -1) return next.before === next.after ? pending : [...pending, next];
  const earlier = pending[i] as Extract<Change, { type: "set" }>;
  const merged = { ...next, before: earlier.before }; // the person first saw the older value
  const rest = pending.filter((_, n) => n !== i);
  return merged.before === merged.after ? rest : [...rest.slice(0, i), merged, ...rest.slice(i)];
}

/** One-line commit message for a list of changes. */
export function commitMessageFor(changes: Change[]): string {
  if (changes.length === 0) return "Admin: no changes";
  const first = changes[0]!;
  const what =
    first.type === "set" ? `update ${first.sheet} ${first.pk} ${first.column}` : first.type === "add" ? `add a row to ${first.sheet}` : `delete ${first.sheet} ${first.pk}`;
  return changes.length === 1 ? `Admin: ${what}` : `Admin: ${what} and ${changes.length - 1} more change${changes.length === 2 ? "" : "s"}`;
}
