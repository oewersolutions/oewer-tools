import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AdConfig } from "./ads";
import { readingMinutes } from "./format";
import { hasOwnPage, pickRelatedPosts, slugify } from "./posts";

export { MIN_POSTS_FOR_INDEXED_TAG } from "./posts";
import { parseToolContent, pickRelated, type ToolContent } from "./tools/content";
import type { ContentExport } from "./workbook/export";

export interface ToolCategory {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  enabled: boolean;
}
export interface Tool {
  tool_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  component_key: string;
  status: string;
  featured: boolean;
  sort_order: number;
}
export interface Page {
  page_id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  updated_at: string;
}
export interface BlogCategory {
  category_id: string;
  name: string;
  slug: string;
  description: string;
}
export interface Author {
  author_id: string;
  display_name: string;
  bio: string;
  avatar_path: string;
}
export interface Post {
  post_id: string;
  title: string;
  slug: string;
  excerpt: string;
  category_id: string;
  author_id: string;
  status: string;
  published_at: string | null;
  updated_at: string;
}
export interface PostBlock {
  block_id: string;
  post_id: string;
  sort_order: number;
  block_type: string;
  content: string;
  asset_path: string;
}
export interface Tag {
  tag_id: string;
  name: string;
  slug: string;
}

let cached: ContentExport | undefined;

/** Content exported from the workbook by `npm run export`. Server-side (build time) only. */
export function getContent(): ContentExport {
  if (!cached) {
    const file = resolve(process.cwd(), "generated/content.json");
    try {
      cached = JSON.parse(readFileSync(file, "utf-8")) as ContentExport;
    } catch {
      throw new Error(`Cannot read ${file}. Run "npm run export" first (npm run build does this for you).`);
    }
  }
  return cached;
}

function sheet<T>(name: string): T[] {
  return (getContent().sheets[name] ?? []) as unknown as T[];
}

export function getSetting(key: string): string {
  const row = sheet<{ setting_key: string; setting_value: string }>("site_settings").find((r) => r.setting_key === key);
  if (!row) throw new Error(`Missing site setting '${key}'`);
  return String(row.setting_value);
}

/** A site setting that may be absent or empty (older workbooks do not have every optional key). */
export function getOptionalSetting(key: string): string {
  const row = sheet<{ setting_key: string; setting_value: string }>("site_settings").find((r) => r.setting_key === key);
  return row ? String(row.setting_value ?? "").trim() : "";
}

/**
 * The GA4 Measurement ID, or "" when analytics is off. The NEXT_PUBLIC_ANALYTICS_ID environment value wins over the
 * `analytics_measurement_id` setting, which lets a test build switch analytics on without touching the workbook.
 */
export const getMeasurementId = (): string => (process.env.NEXT_PUBLIC_ANALYTICS_ID || getOptionalSetting("analytics_measurement_id")).trim();

/** Everything the pages need to decide whether and where to show ads. */
export function getAdConfig(): AdConfig {
  return {
    adsEnabled: getOptionalSetting("ads_enabled") === "true",
    publisherId: getOptionalSetting("adsense_publisher_id"),
    placements: (getContent().sheets.advertisements ?? []).map((r) => ({ placement_key: String(r.placement_key), page_type: String(r.page_type), enabled: r.enabled === true, ad_unit_id: String(r.ad_unit_id ?? "") })),
  };
}

/** Enabled navigation links for a menu location. Links to pages that are not published are left out. */
export function getNavigation(location: "header" | "footer" | "footer_legal"): { label: string; url: string }[] {
  const unpublished = new Set(sheet<Page>("pages").filter((p) => p.status !== "published").map((p) => `/${p.slug}`));
  return sheet<{ label: string; url: string; location: string; enabled: boolean }>("navigation")
    .filter((n) => n.location === location && n.enabled && !unpublished.has(n.url.replace(/\/$/, "")))
    .map((n) => ({ label: n.label, url: n.url }));
}

// Tools

export const getToolCategories = (): ToolCategory[] => sheet<ToolCategory>("tool_categories").filter((c) => c.enabled);
export const getPublishedTools = (): Tool[] => sheet<Tool>("tools").filter((t) => t.status === "published");
export const getToolsInCategory = (categoryId: string): Tool[] => getPublishedTools().filter((t) => t.category_id === categoryId);
export const getFeaturedTools = (): Tool[] => getPublishedTools().filter((t) => t.featured);
export const getToolCategory = (id: string): ToolCategory | undefined => getToolCategories().find((c) => c.category_id === id);
export const getToolCategoryBySlug = (slug: string): ToolCategory | undefined => getToolCategories().find((c) => c.slug === slug);

