/** What the blog already has: every title, and how many articles each category holds. Used to avoid repeats and to balance topics. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cellString, toRows } from "../lib/admin/table";
import { checkWorkbook, schema } from "../lib/workbook";

const buffer = await readFile(resolve("data/oewer_database.xlsx"));
const { data } = await checkWorkbook(buffer as unknown as ArrayBuffer, buffer.byteLength);
const categories = toRows(data, "blog_categories", schema.sheets.blog_categories!);
const posts = toRows(data, "posts", schema.sheets.posts!);
console.log(`${posts.length} articles\n`);
for (const c of categories) {
  const mine = posts.filter((p) => cellString(p.values.category_id) === c.id);
  console.log(`${cellString(c.values.name)}: ${mine.length}`);
  for (const p of mine) console.log(`  - ${cellString(p.values.title)} [${cellString(p.values.status)}]`);
}
