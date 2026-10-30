import { describe, expect, it } from "vitest";
import { hasOwnPage, statusNotice } from "../lib/posts";
import { buildSearchItems } from "../lib/search";
import { buildSitemapEntries } from "../lib/seo";
import type { ContentExport } from "../lib/workbook/export";

describe("hasOwnPage", () => {
  it("builds published and archived posts", () => {
    expect(hasOwnPage("published", false)).toBe(true);
    expect(hasOwnPage("archived", false)).toBe(true);
  });
  it("builds drafts only in a draft-preview build", () => {
    expect(hasOwnPage("draft", false)).toBe(false);
    expect(hasOwnPage("draft", true)).toBe(true);
  });
  it("never builds an unknown status", () => {
    expect(hasOwnPage("deleted", true)).toBe(false);
  });
});

describe("statusNotice", () => {
  it("is empty for published and explains archived and draft posts", () => {
    expect(statusNotice("published")).toBeNull();
    expect(statusNotice("archived")?.title).toBe("Archived article");
    expect(statusNotice("draft")?.title).toBe("Draft preview");
  });
});

describe("draft and archived posts stay out of listings", () => {
  const post = (id: string, status: string) => ({
    post_id: id,
    slug: id.toLowerCase(),
    title: id,
    excerpt: "e",
    status,
    category_id: "BCAT0001",
    author_id: "AUTH0001",
    published_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
  });
  const content = {
    schema_version: "1.0.1",
    content_hash: "x",
    sheets: {
      tool_categories: [],
      tools: [],
      pages: [],
      tags: [{ tag_id: "TAG0001", slug: "t" }],
      authors: [{ author_id: "AUTH0001", display_name: "A" }],
      blog_categories: [{ category_id: "BCAT0001", slug: "c" }],
      posts: [post("POST0001", "published"), post("POST0002", "draft"), post("POST0003", "archived")],
      post_tags: [
        { post_id: "POST0001", tag_id: "TAG0001" },
        { post_id: "POST0002", tag_id: "TAG0001" },
        { post_id: "POST0003", tag_id: "TAG0001" },
      ],
      seo_metadata: [],
    },
  } as unknown as ContentExport;

  it("lists only published posts in the sitemap", () => {
    const paths = buildSitemapEntries(content).map((e) => e.path);
    expect(paths).toContain("/blog/post0001/");
    expect(paths).not.toContain("/blog/post0002/");
    expect(paths).not.toContain("/blog/post0003/");
  });
  it("does not count them toward tag pages", () => {
    expect(buildSitemapEntries(content).map((e) => e.path)).not.toContain("/blog/tag/t/");
  });
  it("lists only published posts in search", () => {
    expect(buildSearchItems(content).map((i) => i.url)).toEqual(["/blog/post0001/"]);
  });
});