export function getToolBySlug(categorySlug: string, toolSlug: string): { tool: Tool; category: ToolCategory } | undefined {
  const category = getToolCategoryBySlug(categorySlug);
  const tool = category && getToolsInCategory(category.category_id).find((t) => t.slug === toolSlug);
  return category && tool ? { tool, category } : undefined;
}

export function getToolContent(toolId: string): ToolContent {
  return parseToolContent(sheet("tool_settings"), toolId);
}

export function getRelatedTools(tool: Tool, chosenIds: string[]): { tool: Tool; category: ToolCategory }[] {
  return pickRelated(tool, chosenIds, getPublishedTools()).flatMap((t) => {
    const category = getToolCategory(t.category_id);
    return category ? [{ tool: t, category }] : [];
  });
}

/** Published articles that a tool lists as guides, in the order given. */
export function getGuidesForTool(toolId: string): Post[] {
  const published = getPublishedPosts();
  return getToolContent(toolId)
    .guides.map((id) => published.find((p) => p.post_id === id))
    .filter((p): p is Post => p !== undefined);
}

/** Published tools whose guides include this article. */
export function getToolsForPost(postId: string): { tool: Tool; category: ToolCategory }[] {
  return getPublishedTools().flatMap((tool) => {
    const category = getToolCategory(tool.category_id);
    return category && getToolContent(tool.tool_id).guides.includes(postId) ? [{ tool, category }] : [];
  });
}

export function getRelatedPosts(post: Post): Post[] {
  const rows = sheet<{ post_id: string; tag_id: string }>("post_tags");
  const tagsByPost = new Map<string, Set<string>>();
  for (const r of rows) tagsByPost.set(r.post_id, (tagsByPost.get(r.post_id) ?? new Set()).add(r.tag_id));
  return pickRelatedPosts(post, tagsByPost, getPublishedPosts());
}

// Static pages

export const getPublishedPages = (): Page[] => sheet<Page>("pages").filter((p) => p.status === "published");
export const getPageBySlug = (slug: string): Page | undefined => getPublishedPages().find((p) => p.slug === slug);

// Blog

export const getPublishedPosts = (): Post[] => sheet<Post>("posts").filter((p) => p.status === "published");
/** Posts that get their own page: published and archived, plus drafts in a draft-preview build. */
export const getPostsWithPages = (): Post[] => sheet<Post>("posts").filter((p) => hasOwnPage(p.status, process.env.OEWER_PREVIEW_DRAFTS === "1"));
export const getPostBySlug = (slug: string): Post | undefined => getPostsWithPages().find((p) => p.slug === slug);
export const getPostBlocks = (postId: string): PostBlock[] =>
  sheet<PostBlock>("post_blocks")
    .filter((b) => b.post_id === postId)
    .sort((a, b) => a.sort_order - b.sort_order);
/** Minutes to read a published post, from its blocks. */
export const getPostReadingMinutes = (postId: string): number => readingMinutes(getPostBlocks(postId).map((b) => b.content).join(" "));
export const getAuthors = (): Author[] => sheet<Author>("authors");
/** Author pages are addressed by a slug made from the display name. */
export const authorSlug = (author: Author): string => slugify(author.display_name);
export const getAuthorBySlug = (slug: string): Author | undefined => getAuthors().find((a) => authorSlug(a) === slug);
export const getPostsByAuthor = (authorId: string): Post[] => getPublishedPosts().filter((p) => p.author_id === authorId);

export const getTagBySlug = (slug: string): Tag | undefined => sheet<Tag>("tags").find((t) => t.slug === slug);
export const getPostsByTag = (tagId: string): Post[] => {
  const ids = new Set(sheet<{ post_id: string; tag_id: string }>("post_tags").filter((r) => r.tag_id === tagId).map((r) => r.post_id));
  return getPublishedPosts().filter((p) => ids.has(p.post_id));
};
/** Tags used by at least one published article. */
export const getTagsInUse = (): Tag[] => sheet<Tag>("tags").filter((t) => getPostsByTag(t.tag_id).length > 0);
export const getAuthor = (id: string): Author | undefined => sheet<Author>("authors").find((a) => a.author_id === id);
export const getBlogCategories = (): BlogCategory[] => sheet<BlogCategory>("blog_categories");
export const getBlogCategory = (id: string): BlogCategory | undefined => getBlogCategories().find((c) => c.category_id === id);
export const getBlogCategoryBySlug = (slug: string): BlogCategory | undefined => getBlogCategories().find((c) => c.slug === slug);
export const getPostsInCategory = (categoryId: string): Post[] => getPublishedPosts().filter((p) => p.category_id === categoryId);

export function getPostTags(postId: string): Tag[] {
  const tagIds = new Set(sheet<{ post_id: string; tag_id: string }>("post_tags").filter((r) => r.post_id === postId).map((r) => r.tag_id));
  return sheet<Tag>("tags").filter((t) => tagIds.has(t.tag_id));
}
