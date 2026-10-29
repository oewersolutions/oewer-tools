export interface ColumnDef {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  enum?: string;
  ref?: string;
  pattern?: string;
  max_length?: number;
  max_length_key?: string;
  min?: number;
}

export interface SheetDef {
  purpose: string;
  primary_key: string;
  id_pattern?: string;
  required_keys?: string[];
  unique_together?: string[][];
  polymorphic_ref?: {
    type_column: string;
    id_column: string;
    targets: Record<string, string>;
  };
  columns: ColumnDef[];
}

export interface Schema {
  schema_version: string;
  limits: {
    max_workbook_bytes: number;
    max_rows_per_sheet: number;
    max_string_length: number;
    max_text_length: number;
    max_block_length: number;
  };
  enums: Record<string, string[]>;
  sheets: Record<string, SheetDef>;
}

/** One data row. `row` is the 1-based worksheet row number, for error messages. */
export interface SheetRow {
  row: number;
  values: Record<string, unknown>;
}

export type WorkbookData = Record<string, SheetRow[]>;

export interface Issue {
  sheet: string;
  /** 1-based worksheet row, when the issue belongs to a row. */
  row?: number;
  column?: string;
  code: string;
  message: string;
}

export function formatIssue(issue: Issue): string {
  const where = [issue.sheet, issue.row ? `row ${issue.row}` : "", issue.column ?? ""].filter(Boolean).join(" / ");
  return `[${issue.code}] ${where}: ${issue.message}`;
}
