import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostBody } from "../components/Prose";
import type { PostBlock } from "../lib/content";
import { articleJsonLd, buildOutline, headingId, missingImageFiles } from "../lib/posts";

const block = (type: string, content: string, extra: Partial<PostBlock> = {}, n = 1): PostBlock => ({
  block_id: `BLK0000${n}`,
  post_id: "POST0001",
  sort_order: n,
  block_type: type,
  content,
  asset_path: "",
  ...extra,
});
const render = (blocks: PostBlock[]) => renderToStaticMarkup(createElement(PostBody, { blocks }));

describe("headingId", () => {
  it("makes URL-safe ids and de-duplicates", () => {
    const used = new Set<string>();
    expect(headingId("The EMI formula!", used)).toBe("the-emi-formula");
    expect(headingId("The EMI formula", used)).toBe("the-emi-formula-2");
    expect(headingId("Café & crème", used)).toBe("cafe-creme");
    expect(headingId("???", used)).toBe("section");
  });
});

describe("buildOutline", () => {
  it("lists only headings, in order", () => {
    const blocks = [block("paragraph", "x", {}, 1), block("heading", "One", {}, 2), block("heading", "Two", {}, 3)];
    expect(buildOutline(blocks).map((h) => h.id)).toEqual(["one", "two"]);
  });
});

describe("PostBody", () => {
  it("renders every block type as elements", () => {
    const html = render([
      block("heading", "A title", {}, 1),
      block("paragraph", "Some **bold** text", {}, 2),
      block("list", "One\nTwo", {}, 3),
      block("quote", "Wise words", {}, 4),
      block("code", "const a = 1;", {}, 5),
      block("callout", "Heads up", {}, 6),
      block("image", "A chart", { asset_path: "/assets/chart.png" }, 7),
    ]);
    expect(html).toContain('<h2 id="a-title"');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>One</li>");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<pre");
    expect(html).toContain("<aside");
    expect(html).toContain('alt="A chart"');
    expect(html).toContain('src="/assets/chart.png"');
    expect(html).toContain('loading="lazy"');
  });

  it("escapes HTML in content instead of rendering it", () => {
    const html = render([block("paragraph", "<script>alert(1)</script>", {}, 1), block("heading", "<img src=x onerror=alert(1)>", {}, 2), block("code", "<b>x</b>", {}, 3)]);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("drops unsafe links but keeps the text", () => {
    const html = render([block("paragraph", "[click](javascript:alert(1)) and [ok](https://example.com)", {}, 1)]);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("click");
  });

  it("treats an unknown block type as a paragraph", () => {
    expect(render([block("mystery", "Still shown", {}, 1)])).toContain("<p>Still shown</p>");
  });
});

describe("missingImageFiles", () => {
  const blocks = [
    block("image", "a", { asset_path: "/assets/a.png" }, 1),
    block("image", "b", { asset_path: "/assets/b.png" }, 2),
    block("image", "b again", { asset_path: "/assets/b.png" }, 3),
    block("paragraph", "text", {}, 4),
  ];
  it("lists each missing file once", () => {
    expect(missingImageFiles(blocks, (p) => p === "/assets/a.png")).toEqual(["/assets/b.png"]);
    expect(missingImageFiles(blocks, () => true)).toEqual([]);
  });
});

describe("articleJsonLd", () => {
  const base = { title: "T", description: "D", url: "https://a.com/blog/t/", published: "2026-10-01T09:00:00Z", modified: "2026-10-02T09:00:00Z", publisherName: "OEWER" };
  it("describes the article", () => {
    const data = JSON.parse(articleJsonLd({ ...base, authorName: "Ann" }));
    expect(data["@type"]).toBe("Article");
    expect(data.author.name).toBe("Ann");
    expect(data.datePublished).toBe("2026-10-01T09:00:00Z");
  });
  it("omits the author and date when unknown, and cannot close the script tag", () => {
    const json = articleJsonLd({ ...base, title: "</script><b>", published: null });
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).headline).toBe("</script><b>");
    expect(JSON.parse(json).author).toBeUndefined();
    expect(JSON.parse(json).datePublished).toBeUndefined();
  });
});

describe("pictures in an article", () => {
  const withImage = block("image", "A chart of interest over time", { asset_path: "/images/blog/a/chart-1600.jpg", caption: "Interest grows faster each year.", image: { width: 1600, height: 900, srcSet: "/images/blog/a/chart-800.jpg 800w, /images/blog/a/chart-1600.jpg 1600w" } });

  it("shows the picture with its size, smaller versions, lazy loading, alt text and caption", () => {
    const html = render([withImage]);
    expect(html).toContain('<figure');
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="900"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="A chart of interest over time"');
    expect(html).toContain('srcSet="/images/blog/a/chart-800.jpg 800w, /images/blog/a/chart-1600.jpg 1600w"');
    expect(html).toContain("<figcaption");
    expect(html).toContain("Interest grows faster each year.");
  });
  it("still works for a picture that has no size information (the admin preview)", () => {
    const html = render([block("image", "Alt text", { asset_path: "/images/blog/a/p.png" })]);
    expect(html).toContain('src="/images/blog/a/p.png"');
    expect(html).not.toContain("srcSet");
    expect(html).not.toContain("figcaption");
  });
  it("puts the cover in the structured data when there is one", () => {
    const base = { title: "T", description: "D", url: "https://x.test/blog/t/", published: null, modified: "2026-10-30T00:00:00Z", publisherName: "P" };
    expect(JSON.parse(articleJsonLd({ ...base, image: "https://x.test/images/c.jpg" })).image).toBe("https://x.test/images/c.jpg");
    expect(JSON.parse(articleJsonLd(base)).image).toBeUndefined();
  });
});
