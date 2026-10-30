import { queueAdd, queueDelete, queueSet, type Change } from "./changes";
import { cellString, nextId, toRows, type Row } from "./table";
import { slugify } from "../posts";
import { schema } from "../workbook";
import type { WorkbookData } from "../workbook/types";

/**
 * Turns what the purpose-built forms collect into workbook changes. Each planner compares the form with what the
 * workbook holds now (including pending changes) and returns only what differs. Nothing here touches the network.
 */

export type RowData = Record<string, string>;
export const nowIso = (date = new Date()) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

const pkOf = (sheet: string) => schema.sheets[sheet]!.primary_key;
const rowsOf = (data: WorkbookData, sheet: string): Row[] => toRows(data, sheet, schema.sheets[sheet]!);
const asStrings = (row: Row): RowData => Object.fromEntries(Object.entries(row.values).map(([k, v]) => [k, cellString(v)]));

/** Fold planned changes into the list of pending changes, merging with earlier ones. */
export function mergeChanges(pending: Change[], planned: Change[]): Change[] {
  let out = pending;
  for (const c of planned) {
    if (c.type === "set") {
      // A row added in this session has nothing on GitHub to edit: fold the edit into the pending "add".
      const pk = pkOf(c.sheet);
      const i = out.findIndex((x) => x.type === "add" && x.sheet === c.sheet && x.values[pk] === c.pk);
      out = i === -1 ? queueSet(out, c) : out.map((x, n) => (n === i && x.type === "add" ? { ...x, values: { ...x.values, [c.column]: c.after } } : x));
    } else if (c.type === "add") out = queueAdd(out, c.sheet, pkOf(c.sheet), c.values);
    else out = queueDelete(out, c.sheet, pkOf(c.sheet), c.pk);
  }
  return out;
}

/** Hands out new IDs for a sheet, never reusing one that exists or was already handed out. */
export function idAllocator(data: WorkbookData, sheet: string) {
  const used = rowsOf(data, sheet).map((r) => r.id);
  return () => {
    const id = nextId(schema.sheets[sheet]!, used);
    used.push(id);
    return id;
  };
}

/**
 * Make `current` rows match `desired` rows: new IDs are added, differing cells are set, and rows missing from `desired`
 * are deleted (unless `keepMissing`). Only the columns present in a desired row are compared.
 */
export function planRows(sheet: string, current: Row[], desired: RowData[], keepMissing = false): Change[] {
  const pk = pkOf(sheet);
  const changes: Change[] = [];
  const byId = new Map(current.map((r) => [r.id, r]));
  const wanted = new Set<string>();
  for (const row of desired) {
    const id = row[pk] ?? "";
    wanted.add(id);
    const existing = byId.get(id);
    if (!existing) {
      changes.push({ type: "add", sheet, values: row });
      continue;
    }
    for (const [column, after] of Object.entries(row)) {
      const before = cellString(existing.values[column]);
      if (column !== pk && before !== after) changes.push({ type: "set", sheet, pk: id, column, before, after });
    }
  }
  if (!keepMissing) for (const r of current) if (!wanted.has(r.id)) changes.push({ type: "delete", sheet, pk: r.id });
  return changes;
}

// ---- SEO ----

export type SeoEntity = "page" | "tool_category" | "tool" | "post" | "blog_category";
export interface SeoForm {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  noindex: boolean;
}
export const EMPTY_SEO: SeoForm = { meta_title: "", meta_description: "", canonical_url: "", noindex: false };

const seoRow = (data: WorkbookData, type: SeoEntity, id: string) =>
  rowsOf(data, "seo_metadata").find((r) => cellString(r.values.entity_type) === type && cellString(r.values.entity_id) === id);

export function readSeo(data: WorkbookData, type: SeoEntity, id: string): SeoForm {
  const row = seoRow(data, type, id);
  if (!row) return { ...EMPTY_SEO };
  return {
    meta_title: cellString(row.values.meta_title),
    meta_description: cellString(row.values.meta_description),
    canonical_url: cellString(row.values.canonical_url),
    noindex: row.values.noindex === true,
  };
}

/** Changes that make the SEO row for an entity match the form. A form left completely empty removes the row. */
export function planSeo(data: WorkbookData, type: SeoEntity, id: string, form: SeoForm, newId = idAllocator(data, "seo_metadata")): Change[] {
  const row = seoRow(data, type, id);
  const empty = form.meta_title === "" && form.meta_description === "" && form.canonical_url === "" && !form.noindex;
  if (empty) return row ? [{ type: "delete", sheet: "seo_metadata", pk: row.id }] : [];
  const values: RowData = {
    seo_id: row?.id ?? newId(),
    entity_type: type,
    entity_id: id,
    meta_title: form.meta_title,
    meta_description: form.meta_description,
    canonical_url: form.canonical_url,
    noindex: form.noindex ? "true" : "false",
  };
  return planRows("seo_metadata", row ? [row] : [], [values], true);
}

