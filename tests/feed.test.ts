import { describe, expect, it } from "vitest";
import { buildRss } from "../lib/feed";
import { slugify } from "../lib/posts";

const site = { title: "OEWER & Co", url: "https://a.com/", description: "Tools", feedUrl: "https://a.com/feed.xml" };

describe("buildRss", () => {
  it("lists articles with dates and escapes text", () => {
    const xml = buildRss(site, [{ title: "A <b> & B", url: "https://a.com/blog/x/", description: 'He said "hi"', published: "2026-10-01T09:00:00Z", category: "Guides" }]);
    expect(xml).toContain("<title>OEWER &amp; Co</title>");
    expect(xml).toContain("<title>A &lt;b&gt; &amp; B</title>");
    expect(xml).toContain("&quot;hi&quot;");
    expect(xml).toContain("<pubDate>Thu, 01 Oct 2026 09:00:00 GMT</pubDate>");
    expect(xml).toContain("<category>Guides</category>");
    expect(xml).toContain('rel="self"');
  });
  it("is valid with no articles", () => {
    expect(buildRss(site, [])).toContain("</channel></rss>");
  });
});

describe("slugify", () => {
  it("makes lowercase hyphenated ASCII", () => {
    expect(slugify("OEWER Team")).toBe("oewer-team");
    expect(slugify("  Café  &  crème ")).toBe("cafe-creme");
    expect(slugify("!!!")).toBe("");
  });
});
