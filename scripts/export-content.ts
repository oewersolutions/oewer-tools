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
import { existsSync } from "node:fs";
import { missingImageFiles } from "../lib/posts";
import { TOOL_COMPONENT_KEYS } from "../lib/tools/keys";
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

if (process.env.OEWER_PREVIEW_DRAFTS === "1") {
  if (process.env.GITHUB_WORKFLOW === "Deploy to GitHub Pages") {
    console.error("OEWER_PREVIEW_DRAFTS must never be set for a deploy build.");
    process.exit(1);
  }
  console.warn("PREVIEW BUILD: draft articles get a page. Do not deploy this build.");
}

// Images referenced by articles must exist under public/, or the build would publish broken images.
const missing = missingImageFiles(
  (content.sheets.post_blocks ?? []).map((b) => ({ block_id: String(b.block_id), block_type: String(b.block_type), content: String(b.content), asset_path: String(b.asset_path) })),
  (path) => existsSync(resolve(ROOT, "public", `.${path}`)),
);
if (missing.length > 0) {
  console.error("Not exporting: these article images are not in the public folder:");
  for (const path of missing) console.error(`  ${path}`);
  process.exit(1);
}

// For test builds only: show every tool that has a component, so browser tests can exercise them while they are still drafts.
if (process.env.OEWER_PREVIEW_ALL_TOOLS === "1") {
  if (process.env.GITHUB_WORKFLOW === "Deploy to GitHub Pages") {
    console.error("OEWER_PREVIEW_ALL_TOOLS must never be set for a deploy build.");
    process.exit(1);
  }
  const known: readonly string[] = TOOL_COMPONENT_KEYS;
  for (const tool of content.sheets.tools ?? []) if (known.includes(String(tool.component_key))) tool.status = "published";
  console.warn("PREVIEW BUILD: every tool with a component is shown as published. Do not deploy this build.");
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, serialize(content), "utf-8");

const rowCount = Object.values(content.sheets).reduce((n, rows) => n + rows.length, 0);
console.log(`Exported ${rowCount} rows from ${Object.keys(content.sheets).length} sheets to ${output}`);
console.log(`content_hash ${content.content_hash}`);
