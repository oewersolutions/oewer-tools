import { slugify } from "../posts";

/**
 * Daily article batches. An article arrives as plain data (a title, a category, text blocks and the sources it was
 * written from) and has to pass these checks before it is added to the workbook. The checks are about quality and
 * honesty, not about hiding anything: enough substance, real sources, plain wording, no claims of experience that
 * nobody had, and no repeating an article that already exists.
 */

export interface BatchSource {
  title: string;
  url: string;
}

export interface BatchArticle {
  title: string;
  slug?: string;
  /** Category name, such as "Cars and Bikes". A new name creates the category (give `categoryDescription`). */
  category: string;
  categoryDescription?: string;
  excerpt: string;
  tags: string[];
  /** [block type, text] in reading order. Types: paragraph, heading, list (one item per line), quote, callout, code. */
  blocks: [type: string, content: string][];
  /** The pages the facts came from. Shown at the end of the article. */
  sources: BatchSource[];
  /** Day the facts were checked, YYYY-MM-DD. Defaults to the batch date. */
  checkedOn?: string;
  seo?: { title?: string; description?: string };
}

export interface Batch {
  /** YYYY-MM-DD, also the publication date. */
  date: string;
  articles: BatchArticle[];
}

export const LIMITS = {
  maxPerRun: 12,
  title: [20, 110],
  excerpt: [60, 300],
  words: [600, 2500],
  headings: [3, 14],
  sources: [2, 8],
  tags: [1, 6],
} as const;

export const BLOCK_TYPES = ["paragraph", "heading", "list", "quote", "callout", "code"] as const;

/** Stock phrases that make writing vague, and phrases that claim an experience nobody here had. */
const FILLER = [
  "in today's fast-paced world",
  "in the ever-evolving",
  "in this digital age",
  "it's important to note that",
  "it is important to note that",
  "it is worth noting that",
  "delve into",
  "delve deeper",
  "a tapestry of",
  "game-changer",
  "game changer",
  "unlock the power",
  "unleash the power",
  "in conclusion,",
  "look no further",
  "buckle up",
  "navigate the landscape",
  "rich tapestry",
  "at the end of the day",
];
const FALSE_EXPERIENCE = ["as an ai", "as a language model", "i tested", "i tried", "i have tested", "i personally", "in my experience", "we tested", "we tried", "our testing showed", "i drove", "i flew", "i visited", "i own"];

export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const wordsOf = (s: string) => new Set(normalise(s).split(" ").filter((w) => w.length > 2));

/** How alike two titles are, 0 to 1, by the words they share. */
export function titleSimilarity(a: string, b: string): number {
  const x = wordsOf(a);
  const y = wordsOf(b);
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / Math.max(x.size, y.size);
}

export interface Existing {
  titles: string[];
  slugs: Set<string>;
}

const isHttps = (url: string): URL | null => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.includes(".") ? u : null;
  } catch {
    return null;
  }
};

