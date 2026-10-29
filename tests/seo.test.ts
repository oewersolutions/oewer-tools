import { describe, expect, it } from "vitest";
import { absoluteUrl, activeRedirects, buildRobotsTxt, buildSitemapEntries, redirectFile, redirectHtml, redirectTargetUrl } from "../lib/seo";
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
