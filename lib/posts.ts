/** Article helpers: heading anchors, the outline, structured data and image-file checks. Pure, so they are unit tested. */

import { parseMarkdown } from "./markdown";

export interface BlockLike {
  block_id: string;
  block_type: string;
  content: string;
  asset_path: string;
}

/** "Café & crème" -> "cafe-creme". Empty when nothing usable is left. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "How the EMI formula works!" -> "how-the-emi-formula-works". Duplicates get -2, -3. */
export function headingId(text: string, used: Set<string>): string {
  const base = slugify(text) || "section";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export type PostStatus = "draft" | "published" | "archived";

/**
 * Which posts get a page of their own.
 * - published: always, and listed everywhere.
 * - archived: keeps its page so old links still work, but is not listed anywhere and is kept out of search engines.
 * - draft: no page, except in a test build with OEWER_PREVIEW_DRAFTS=1.
 */
export function hasOwnPage(status: string, previewDrafts: boolean): boolean {
  return (
    status === "published" ||
    status === "archived" ||
    (status === "draft" && previewDrafts)
  );
}

/** Notice shown at the top of an article that is not published, or null for a published one. */
export function statusNotice(
  status: string,
): { title: string; text: string } | null {
  if (status === "archived")
    return {
      title: "Archived article",
      text: "This article is no longer updated and may be out of date.",
    };
  if (status === "draft")
    return {
      title: "Draft preview",
      text: "This article is not published yet. Only people with a preview build can see it.",
    };
  return null;
}

/** Tag pages with fewer articles than this are thin, so they are kept out of search engines and the sitemap. */
export const MIN_POSTS_FOR_INDEXED_TAG = 2;

export interface RelatablePost {
  post_id: string;
  category_id: string;
  published_at: string | null;
}

/**
 * Articles to suggest after `post`: most shared tags first, then the same category, then newest.
 * Only articles in `candidates` are considered (pass published ones), and never the post itself.
 */
export function pickRelatedPosts<T extends RelatablePost>(
  post: T,
  tagsByPost: Map<string, Set<string>>,
  candidates: T[],
  limit = 3,
): T[] {
  const mine = tagsByPost.get(post.post_id) ?? new Set<string>();
  const shared = (p: T) =>
    [...(tagsByPost.get(p.post_id) ?? [])].filter((t) => mine.has(t)).length;
  return candidates
    .filter((p) => p.post_id !== post.post_id)
    .map((p) => ({
      p,
      shared: shared(p),
      sameCategory: p.category_id === post.category_id,
    }))
    .filter((x) => x.shared > 0 || x.sameCategory)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        Number(b.sameCategory) - Number(a.sameCategory) ||
        String(b.p.published_at).localeCompare(String(a.p.published_at)) ||
        a.p.post_id.localeCompare(b.p.post_id),
    )
    .slice(0, limit)
    .map((x) => x.p);
}

export interface OutlineItem {
  blockId: string;
  id: string;
  text: string;
}

/** Heading blocks with stable anchor ids, in reading order. */
export function buildOutline(blocks: BlockLike[]): OutlineItem[] {
  const used = new Set<string>();
  return blocks
    .filter((b) => b.block_type === "heading")
    .map((b) => ({
      blockId: b.block_id,
      id: headingId(b.content, used),
      text: b.content,
    }));
}

/** Image files that blocks refer to but that do not exist. `exists` takes a site path such as "/assets/photo.jpg". */
export function missingImageFiles(
  blocks: BlockLike[],
  exists: (path: string) => boolean,
): string[] {
  return [
    ...new Set(
      blocks
        .filter(
          (b) =>
            b.block_type === "image" &&
            b.asset_path !== "" &&
            !exists(b.asset_path),
        )
        .map((b) => b.asset_path),
    ),
  ];
}

export interface ArticleLd {
  title: string;
  description: string;
  url: string;
  published: string | null;
  modified: string;
  authorName?: string;
  publisherName: string;
  /** Absolute address of the cover picture. */
  image?: string;
}

/** schema.org Article data, as a string that is safe to place inside a script tag. */
export function articleJsonLd(a: ArticleLd): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: a.url,
    ...(a.published ? { datePublished: a.published } : {}),
    dateModified: a.modified,
    ...(a.image ? { image: a.image } : {}),
    ...(a.authorName
      ? { author: { "@type": "Person", name: a.authorName } }
      : {}),
    publisher: { "@type": "Organization", name: a.publisherName },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The top-level headings of a page written in the restricted Markdown, with the anchors `Prose` gives them. */
export function pageOutline(source: string): { id: string; text: string }[] {
  const used = new Set<string>();
  return parseMarkdown(source)
    .filter((b): b is Extract<ReturnType<typeof parseMarkdown>[number], { type: "heading" }> => b.type === "heading" && b.level === 1)
    .map((b) => ({ id: headingId(b.text, used), text: b.text }));
}
