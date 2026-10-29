import ExcelJS from "exceljs";
import type { Issue, Schema, SheetRow, WorkbookData } from "./types";

export interface ReadResult {
  data: WorkbookData;
  /** Structural problems found while reading (formulas, links, headers, hidden sheets...). */
  issues: Issue[];
}

type Loadable = Parameters<ExcelJS.Xlsx["load"]>[0];

/** Convert an ExcelJS cell value to a literal. Returns `undefined` for unsupported (formula/link/error) values. */
function literal(value: ExcelJS.CellValue): { value: unknown; problem?: string } {
  if (value === null || value === undefined) return { value: "" };
  if (value instanceof Date) return { value: value.toISOString().replace(/\.\d{3}Z$/, "Z") };
  if (typeof value !== "object") return { value };
  if ("formula" in value || "sharedFormula" in value) return { value: "", problem: "formula" };
  if ("hyperlink" in value) return { value: "", problem: "hyperlink" };
  if ("error" in value) return { value: "", problem: "error" };
  if ("richText" in value) return { value: value.richText.map((part) => part.text).join("") };
  return { value: "", problem: "unsupported" };
}

const PROBLEM_MESSAGES: Record<string, string> = {
  formula: "Formulas are not allowed; enter literal values only.",
  hyperlink: "Hyperlink cells are not allowed; enter the URL as plain text.",
  error: "Cell contains an Excel error value.",
  unsupported: "Unsupported cell content.",
};

/** Read a workbook buffer into plain row objects, reporting structural problems against the schema. */
export async function readWorkbook(buffer: Loadable, schema: Schema): Promise<ReadResult> {
  const issues: Issue[] = [];
  const data: WorkbookData = {};
  const wb = new ExcelJS.Workbook();

  try {
    await wb.xlsx.load(buffer);
  } catch (err) {
    return {
      data,
      issues: [{ sheet: "(workbook)", code: "unreadable", message: `Not a valid .xlsx file: ${(err as Error).message}` }],
    };
  }

  const expected = Object.keys(schema.sheets);
  for (const ws of wb.worksheets) {
    if (!(ws.name in schema.sheets)) {
      issues.push({ sheet: ws.name, code: "unknown_sheet", message: "Sheet is not defined in the schema." });
    }
  }

  for (const name of expected) {
    const ws = wb.getWorksheet(name);
    if (!ws) {
      issues.push({ sheet: name, code: "missing_sheet", message: "Required sheet is missing." });
      data[name] = [];
      continue;
    }
    if (ws.state !== "visible") {
      issues.push({ sheet: name, code: "hidden_sheet", message: "Hidden sheets are not allowed." });
    }
    if ((ws.model.merges ?? []).length > 0) {
      issues.push({ sheet: name, code: "merged_cells", message: "Merged cells are not allowed in data tables." });
    }

    const columns = schema.sheets[name]!.columns.map((c) => c.name);

    const header: string[] = [];
    const headerRow = ws.getRow(1);
    const width = Math.max(ws.actualColumnCount, columns.length);
    for (let c = 1; c <= width; c++) header.push(String(literal(headerRow.getCell(c).value).value));
    while (header.length > columns.length && header[header.length - 1] === "") header.pop();
    if (header.length !== columns.length || header.some((h, i) => h !== columns[i])) {
      issues.push({
        sheet: name,
        row: 1,
        code: "header_mismatch",
        message: `Header row must be exactly: ${columns.join(", ")}. Found: ${header.join(", ")}.`,
      });
    }

    const rows: SheetRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const wsRow = ws.getRow(r);
      const values: Record<string, unknown> = {};
      let nonEmpty = false;

      columns.forEach((col, i) => {
        const { value, problem } = literal(wsRow.getCell(i + 1).value);
        if (problem) {
          issues.push({ sheet: name, row: r, column: col, code: problem, message: PROBLEM_MESSAGES[problem]! });
          nonEmpty = true;
        }
        if (value !== "") nonEmpty = true;
        values[col] = value;
      });

      wsRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber > columns.length && literal(cell.value).value !== "") {
          issues.push({ sheet: name, row: r, code: "extra_column", message: `Unexpected data in column ${colNumber}, outside the schema's columns.` });
        }
      });

      if (nonEmpty) rows.push({ row: r, values });
    }
    data[name] = rows;
  }

  return { data, issues };
}
