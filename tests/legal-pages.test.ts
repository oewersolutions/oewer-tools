import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMarkdown, parseInline } from "../lib/markdown";
import { checkWorkbook } from "../lib/workbook";
import type { WorkbookData } from "../lib/workbook";

// A launch guard on the real workbook: the legal and contact pages must be real, published and consistent.
const EMAIL = "oewersolutions@gmail.com";
let data: WorkbookData;
const load = async () => {
  if (data) return data;
  const bytes = new Uint8Array(await readFile("data/oewer_database.xlsx"));
  const result = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.length);
  expect(result.issues).toEqual([]);
  return (data = result.data!);
};
const page = async (slug: string) => (await load()).pages!.find((p) => p.values.slug === slug)!.values;
const setting = async (key: string) => String((await load()).site_settings!.find((r) => r.values.setting_key === key)?.values.setting_value);

describe("legal and contact pages", () => {
  it("the contact email is the real one everywhere", async () => {
    expect(await setting("contact_email")).toBe(EMAIL);
    for (const slug of ["contact", "privacy-policy", "terms"]) expect(String((await page(slug)).content), slug).toContain(EMAIL);
    for (const p of (await load()).pages!) expect(String(p.values.content), String(p.values.slug)).not.toMatch(/example\.com/);
  });
  it("privacy, terms, contact and about are published, with no placeholder text left", async () => {
    for (const slug of ["about", "contact", "privacy-policy", "terms"]) {
      const p = await page(slug);
      expect(p.status, slug).toBe("published");
      expect(String(p.content), slug).not.toMatch(/placeholder|lorem ipsum|TODO|TBD|\[.*insert.*\]/i);
      expect(String(p.content).length, slug).toBeGreaterThan(400);
    }
  });
  it("the privacy policy describes what the site really does", async () => {
    const text = String((await page("privacy-policy")).content);
    for (const topic of [/never uploaded/i, /Google Analytics/, /Allow analytics/, /Decline/, /Analytics settings/, /AdSense/, /GitHub Pages/, /cookies/i, /delete/i, /Last updated/]) expect(text).toMatch(topic);
  });
  it("the terms say results are not advice and link to the privacy policy", async () => {
    const text = String((await page("terms")).content);
    expect(text).toMatch(/not financial, tax, legal or professional advice/);
    expect(text).toContain("](/privacy-policy)");
  });
  it("every link in these pages is one the site will render as a link", async () => {
    for (const slug of ["contact", "privacy-policy", "terms"]) {
      const inline = parseMarkdown(String((await page(slug)).content)).flatMap((b) => (b.type === "paragraph" ? parseInline(b.text) : b.type === "list" ? b.items.flatMap(parseInline) : []));
      const links = inline.filter((i) => i.type === "link");
      expect(links.length, slug).toBeGreaterThan(0);
      const raw = String((await page(slug)).content).match(/\]\(([^)]+)\)/g)!.length;
      expect(links.length, `${slug}: a link was dropped as unsafe`).toBe(raw);
    }
  });
});

describe("mailto links in text", () => {
  const first = (s: string) => parseInline(s)[0]!;
  it("keeps a plain email link", () => {
    expect(first("[Mail us](mailto:a@b.co)")).toEqual({ type: "link", text: "Mail us", href: "mailto:a@b.co" });
  });
  it("drops mailto links that carry extras or are malformed", () => {
    for (const bad of ["mailto:a@b.co?subject=x", "mailto:a@b", "mailto:", "mailto:a@b.co&cc=x@y.zz", "javascript:alert(1)"]) {
      expect(first(`[x](${bad})`).type, bad).toBe("text");
    }
  });
});
