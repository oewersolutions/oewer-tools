import { MIN_POSTS_FOR_INDEXED_TAG, slugify } from "./posts";
import type { ContentExport } from "./workbook/export";

export type SeoEntityType = "page" | "tool_category" | "tool" | "post" | "blog_category";

export interface SeoOverride {
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  noindex: boolean;
}

export interface SitemapEntry {
  /** Site-relative path with a trailing slash, without any base path. */
  path: string;
  lastModified?: string;
}

export interface RedirectRule {
  source: string;
  target: string;
  status: string;
}

const trimSlashes = (s: string) => s.replace(/\/+$/, "");

/** Absolute URL for a site path, honouring the site URL and the GitHub Pages base path. */
export function absoluteUrl(siteUrl: string, basePath: string, path: string): string {
  return `${trimSlashes(siteUrl)}${trimSlashes(basePath)}${path.startsWith("/") ? path : `/${path}`}`;
}

export function seoOverrides(content: ContentExport): Map<string, SeoOverride> {
  const map = new Map<string, SeoOverride>();
  for (const r of content.sheets.seo_metadata ?? []) {
    map.set(`${r.entity_type}:${r.entity_id}`, {
      meta_title: String(r.meta_title),
      meta_description: String(r.meta_description),
      canonical_url: String(r.canonical_url ?? ""),
      noindex: r.noindex === true,
    });
  }
  return map;
}

/** Every public page the build generates, with `noindex` pages left out. */
export function buildSitemapEntries(content: ContentExport): SitemapEntry[] {
  const { sheets } = content;
  const seo = seoOverrides(content);
  const indexed = (type: SeoEntityType, id: unknown) => !seo.get(`${type}:${id}`)?.noindex;
  const entries: SitemapEntry[] = [{ path: "/" }, { path: "/tools/" }];

  const categories = (sheets.tool_categories ?? []).filter((c) => c.enabled === true);
  const published = (sheets.tools ?? []).filter((t) => t.status === "published");
  for (const c of categories) {
    if (indexed("tool_category", c.category_id)) entries.push({ path: `/tools/${c.slug}/` });
    for (const t of published.filter((t) => t.category_id === c.category_id)) {
      if (indexed("tool", t.tool_id)) entries.push({ path: `/tools/${c.slug}/${t.slug}/` });
    }
  }

  const posts = (sheets.posts ?? []).filter((p) => p.status === "published");
  if (posts.length > 0) entries.push({ path: "/blog/" });
  for (const cat of sheets.blog_categories ?? []) {
    if (posts.some((p) => p.category_id === cat.category_id) && indexed("blog_category", cat.category_id)) {
      entries.push({ path: `/blog/category/${cat.slug}/` });
    }
  }
  for (const p of posts) {
    if (indexed("post", p.post_id)) entries.push({ path: `/blog/${p.slug}/`, lastModified: dateOnly(p.updated_at) });
  }

  // Tag pages with enough articles, and author pages with at least one.
  const postsByTag = new Map<string, number>();
  const publishedIds = new Set(posts.map((p) => p.post_id));
  for (const pt of sheets.post_tags ?? []) {
    if (publishedIds.has(String(pt.post_id))) postsByTag.set(String(pt.tag_id), (postsByTag.get(String(pt.tag_id)) ?? 0) + 1);
  }
  for (const tag of sheets.tags ?? []) {
    if ((postsByTag.get(String(tag.tag_id)) ?? 0) >= MIN_POSTS_FOR_INDEXED_TAG) entries.push({ path: `/blog/tag/${tag.slug}/` });
  }
  for (const author of sheets.authors ?? []) {
    if (posts.some((p) => p.author_id === author.author_id)) entries.push({ path: `/blog/author/${slugify(String(author.display_name))}/` });
  }

  for (const page of (sheets.pages ?? []).filter((p) => p.status === "published")) {
    if (indexed("page", page.page_id)) entries.push({ path: `/${page.slug}/`, lastModified: dateOnly(page.updated_at) });
  }
  return entries;
}

function dateOnly(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
}

export function buildRobotsTxt(siteUrl: string, basePath: string): string {
  return `User-agent: *\nAllow: /\nDisallow: ${trimSlashes(basePath)}/admin/\n\nSitemap: ${absoluteUrl(siteUrl, basePath, "/sitemap.xml")}\n`;
}

/** Enabled redirects from the `redirects` sheet. */
export function activeRedirects(content: ContentExport): RedirectRule[] {
  return (content.sheets.redirects ?? [])
    .filter((r) => r.enabled === true)
    .map((r) => ({ source: String(r.source_path), target: String(r.target_path), status: String(r.redirect_type) }));
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * A static page that sends visitors (and search engines, via the canonical link) to the new address.
 * GitHub Pages cannot send real 301s, so this is the closest static equivalent.
 */
export function redirectHtml(targetUrl: string): string {
  const url = escapeHtml(targetUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<p>This page has moved. <a href="${url}">Continue to the new address</a>.</p>
</body>
</html>
`;
}

/** Output file for a redirect source such as "/old-page", relative to the export folder. */
export function redirectFile(source: string): string {
  return `${source.replace(/^\/+|\/+$/g, "")}/index.html`;
}

/** Where a redirect target points: absolute https URLs are kept, site paths get the base path. */
export function redirectTargetUrl(target: string, basePath: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  const path = target.startsWith("/") ? target : `/${target}`;
  return `${trimSlashes(basePath)}${path.endsWith("/") || path.includes(".") || path.includes("#") ? path : `${path}/`}`;
}
