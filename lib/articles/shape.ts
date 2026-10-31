import type { Batch } from "./batch";

/** Is the batch file made of the right kinds of values? (The content checks come later, per article.) */
export function checkBatchShape(batch: unknown): string[] {
  const problems: string[] = [];
  const b = batch as Partial<Batch> | null;
  if (!b || typeof b !== "object") return ["The file is not a JSON object."];
  if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) problems.push('"date" must look like 2026-10-31.');
  if (!Array.isArray(b.articles) || b.articles.length === 0) return [...problems, '"articles" must be a list with at least one article.'];
  b.articles.forEach((a, i) => {
    const at = `Article ${i + 1}`;
    if (!a || typeof a !== "object") return void problems.push(`${at} is not an object.`);
    for (const key of ["title", "category", "excerpt"] as const) if (typeof a[key] !== "string") problems.push(`${at}: "${key}" must be text.`);
    if (!Array.isArray(a.tags) || a.tags.some((t) => typeof t !== "string")) problems.push(`${at}: "tags" must be a list of text.`);
    if (!Array.isArray(a.blocks) || a.blocks.some((x) => !Array.isArray(x) || x.length !== 2 || typeof x[0] !== "string" || typeof x[1] !== "string")) problems.push(`${at}: "blocks" must be a list of [type, text] pairs.`);
    if (!Array.isArray(a.sources) || a.sources.some((s) => !s || typeof s.title !== "string" || typeof s.url !== "string")) problems.push(`${at}: "sources" must be a list of {title, url}.`);
  });
  return problems;
}
