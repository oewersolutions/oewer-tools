/**
 * Validate the workbook, then export it as deterministic JSON for the site build.
 *
 *   npx tsx scripts/export-content.ts [workbook.xlsx] [output.json]
 *
 * Defaults: data/oewer_database.xlsx -> generated/content.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";
import { buildContent, serialize } from "../lib/workbook/export";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "data/oewer_database.xlsx");
const output = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, "generated/content.json");

const buffer = await readFile(input);
const { data, issues } = await checkWorkbook(buffer as unknown as ArrayBuffer, buffer.byteLength);

if (issues.length > 0) {
  console.error(`Not exporting: workbook validation failed (${input})`);
  for (const issue of issues) console.error(`  ${formatIssue(issue)}`);
  process.exit(1);
}

const content = buildContent(data, schema);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, serialize(content), "utf-8");

const rowCount = Object.values(content.sheets).reduce((n, rows) => n + rows.length, 0);
console.log(`Exported ${rowCount} rows from ${Object.keys(content.sheets).length} sheets to ${output}`);
console.log(`content_hash ${content.content_hash}`);
