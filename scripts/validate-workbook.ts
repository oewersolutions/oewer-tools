/**
 * Validate the content workbook. Exits 1 when any issue is found.
 *
 *   npx tsx scripts/validate-workbook.ts [path/to/workbook.xlsx]
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkWorkbook, formatIssue } from "../lib/workbook";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "data/oewer_database.xlsx");

const buffer = await readFile(file);
const { data, issues } = await checkWorkbook(buffer as unknown as ArrayBuffer, buffer.byteLength);

if (issues.length > 0) {
  console.error(`Workbook validation failed: ${file}`);
  for (const issue of issues) console.error(`  ${formatIssue(issue)}`);
  console.error(`${issues.length} issue(s).`);
  process.exit(1);
}

const rowCount = Object.values(data).reduce((n, rows) => n + rows.length, 0);
console.log(`Workbook OK: ${Object.keys(data).length} sheets, ${rowCount} rows (${file})`);
