/**
 * Publish a game: set its rules text from a Markdown file and its status to published.
 *
 *   npx tsx scripts/publish-game.ts hive-words path/to/how-to-play.md [--workbook path]
 *
 * Fails, leaving the workbook untouched, when the game does not exist or the result would not validate (for example
 * when the game's type is not built yet).
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { cellString, toRows } from "../lib/admin/table";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";

const [slug, howFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!slug || !howFile) throw new Error("Usage: publish-game.ts <slug> <how-to-play.md>");
const workbookPath = resolve(process.argv.includes("--workbook") ? process.argv[process.argv.indexOf("--workbook") + 1]! : "data/oewer_database.xlsx");

const how = (await readFile(resolve(howFile), "utf-8")).trim();
const bytes = new Uint8Array(await readFile(workbookPath));
const wb = await loadWorkbook(bytes);
const data = (await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength)).data;
const game = toRows(data, "games", schema.sheets.games!).find((r) => cellString(r.values.slug) === slug);
if (!game) throw new Error(`There is no game with the slug '${slug}'.`);

const { conflicts } = applyChanges(
  wb,
  schema,
  [
    { type: "set", sheet: "games", pk: game.id, column: "how_to_play", before: cellString(game.values.how_to_play), after: how },
    { type: "set", sheet: "games", pk: game.id, column: "status", before: cellString(game.values.status), after: "published" },
  ],
  new Set(),
);
if (conflicts.length > 0) throw new Error(`Could not apply: ${JSON.stringify(conflicts[0])}`);
const out = await saveWorkbook(wb);
const check = await checkWorkbook(out as unknown as ArrayBuffer, out.byteLength);
if (check.issues.length > 0) throw new Error(`The workbook would be invalid:\n  ${check.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
await writeFile(workbookPath, out);
console.log(`Published ${slug}.`);
