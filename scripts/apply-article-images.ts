/**
 * Put the fetched Commons pictures into the articles: a cover (with its description) on every article, one picture with a
 * caption inside the text of those that have one, and an "Image credits" line at the end. Run after scripts/commons-images.ts.
 *
 *   npx tsx scripts/apply-article-images.ts [--dry-run]
 *
 * Re-running is safe: any earlier picture block and credits line made by this script is replaced, not doubled.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { planPost, readPost } from "../lib/admin/forms";
import { toRows, cellString } from "../lib/admin/table";
import { checkWorkbook, formatIssue, schema } from "../lib/workbook";
import type { Credit } from "./commons-images";

const workbookPath = resolve("data/oewer_database.xlsx");
const credits: Record<string, Credit> = JSON.parse(await readFile(resolve("content/images/credits.json"), "utf-8"));
const texts: Record<string, { coverAlt: string; figureAlt: string | null; figureCaption: string | null }> = JSON.parse(await readFile(resolve("content/images/text.json"), "utf-8"));

let bytes: Uint8Array = new Uint8Array(await readFile(workbookPath));
const wb = await loadWorkbook(bytes);
const start = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
if (start.issues.length > 0) throw new Error(`The workbook is not valid to begin with: ${formatIssue(start.issues[0]!)}`);
let data = start.data;

const cleanAuthor = (c: Credit) => {
  const a = c.author.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").replace(/^(photo|image)\s*(by|:)\s*/i, "").trim();
  return (a || "Unknown author").slice(0, 45);
};
const isFree = (c: Credit) => /public domain|cc0/i.test(c.licence);
const shortCredit = (c: Credit) => (isFree(c) ? `Photo: ${cleanAuthor(c)}, ${c.licence}.` : `Photo: ${cleanAuthor(c)}, ${c.licence}.`) + " Wikimedia Commons.";
const longCredit = (label: string, c: Credit) => `${label}: [${c.title.replace(/^File:/, "").replace(/\.jpe?g$/i, "").replace(/[[\]()]/g, "").slice(0, 70)}](${c.page}) by ${cleanAuthor(c)}, ${c.licenceUrl ? `[${c.licence}](${c.licenceUrl})` : c.licence}`;

const CREDIT_MARK = "Image credits:";
let changed = 0;
for (const post of toRows(data, "posts", schema.sheets.posts!)) {
  const slug = cellString(post.values.slug);
  const text = texts[slug];
  const cover = credits[`${slug}/cover`];
  if (!text || !cover) {
    console.log(`skipped (no pictures chosen): ${slug}`);
    continue;
  }
  const figure = text.figureAlt ? credits[`${slug}/figure`] : undefined;
  const form = readPost(data, post.id);
  // earlier pictures and credits written by this script are replaced
  form.blocks = form.blocks.filter((b) => !(b.block_type === "image" && b.asset_path.includes(`/${slug}/figure-`)) && !(b.block_type === "paragraph" && b.content.startsWith(CREDIT_MARK)));
  if (figure && text.figureAlt) {
    const firstHeading = form.blocks.findIndex((b) => b.block_type === "heading");
    let at = firstHeading >= 0 ? form.blocks.findIndex((b, i) => i > firstHeading && b.block_type === "paragraph") : 0;
    if (at < 0) at = 0;
    const caption = `${text.figureCaption ?? ""} ${shortCredit(figure)}`.trim();
    if (caption.length > 200) throw new Error(`Caption too long for ${slug}: ${caption.length}`);
    form.blocks.splice(at + 1, 0, { block_id: "", block_type: "image", content: text.figureAlt, asset_path: `/images/blog/${slug}/figure-1200.jpg`, caption });
  }
  const lines = [longCredit("Cover photo", cover), ...(figure ? [longCredit("Picture in the text", figure)] : [])];
  form.blocks.push({ block_id: "", block_type: "paragraph", content: `${CREDIT_MARK} ${lines.join("; ")}. Pictures from Wikimedia Commons.`, asset_path: "", caption: "" });
  form.cover_image = `/images/blog/${slug}/cover-1600.jpg`;
  form.cover_alt = text.coverAlt;
  const { changes } = planPost(data, form);
  if (changes.length === 0) continue;
  const { conflicts } = applyChanges(wb, schema, changes as Change[], new Set());
  if (conflicts.length > 0) throw new Error(`Could not apply for ${slug}: ${JSON.stringify(conflicts[0])}`);
  bytes = await saveWorkbook(wb);
  const check = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
  if (check.issues.length > 0) throw new Error(`${slug} would break the workbook: ${check.issues.slice(0, 3).map(formatIssue).join(" | ")}`);
  data = check.data;
  changed++;
}
if (changed > 0 && !process.argv.includes("--dry-run")) await writeFile(workbookPath, bytes);
console.log(`${changed} articles updated`);
