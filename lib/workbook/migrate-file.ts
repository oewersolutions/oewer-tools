import ExcelJS from "exceljs";
import { applyMigrations, parseVersion, planMigrations, type RawWorkbook } from "./migrate";

export type MigrateResult =
  | { status: "up_to_date"; version: string }
  | { status: "migrated"; from: string; to: string; steps: string[]; bytes: Uint8Array }
  | { status: "cannot"; message: string };

const cellText = (value: ExcelJS.CellValue): string | number | boolean => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace(/\.\d{3}Z$/, "Z");
  if (typeof value === "object") return "richText" in value ? value.richText.map((p) => p.text).join("") : "";
  return value;
};

/**
 * Bring a workbook file up to `target`: read it as it is (by header name, no schema checks), run the registered
 * migrations in order, and write only what changed (new header cells, new default values, the version) back into the
 * same file, so formatting and every other cell stay exactly as they were.
 */
export async function migrateWorkbook(input: Uint8Array, target: string): Promise<MigrateResult> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(input as unknown as ArrayBuffer);
  } catch {
    return { status: "cannot", message: "The file is not a readable .xlsx workbook." };
  }

  const raw: RawWorkbook = { sheets: {} };
  const rowNumbers: Record<string, number[]> = {};
  const originalHeaders: Record<string, string[]> = {};
  for (const ws of wb.worksheets) {
    const headers: string[] = [];
    const headerRow = ws.getRow(1);
    for (let c = 1; c <= ws.actualColumnCount; c++) headers.push(String(cellText(headerRow.getCell(c).value)));
    while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();
    const rows: Record<string, unknown>[] = [];
    rowNumbers[ws.name] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const values: Record<string, unknown> = {};
      let any = false;
      headers.forEach((h, i) => {
        const v = cellText(ws.getRow(r).getCell(i + 1).value);
        values[h] = v;
        if (v !== "") any = true;
      });
      if (any) {
        rows.push(values);
        rowNumbers[ws.name]!.push(r);
      }
    }
    raw.sheets[ws.name] = { headers, rows };
    originalHeaders[ws.name] = [...headers];
  }

  const current = String(raw.sheets.site_settings?.rows.find((r) => r.setting_key === "schema_version")?.setting_value ?? "");
  if (!parseVersion(current)) return { status: "cannot", message: `The workbook has no valid schema_version (found '${current}').` };
  if (current === target) return { status: "up_to_date", version: current };
  const chain = planMigrations(current, target);
  if (!chain) return { status: "cannot", message: `No migration path from ${current} to ${target}. Newer workbooks need newer site code; older ones need a migration to be written.` };

  const before = JSON.parse(JSON.stringify(raw)) as RawWorkbook;
  applyMigrations(raw, chain);

  for (const ws of wb.worksheets) {
    const after = raw.sheets[ws.name]!;
    const was = originalHeaders[ws.name]!;
    const headerRow = ws.getRow(1);
    after.headers.slice(was.length).forEach((h, i) => {
      const col = was.length + i + 1;
      const cell = headerRow.getCell(col);
      cell.value = h;
      if (was.length > 0) cell.style = { ...headerRow.getCell(was.length).style };
      const width = ws.getColumn(was.length || 1).width;
      if (width) ws.getColumn(col).width = Math.max(14, Math.min(width, 40));
    });
    after.rows.forEach((row, i) => {
      const r = rowNumbers[ws.name]![i]!;
      after.headers.forEach((h, c) => {
        const old = before.sheets[ws.name]!.rows[i]?.[h];
        if (row[h] !== old && !(row[h] === "" && old === undefined)) ws.getRow(r).getCell(c + 1).value = row[h] as ExcelJS.CellValue;
      });
    });
  }

  return { status: "migrated", from: current, to: target, steps: chain.map((m) => `${m.from} to ${m.to}: ${m.description}`), bytes: new Uint8Array(await wb.xlsx.writeBuffer()) };
}
