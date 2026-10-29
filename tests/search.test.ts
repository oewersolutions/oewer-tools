import { describe, expect, it } from "vitest";
import { buildSearchItems, searchItems, type SearchItem } from "../lib/search";
import type { ContentExport } from "../lib/workbook/export";

const items: SearchItem[] = [
  { title: "EMI Calculator", description: "Monthly loan payment", url: "/tools/finance/emi-calculator/", type: "Tool" },
  { title: "How EMI Is Calculated", description: "The formula behind a loan EMI", url: "/blog/how-emi-is-calculated/", type: "Article" },
  { title: "Word Counter", description: "Count words and characters", url: "/tools/utilities/word-counter/", type: "Tool" },
];

describe("searchItems", () => {
  it("returns nothing for an empty or blank query", () => {
    expect(searchItems(items, "")).toEqual([]);
    expect(searchItems(items, "   ")).toEqual([]);
  });

  it("matches case-insensitively and ranks title-prefix matches first", () => {
    expect(searchItems(items, "emi").map((i) => i.title)).toEqual(["EMI Calculator", "How EMI Is Calculated"]);
  });

  it("requires every word to match", () => {
    expect(searchItems(items, "loan emi").map((i) => i.title)).toEqual(["EMI Calculator", "How EMI Is Calculated"]);
    expect(searchItems(items, "loan counter")).toEqual([]);
  });

  it("matches descriptions and respects the limit", () => {
    expect(searchItems(items, "characters")[0]?.title).toBe("Word Counter");
    expect(searchItems(items, "e", 1)).toHaveLength(1);
  });
});

describe("buildSearchItems", () => {
  const content = {
    schema_version: "1.0.0",
    content_hash: "x",
    sheets: {
      tool_categories: [{ category_id: "TCAT0002", slug: "finance-calculators" }],
      tools: [
        { category_id: "TCAT0002", name: "EMI Calculator", slug: "emi-calculator", description: "d", status: "published" },
        { category_id: "TCAT0002", name: "Draft Tool", slug: "draft-tool", description: "d", status: "draft" },
      ],
      posts: [
        { title: "Live", slug: "live", excerpt: "e", status: "published" },
        { title: "Hidden", slug: "hidden", excerpt: "e", status: "archived" },
      ],
    },
  } as unknown as ContentExport;

  it("includes only published tools and posts, with site-relative URLs", () => {
    expect(buildSearchItems(content).map((i) => [i.type, i.url])).toEqual([
      ["Tool", "/tools/finance-calculators/emi-calculator/"],
      ["Article", "/blog/live/"],
    ]);
  });
});
