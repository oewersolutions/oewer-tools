import type { ContentExport } from "./workbook/export";

export interface SearchItem {
  title: string;
  description: string;
  /** Site-relative URL, without any base path. */
  url: string;
  type: "Tool" | "Article";
}

export const toolUrl = (categorySlug: string, slug: string) => `/tools/${categorySlug}/${slug}/`;
export const postUrl = (slug: string) => `/blog/${slug}/`;

/** Published tools and articles that visitors can find through search. */
export function buildSearchItems(content: ContentExport): SearchItem[] {
  const { tool_categories, tools, posts } = content.sheets;
  const categorySlugs = new Map((tool_categories ?? []).map((c) => [c.category_id, String(c.slug)]));

  const toolItems = (tools ?? [])
    .filter((t) => t.status === "published" && categorySlugs.has(t.category_id))
    .map((t): SearchItem => ({
      title: String(t.name),
      description: String(t.description),
      url: toolUrl(categorySlugs.get(t.category_id)!, String(t.slug)),
      type: "Tool",
    }));

  const postItems = (posts ?? [])
    .filter((p) => p.status === "published")
    .map((p): SearchItem => ({
      title: String(p.title),
      description: String(p.excerpt),
      url: postUrl(String(p.slug)),
      type: "Article",
    }));

  return [...toolItems, ...postItems];
}

/** Every word of the query must appear in the title or description. Title matches rank first. */
export function searchItems(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const description = item.description.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (title.startsWith(word)) score += 3;
        else if (title.includes(word)) score += 2;
        else if (description.includes(word)) score += 1;
        else return { item, score: 0 };
      }
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((r) => r.item);
}
