import { describe, expect, it } from "vitest";
import { absoluteUrl, activeRedirects, buildRobotsTxt, buildSitemapEntries, fitDescription, redirectFile, redirectHtml, redirectTargetUrl, summarize } from "../lib/seo";
import type { ContentExport } from "../lib/workbook/export";

const content = {
  schema_version: "1.0.0",
  content_hash: "x",
  sheets: {
    tool_categories: [{ category_id: "TCAT0001", slug: "finance", enabled: true }, { category_id: "TCAT0002", slug: "off", enabled: false }],
    tools: [
      { tool_id: "TOOL0001", category_id: "TCAT0001", slug: "emi", status: "published" },
      { tool_id: "TOOL0002", category_id: "TCAT0001", slug: "gst", status: "draft" },
      { tool_id: "TOOL0003", category_id: "TCAT0001", slug: "hidden", status: "published" },
    ],
    blog_categories: [{ category_id: "BCAT0001", slug: "guides" }, { category_id: "BCAT0002", slug: "empty" }],
    posts: [{ post_id: "POST0001", slug: "hello", status: "published", category_id: "BCAT0001", updated_at: "2026-03-04T10:00:00Z" }],
    pages: [
      { page_id: "PAGE0001", slug: "about", status: "published", updated_at: "2026-01-02T00:00:00Z" },
      { page_id: "PAGE0002", slug: "terms", status: "draft", updated_at: "" },
    ],
    seo_metadata: [{ entity_type: "tool", entity_id: "TOOL0003", meta_title: "t", meta_description: "d", canonical_url: "", noindex: true }],
    redirects: [
      { source_path: "/old", target_path: "/tools/finance/emi", redirect_type: "301", enabled: true },
      { source_path: "/off", target_path: "/x", redirect_type: "301", enabled: false },
    ],
  },
} as unknown as ContentExport;

describe("sitemap", () => {
  it("lists only published, indexable pages", () => {
    expect(buildSitemapEntries(content).map((e) => e.path)).toEqual([
      "/", "/tools/", "/tools/finance/", "/tools/finance/emi/", "/blog/", "/blog/category/guides/", "/blog/hello/", "/about/",
    ]);
  });
  it("adds a date-only lastmod where known", () => {
    expect(buildSitemapEntries(content).find((e) => e.path === "/blog/hello/")?.lastModified).toBe("2026-03-04");
  });
});

describe("urls", () => {
  it("joins site url, base path and path", () => {
    expect(absoluteUrl("https://a.com/", "/repo", "/tools/")).toBe("https://a.com/repo/tools/");
    expect(absoluteUrl("https://a.com", "", "/")).toBe("https://a.com/");
  });
  it("points robots.txt at the sitemap", () => {
    expect(buildRobotsTxt("https://a.com", "")).toContain("Sitemap: https://a.com/sitemap.xml");
    expect(buildRobotsTxt("https://a.com", "/repo")).toContain("Disallow: /repo/admin/");
  });
});

describe("redirects", () => {
  it("uses enabled rows only", () => {
    expect(activeRedirects(content)).toEqual([{ source: "/old", target: "/tools/finance/emi", status: "301" }]);
  });
  it("maps targets and files", () => {
    expect(redirectTargetUrl("/tools/finance/emi", "/repo")).toBe("/repo/tools/finance/emi/");
    expect(redirectTargetUrl("https://b.com/x", "/repo")).toBe("https://b.com/x");
    expect(redirectFile("/old/page/")).toBe("old/page/index.html");
  });
  it("escapes the target in the page", () => {
    const html = redirectHtml('https://b.com/?a="x"&b=<1>');
    expect(html).toContain("&quot;x&quot;");
    expect(html).not.toContain("<1>");
    expect(html).toContain('name="robots" content="noindex"');
  });
});

describe("sitemap: blog tags and authors", () => {
  const blog = {
    ...content,
    sheets: {
      ...content.sheets,
      authors: [
        { author_id: "AUTH0001", display_name: "OEWER Team" },
        { author_id: "AUTH0002", display_name: "No Posts" },
      ],
      posts: [
        { post_id: "POST0001", slug: "a", status: "published", category_id: "BCAT0001", author_id: "AUTH0001", updated_at: "" },
        { post_id: "POST0002", slug: "b", status: "published", category_id: "BCAT0001", author_id: "AUTH0001", updated_at: "" },
        { post_id: "POST0003", slug: "c", status: "draft", category_id: "BCAT0001", author_id: "AUTH0001", updated_at: "" },
      ],
      tags: [
        { tag_id: "TAG0001", slug: "popular" },
        { tag_id: "TAG0002", slug: "thin" },
        { tag_id: "TAG0003", slug: "draft-only" },
      ],
      post_tags: [
        { post_id: "POST0001", tag_id: "TAG0001" },
        { post_id: "POST0002", tag_id: "TAG0001" },
        { post_id: "POST0001", tag_id: "TAG0002" },
        { post_id: "POST0003", tag_id: "TAG0003" },
        { post_id: "POST0003", tag_id: "TAG0001" },
      ],
    },
  } as unknown as ContentExport;
  const paths = buildSitemapEntries(blog).map((e) => e.path);

  it("lists tags with at least two published articles, not thin or draft-only ones", () => {
    expect(paths).toContain("/blog/tag/popular/");
    expect(paths).not.toContain("/blog/tag/thin/");
    expect(paths).not.toContain("/blog/tag/draft-only/");
  });
  it("lists authors with a published article", () => {
    expect(paths).toContain("/blog/author/oewer-team/");
    expect(paths).not.toContain("/blog/author/no-posts/");
  });
});

describe("fitDescription and summarize", () => {
  const extra = "Free online tools that respect your privacy. Runs in your browser.";
  it("keeps a description of a good length as it is", () => {
    const text = "Work out the monthly EMI, total interest and total payment for any loan, free and in your browser.";
    expect(fitDescription(text, extra)).toBe(text);
  });
  it("adds to a thin one and fills in a missing one", () => {
    expect(fitDescription("Convert images between JPG, PNG and WebP.", extra)).toBe(`Convert images between JPG, PNG and WebP. ${extra}`);
    expect(fitDescription("", extra)).toBe(extra);
    expect(fitDescription("  Short  ", extra)).toBe(`Short. ${extra}`);
  });
  it("cuts a long one at a word and marks it", () => {
    const long = "word ".repeat(60);
    const out = fitDescription(long, extra);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\swor…$/);
  });
  it("always lands between 50 and 160 characters", () => {
    for (const text of ["", "a", "x".repeat(49), "y ".repeat(200)]) {
      const out = fitDescription(text, extra);
      expect(out.length).toBeGreaterThanOrEqual(50);
      expect(out.length).toBeLessThanOrEqual(160);
    }
  });
  it("summarizes the first real paragraph as plain text", () => {
    const md = "Last updated: 30 October 2026\n\n# Heading\n\nWe built **OEWER Tools** to be [private](/privacy) by `design`.\n\n- a list";
    expect(summarize(md)).toBe("We built OEWER Tools to be private by design.");
    expect(summarize("# Only a heading")).toBe("");
  });
});
