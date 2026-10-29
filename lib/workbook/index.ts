import { checkWorkbookVersion } from "./migrate";
import { readWorkbook, type ReadResult } from "./read";
import { schema } from "./schema";
import type { Issue, WorkbookData } from "./types";
import { validateWorkbook } from "./validate";

export { checkWorkbookVersion, compareVersions, parseVersion, planMigrations, readWorkbookVersion } from "./migrate";
export { readWorkbook } from "./read";
export { schema } from "./schema";
export { formatIssue } from "./types";
export type { Issue, Schema, SheetRow, WorkbookData } from "./types";
export { validateWorkbook } from "./validate";

export interface CheckResult extends ReadResult {
  data: WorkbookData;
  issues: Issue[];
}

/** Read a workbook buffer and run every check. Shared by the CLI, CI and the admin page. */
export async function checkWorkbook(buffer: Parameters<typeof readWorkbook>[0], byteLength: number): Promise<CheckResult> {
  if (byteLength > schema.limits.max_workbook_bytes) {
    return {
      data: {},
      issues: [{ sheet: "(workbook)", code: "too_large", message: `File is ${byteLength} bytes; the maximum is ${schema.limits.max_workbook_bytes}.` }],
    };
  }
  const read = await readWorkbook(buffer, schema);
  const version = checkWorkbookVersion(read.data, schema.schema_version);
  return {
    data: read.data,
    issues: [...(version ? [version] : []), ...read.issues, ...validateWorkbook(read.data, schema)],
  };
}