/** Everything wrong with an article, in plain words. An empty list means it may be added. */
export function checkArticle(a: BatchArticle, existing: Existing): string[] {
  const problems: string[] = [];
  const range = (label: string, n: number, [min, max]: readonly [number, number]) => {
    if (n < min) problems.push(`${label} is ${n}; it needs at least ${min}.`);
    if (n > max) problems.push(`${label} is ${n}; the most is ${max}.`);
  };

  range("The title length", a.title.length, LIMITS.title);
  range("The summary length", a.excerpt.length, LIMITS.excerpt);
  range("The number of tags", a.tags.length, LIMITS.tags);
  if (!a.category.trim()) problems.push("There is no category.");

  const slug = a.slug ? a.slug : slugify(a.title);
  if (!slug) problems.push("The title makes no usable address.");
  if (existing.slugs.has(slug)) problems.push(`An article with the address '${slug}' already exists.`);
  for (const t of existing.titles) {
    if (titleSimilarity(a.title, t) >= 0.75) {
      problems.push(`Too close to the existing article "${t}". Write about something different, or a clearly different angle.`);
      break;
    }
  }

  const types: readonly string[] = BLOCK_TYPES;
  const blocks = a.blocks;
  if (blocks.length === 0) return [...problems, "The article has no text."];
  for (const [type] of blocks) if (!types.includes(type)) problems.push(`Block type '${type}' is not allowed (use ${BLOCK_TYPES.join(", ")}).`);
  if (blocks[0]![0] !== "paragraph") problems.push("The article should open with a paragraph, not a heading or a list.");
  if (blocks.at(-1)![0] === "heading") problems.push("The article ends on a heading with nothing under it.");
  blocks.forEach(([type, content], i) => {
    if (type === "heading" && blocks[i + 1]?.[0] === "heading") problems.push(`Two headings in a row ("${content}").`);
    if (type === "heading" && content.length > 80) problems.push(`The heading "${content.slice(0, 40)}…" is longer than 80 characters.`);
    if (type === "list" && content.split("\n").filter(Boolean).length < 2) problems.push("A list needs at least two items.");
  });

  const headings = blocks.filter(([t]) => t === "heading").length;
  range("The number of headings", headings, LIMITS.headings);
  const body = blocks.filter(([t]) => t !== "heading" && t !== "code").map(([, c]) => c).join("\n");
  range("The word count", wordCount(body), LIMITS.words);

  const all = [a.title, a.excerpt, ...blocks.map(([, c]) => c)].join("\n");
  if (/[<>]/.test(all)) problems.push("The text contains < or >. Raw HTML is not allowed; write plain text.");
  if (/^#{1,3}\s/m.test(all)) problems.push("Use heading blocks, not # marks inside text.");
  const lower = all.toLowerCase();
  for (const phrase of FILLER) if (lower.includes(phrase)) problems.push(`Filler phrase "${phrase}": say the thing directly.`);
  for (const phrase of FALSE_EXPERIENCE) if (new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) problems.push(`"${phrase}" claims an experience or a role nobody here had. Write from the sources instead.`);
  if (/!!/.test(all)) problems.push("Do not use double exclamation marks.");
  for (const link of all.matchAll(/\]\(([^)\s]+)\)/g)) if (!isHttps(link[1]!)) problems.push(`The link ${link[1]} is not a full https:// address.`);

  range("The number of sources", a.sources.length, LIMITS.sources);
  const urls = new Set<string>();
  const hosts = new Set<string>();
  for (const s of a.sources) {
    const u = isHttps(s.url);
    if (!u) problems.push(`The source "${s.title}" (${s.url}) is not a full https:// address.`);
    else {
      urls.add(u.href);
      hosts.add(u.hostname.replace(/^www\./, ""));
    }
    if (!s.title.trim() || s.title.length > 120) problems.push(`A source has no title, or one over 120 characters (${s.url}).`);
  }
  if (urls.size < a.sources.length) problems.push("The same source is listed twice.");
  if (hosts.size < 2 && a.sources.length >= 2) problems.push("All the sources are on one website. Use at least two different ones.");
  if (a.checkedOn && !/^\d{4}-\d{2}-\d{2}$/.test(a.checkedOn)) problems.push("checkedOn must look like 2026-10-31.");
  return problems;
}

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The blocks that go into the workbook: the writer's text, a note on what was checked, and the sources. */
export function finalBlocks(a: BatchArticle, batchDate: string): [string, string][] {
  const checked = longDate(a.checkedOn ?? batchDate);
  return [
    ...a.blocks,
    ["callout", `**Checked on ${checked}.** The facts here come from the sources listed below. Prices, plans, dates and specifications change, so confirm anything important on the official page before you buy or decide.`],
    ["heading", "Sources"],
    ["list", a.sources.map((s) => `[${s.title.replace(/[[\]]/g, "")}](${isHttps(s.url)!.href})`).join("\n")],
  ];
}

export const DEFAULT_CATEGORY_INFO: Record<string, string> = {
  ai: "Artificial intelligence: what it can do, what it costs and what is coming.",
  technology: "New technology explained in plain language.",
  "cars-and-bikes": "Cars, motorcycles and how they work.",
  aviation: "Aeroplanes, airlines and how flying works.",
  "vintage-and-history": "Classic vehicles and the companies behind them.",
  electronics: "Phones, laptops and gadgets: how they work and what to look for.",
  "how-it-works": "Everyday things, explained step by step.",
};

/** Publication times spread through the day (UTC), so a batch does not all carry the same minute. */
export const publishTime = (date: string, index: number): string => `${date}T${String(4 + ((index * 2) % 16)).padStart(2, "0")}:${String((index * 17) % 60).padStart(2, "0")}:00Z`;
