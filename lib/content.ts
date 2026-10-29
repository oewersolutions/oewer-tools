import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

// Static pages

export const getPublishedPages = (): Page[] => sheet<Page>("pages").filter((p) => p.status === "published");
export const getPageBySlug = (slug: string): Page | undefined => getPublishedPages().find((p) => p.slug === slug);

// Blog

export const getPublishedPosts = (): Post[] => sheet<Post>("posts").filter((p) => p.status === "published");
export const getPostBySlug = (slug: string): Post | undefined => getPublishedPosts().find((p) => p.slug === slug);
export const getPostBlocks = (postId: string): PostBlock[] =>
  sheet<PostBlock>("post_blocks")
    .filter((b) => b.post_id === postId)
    .sort((a, b) => a.sort_order - b.sort_order);
export const getAuthor = (id: string): Author | undefined => sheet<Author>("authors").find((a) => a.author_id === id);
export const getBlogCategories = (): BlogCategory[] => sheet<BlogCategory>("blog_categories");
export const getBlogCategory = (id: string): BlogCategory | undefined => getBlogCategories().find((c) => c.category_id === id);
export const getBlogCategoryBySlug = (slug: string): BlogCategory | undefined => getBlogCategories().find((c) => c.slug === slug);
export const getPostsInCategory = (categoryId: string): Post[] => getPublishedPosts().filter((p) => p.category_id === categoryId);

export function getPostTags(postId: string): Tag[] {
  const tagIds = new Set(sheet<{ post_id: string; tag_id: string }>("post_tags").filter((r) => r.post_id === postId).map((r) => r.tag_id));
  return sheet<Tag>("tags").filter((t) => tagIds.has(t.tag_id));
}
