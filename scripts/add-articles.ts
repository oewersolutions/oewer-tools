/**
 * Add a day's articles to the workbook.
 *
 *   npx tsx scripts/add-articles.ts content/batches/2026-10-31.json [--status draft|published] [--dry-run]
 *
 * Each article is checked (see lib/articles/batch.ts); the ones that pass are added with their category, tags and
 * sources, the rest are reported with the reasons and left out. The whole workbook is validated before anything is
 * written, so a bad batch can never leave the workbook broken. Prints a JSON summary and exits 1 when nothing was added.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyChanges, type Change } from "../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../lib/admin/edit";
import { idAllocator, nowIso, planPost, planSeo, readPost, readSeo } from "../lib/admin/forms";
import { toRows, cellString } from "../lib/admin/table";
import { checkBatchShape } from "../lib/articles/shape";
import { checkArticle, DEFAULT_CATEGORY_INFO, finalBlocks, LIMITS, publishTime, wordCount, type Batch } from "../lib/articles/batch";
import { slugify } from "../lib/posts";
import { checkWorkbook, formatIssue, schema, type WorkbookData } from "../lib/workbook";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args[args.indexOf(`--${name}`) + 1];
if (!file) throw new Error("Give the batch file, e.g. content/batches/2026-10-31.json");
const status = flag("status") ? value("status") : "published";
if (status !== "draft" && status !== "published") throw new Error("--status must be draft or published");
const workbookPath = resolve(flag("workbook") ? value("workbook")! : "data/oewer_database.xlsx");

const batch = JSON.parse(await readFile(resolve(file), "utf-8")) as Batch;
const shape = checkBatchShape(batch);
if (shape.length > 0) {
  console.error(`The batch file is not in the expected shape:\n  - ${shape.join("\n  - ")}`);
  process.exit(1);
}
if (batch.articles.length > LIMITS.maxPerRun) {
  console.error(`A run adds at most ${LIMITS.maxPerRun} articles; this batch has ${batch.articles.length}.`);
  process.exit(1);
}

let bytes: Uint8Array = new Uint8Array(await readFile(workbookPath));
const wb = await loadWorkbook(bytes);
async function reread(): Promise<WorkbookData> {
  bytes = await saveWorkbook(wb);
  const check = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
  if (check.issues.length > 0) throw new Error(`The workbook would be invalid:\n  ${check.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
  return check.data;
}

const start = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
if (start.issues.length > 0) {
  console.error(`The workbook is not valid to begin with:\n  ${start.issues.slice(0, 8).map(formatIssue).join("\n  ")}`);
  process.exit(1);
}
let data = start.data;

const apply = (changes: Change[]) => {
  const { conflicts } = applyChanges(wb, schema, changes, new Set());
  if (conflicts.length > 0) throw new Error(`Could not apply: ${JSON.stringify(conflicts[0])}`);
};

const added: { title: string; slug: string; category: string; words: number; status: string }[] = [];
const rejected: { title: string; problems: string[] }[] = [];
const seenSlugs = new Set(toRows(data, "posts", schema.sheets.posts!).map((r) => cellString(r.values.slug)));
const seenTitles = toRows(data, "posts", schema.sheets.posts!).map((r) => cellString(r.values.title));

for (const [index, article] of batch.articles.entries()) {
  const problems = checkArticle(article, { titles: seenTitles, slugs: seenSlugs });
  const catSlug = slugify(article.category);
  const known = toRows(data, "blog_categories", schema.sheets.blog_categories!).find((c) => cellString(c.values.slug) === catSlug || cellString(c.values.name).toLowerCase() === article.category.toLowerCase());
  const description = article.categoryDescription ?? DEFAULT_CATEGORY_INFO[catSlug];
  if (!known && !description) problems.push(`'${article.category}' is a new category: give categoryDescription.`);
  if (problems.length > 0) {
    rejected.push({ title: article.title, problems });
    continue;
  }

  if (!known) {
    const id = idAllocator(data, "blog_categories")();
    apply([{ type: "add", sheet: "blog_categories", values: { category_id: id, name: article.category.trim(), slug: catSlug, description: description! } }]);
    data = await reread();
  }
  const category = toRows(data, "blog_categories", schema.sheets.blog_categories!).find((c) => cellString(c.values.slug) === catSlug || cellString(c.values.name).toLowerCase() === article.category.toLowerCase())!;
  const author = toRows(data, "authors", schema.sheets.authors!)[0]!;
  const tagRows = toRows(data, "tags", schema.sheets.tags!);

  const form = readPost(data, "");
  const slug = article.slug || slugify(article.title);
  const when = publishTime(batch.date, index);
  const tagIds: string[] = [];
  const newTags: string[] = [];
  for (const name of article.tags) {
    const hit = tagRows.find((t) => cellString(t.values.name).toLowerCase() === name.toLowerCase());
    if (hit) tagIds.push(hit.id);
    else newTags.push(name);
  }
  const blocks = finalBlocks(article, batch.date).map(([block_type, content]) => ({ block_id: "", block_type, content, asset_path: "", caption: "" }));
  const planned = planPost(data, { ...form, title: article.title.trim(), slug, excerpt: article.excerpt.trim(), category_id: category.id, author_id: author.id, status, published_at: status === "published" ? when : "", tagIds, newTags, blocks, cover_image: "", cover_alt: "" }, status === "published" ? when : nowIso());
  const seoChanges = article.seo?.title || article.seo?.description ? planSeo(data, "post", planned.postId, { ...readSeo(data, "post", planned.postId), meta_title: article.seo.title ?? "", meta_description: article.seo.description ?? "" }) : [];
  apply([...planned.changes, ...seoChanges]);
  try {
    data = await reread();
  } catch (e) {
    throw new Error(`"${article.title}" would break the workbook: ${(e as Error).message}`);
  }
  seenSlugs.add(slug);
  seenTitles.push(article.title);
  added.push({ title: article.title, slug, category: article.category, words: wordCount(article.blocks.map(([, c]) => c).join(" ")), status });
}

if (added.length > 0 && !flag("dry-run")) await writeFile(workbookPath, bytes);
console.log(JSON.stringify({ date: batch.date, status, dryRun: flag("dry-run"), added, rejected }, null, 2));
process.exit(added.length > 0 ? 0 : 1);