// ---- Tool page content (tool_settings) ----

export interface ToolContentForm {
  help: string;
  examples: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  related: string[];
  guides: string[];
}
const CONTENT_KEYS = ["help", "examples", "faq", "related", "guides"] as const;

function settingRow(data: WorkbookData, toolId: string, key: string) {
  return rowsOf(data, "tool_settings").find((r) => cellString(r.values.tool_id) === toolId && cellString(r.values.setting_key) === key);
}

export function readToolContent(data: WorkbookData, toolId: string): ToolContentForm {
  const get = (key: string) => cellString(settingRow(data, toolId, key)?.values.setting_value);
  const list = <T,>(key: string): T[] => {
    try {
      const parsed = JSON.parse(get(key) || "[]");
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };
  return { help: get("help"), examples: list("examples"), faq: list("faq"), related: list("related"), guides: list("guides") };
}

export function planToolContent(data: WorkbookData, toolId: string, form: ToolContentForm, newId = idAllocator(data, "tool_settings")): Change[] {
  const changes: Change[] = [];
  const desired: Record<(typeof CONTENT_KEYS)[number], string> = {
    help: form.help,
    examples: form.examples.length ? JSON.stringify(form.examples) : "",
    faq: form.faq.length ? JSON.stringify(form.faq) : "",
    related: form.related.length ? JSON.stringify(form.related) : "",
    guides: form.guides.length ? JSON.stringify(form.guides) : "",
  };
  for (const key of CONTENT_KEYS) {
    const row = settingRow(data, toolId, key);
    const value = desired[key];
    if (value === "") {
      if (row) changes.push({ type: "delete", sheet: "tool_settings", pk: row.id });
      continue;
    }
    const type = key === "help" ? "string" : "json";
    const same = row && (key === "help" ? cellString(row.values.setting_value) === value : sameJson(cellString(row.values.setting_value), value));
    if (same) continue;
    changes.push(...planRows("tool_settings", row ? [row] : [], [{ setting_id: row?.id ?? newId(), tool_id: toolId, setting_key: key, setting_value: value, value_type: type }], true));
  }
  return changes;
}

function sameJson(a: string, b: string): boolean {
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return a === b;
  }
}

// ---- Articles ----

export interface BlockForm {
  /** Empty for a block that has not been saved yet. */
  block_id: string;
  block_type: string;
  content: string;
  asset_path: string;
}
export interface PostForm {
  /** Empty for a new article. */
  post_id: string;
  title: string;
  slug: string;
  excerpt: string;
  category_id: string;
  author_id: string;
  status: string;
  published_at: string;
  tagIds: string[];
  /** Names of tags to create and attach. */
  newTags: string[];
  blocks: BlockForm[];
}

export function readPost(data: WorkbookData, postId: string): PostForm {
  const row = rowsOf(data, "posts").find((r) => r.id === postId);
  const s = row ? asStrings(row) : ({} as RowData);
  const blocks = rowsOf(data, "post_blocks")
    .filter((r) => cellString(r.values.post_id) === postId)
    .sort((a, b) => Number(a.values.sort_order) - Number(b.values.sort_order))
    .map((r) => ({ block_id: r.id, block_type: cellString(r.values.block_type), content: cellString(r.values.content), asset_path: cellString(r.values.asset_path) }));
  const tagIds = rowsOf(data, "post_tags").filter((r) => cellString(r.values.post_id) === postId).map((r) => cellString(r.values.tag_id));
  return {
    post_id: postId,
    title: s.title ?? "",
    slug: s.slug ?? "",
    excerpt: s.excerpt ?? "",
    category_id: s.category_id ?? "",
    author_id: s.author_id ?? "",
    status: s.status ?? "draft",
    published_at: s.published_at ?? "",
    tagIds,
    newTags: [],
    blocks: row ? blocks : [{ block_id: "", block_type: "paragraph", content: "", asset_path: "" }],
  };
}

