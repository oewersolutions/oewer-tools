/**
 * Bring the workbook up to the schema version this code expects, then validate it.
 *
 *   npm run migrate [path/to/workbook.xlsx]
 *
 * Git is the backup (every earlier version stays in the history), so no copy is made. Run it in the same commit as
 * the code that needs the new schema, so the deploy never sees code and workbook at different versions.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";
import { migrateWorkbook } from "../lib/workbook/migrate-file";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, "data/oewer_database.xlsx");

const buffer = await readFile(file);
const result = await migrateWorkbook(new Uint8Array(buffer), schema.schema_version);

if (result.status === "cannot") {
  console.error(`Cannot migrate ${file}: ${result.message}`);
  process.exit(1);
}
if (result.status === "up_to_date") {
  console.log(`Already at schema ${result.version}; nothing to do.`);
  process.exit(0);
}

await writeFile(file, result.bytes);
console.log(`Migrated ${file} from ${result.from} to ${result.to}:`);
for (const step of result.steps) console.log(`  - ${step}`);

const check = await checkWorkbook(result.bytes as unknown as ArrayBuffer, result.bytes.byteLength);
if (check.issues.length > 0) {
  console.error("The migrated workbook has problems:");
  for (const issue of check.issues) console.error(`  ${formatIssue(issue)}`);
  process.exit(1);
}
console.log("The migrated workbook is valid.");