/** Everything needed to save an article: the post row, its blocks in order, and its tags (creating new ones). */
export function planPost(data: WorkbookData, form: PostForm, now = nowIso()): { changes: Change[]; postId: string } {
  const changes: Change[] = [];
  const newPostId = idAllocator(data, "posts");
  const postId = form.post_id || newPostId();
  const existing = rowsOf(data, "posts").find((r) => r.id === postId);

  // A published article needs a publication date: use now when none was given.
  const publishedAt = form.status === "published" && form.published_at === "" ? now : form.published_at;
  const postValues: RowData = {
    post_id: postId,
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    category_id: form.category_id,
    author_id: form.author_id,
    status: form.status,
    published_at: publishedAt,
    updated_at: existing ? cellString(existing.values.updated_at) : now,
  };

  // Blocks, numbered in the order shown.
  const newBlockId = idAllocator(data, "post_blocks");
  const currentBlocks = rowsOf(data, "post_blocks").filter((r) => cellString(r.values.post_id) === postId);
  const desiredBlocks = form.blocks.map((b, i) => ({
    block_id: b.block_id || newBlockId(),
    post_id: postId,
    sort_order: String(i + 1),
    block_type: b.block_type,
    content: b.content,
    asset_path: b.block_type === "image" ? b.asset_path : "",
  }));
  const blockChanges = planRows("post_blocks", currentBlocks, desiredBlocks);

  // Tags: create the new ones, then attach everything chosen.
  const newTagId = idAllocator(data, "tags");
  const known = rowsOf(data, "tags").map((t) => ({ id: t.id, name: cellString(t.values.name) }));
  const created: RowData[] = [];
  const tagIds = [...form.tagIds];
  for (const name of form.newTags.map((n) => n.trim()).filter(Boolean)) {
    let hit = known.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!hit) {
      hit = { id: newTagId(), name };
      known.push(hit);
      created.push({ tag_id: hit.id, name, slug: slugify(name) });
    }
    if (!tagIds.includes(hit.id)) tagIds.push(hit.id);
  }
  const tagChanges = created.map((values): Change => ({ type: "add", sheet: "tags", values }));
  const newRelationId = idAllocator(data, "post_tags");
  const currentRelations = rowsOf(data, "post_tags").filter((r) => cellString(r.values.post_id) === postId);
  const desiredRelations = tagIds.map((tagId) => ({ relation_id: currentRelations.find((r) => cellString(r.values.tag_id) === tagId)?.id ?? newRelationId(), post_id: postId, tag_id: tagId }));
  const relationChanges = planRows("post_tags", currentRelations, desiredRelations);

  const postChanges = planRows("posts", existing ? [existing] : [], [postValues], true);
  changes.push(...tagChanges, ...postChanges, ...blockChanges, ...relationChanges);
  // Editing an existing article refreshes its "updated" date.
  if (existing && changes.length > 0) {
    changes.push({ type: "set", sheet: "posts", pk: postId, column: "updated_at", before: cellString(existing.values.updated_at), after: now });
  }
  return { changes, postId };
}

// ---- Advertisements ----

export interface AdsForm {
  adsEnabled: boolean;
  placements: { ad_id: string; placement_key: string; page_type: string; enabled: boolean; ad_unit_id: string }[];
}

export function readAds(data: WorkbookData): AdsForm {
  const setting = rowsOf(data, "site_settings").find((r) => r.id === "ads_enabled");
  return {
    adsEnabled: cellString(setting?.values.setting_value) === "true",
    placements: rowsOf(data, "advertisements").map((r) => ({
      ad_id: r.id,
      placement_key: cellString(r.values.placement_key),
      page_type: cellString(r.values.page_type),
      enabled: r.values.enabled === true,
      ad_unit_id: cellString(r.values.ad_unit_id),
    })),
  };
}

export function planAds(data: WorkbookData, form: AdsForm, now = nowIso()): Change[] {
  const newId = idAllocator(data, "advertisements");
  const desired = form.placements.map((p) => ({ ad_id: p.ad_id || newId(), placement_key: p.placement_key, page_type: p.page_type, enabled: p.enabled ? "true" : "false", ad_unit_id: p.ad_unit_id }));
  const changes = planRows("advertisements", rowsOf(data, "advertisements"), desired);
  const setting = rowsOf(data, "site_settings").find((r) => r.id === "ads_enabled");
  const wanted = form.adsEnabled ? "true" : "false";
  if (setting && cellString(setting.values.setting_value) !== wanted) {
    changes.push({ type: "set", sheet: "site_settings", pk: "ads_enabled", column: "setting_value", before: cellString(setting.values.setting_value), after: wanted });
    changes.push({ type: "set", sheet: "site_settings", pk: "ads_enabled", column: "updated_at", before: cellString(setting.values.updated_at), after: now });
  }
  return changes;
}
