import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { builtPaths } from "./pages";

// A launch audit of every built page: search-engine basics, link health and page structure. Accessibility is
// covered by accessibility.spec.ts and speed by performance.spec.ts.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const paths = builtPaths();

interface Facts {
  title: string;
  description: string | null;
  canonical: string | null;
  h1: number;
  headings: number[];
  lang: string | null;
  viewport: boolean;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  imagesWithoutAlt: number;
  insecure: string[];
  unsafeBlank: string[];
  badJsonLd: number;
  internalLinks: string[];
}

async function facts(page: import("@playwright/test").Page): Promise<Facts> {
  return page.evaluate(() => {
    const meta = (selector: string) => document.querySelector<HTMLMetaElement>(selector)?.content ?? null;
    const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    let bad = 0;
    for (const s of jsonLd) {
      try {
        JSON.parse(s.textContent ?? "");
      } catch {
        bad++;
      }
    }
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      h1: document.querySelectorAll("h1").length,
      headings: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => Number(h.tagName[1])),
      lang: document.documentElement.getAttribute("lang"),
      viewport: !!document.querySelector('meta[name="viewport"]'),
      robots: meta('meta[name="robots"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      imagesWithoutAlt: document.querySelectorAll("img:not([alt])").length,
      insecure: Array.from(document.querySelectorAll("[src],[href]")).map((e) => e.getAttribute("src") ?? e.getAttribute("href") ?? "").filter((u) => u.startsWith("http://")),
      unsafeBlank: links.filter((a) => a.target === "_blank" && !/noopener/.test(a.rel)).map((a) => a.href),
      badJsonLd: bad,
      internalLinks: links.map((a) => a.getAttribute("href")!).filter((h) => h.startsWith("/") && !h.startsWith("//")),
    };
  });
}

const titles = new Map<string, string>();
const descriptions = new Map<string, string>();

for (const path of paths) {
  test(`SEO and structure: ${path}`, async ({ page }) => {
    await page.goto(path);
    const f = await facts(page);
    const is404 = path === "/404.html";

    expect(f.title.length, "title").toBeGreaterThan(9);
    expect(f.title.length, "title is short enough to show in search results").toBeLessThanOrEqual(75);
    expect(titles.get(f.title) ?? path, `title "${f.title}" is also used by ${titles.get(f.title)}`).toBe(path);
    titles.set(f.title, path);

    expect(f.lang, "html lang").toBeTruthy();
    expect(f.viewport, "viewport meta").toBe(true);
    expect(f.h1, "exactly one h1").toBe(1);
    for (let i = 1; i < f.headings.length; i++) expect(f.headings[i]! - f.headings[i - 1]!, `heading levels skip (${f.headings.join(",")})`).toBeLessThanOrEqual(1);
    expect(f.imagesWithoutAlt, "images without alt").toBe(0);
    expect(f.insecure, "http:// resources").toEqual([]);
    expect(f.unsafeBlank, "target=_blank links without rel=noopener").toEqual([]);
    expect(f.badJsonLd, "invalid JSON-LD").toBe(0);

    if (is404) {
      expect(f.robots ?? "", "404 stays out of search").toMatch(/noindex/);
      return;
    }
    expect(f.description, "meta description").toBeTruthy();
    expect(f.description!.length, "description length").toBeGreaterThanOrEqual(50);
    expect(f.description!.length, "description length").toBeLessThanOrEqual(175);
    expect(descriptions.get(f.description!) ?? path, `description is also used by ${descriptions.get(f.description!)}`).toBe(path);
    descriptions.set(f.description!, path);
    expect(f.canonical, "canonical").toMatch(/^https:\/\//);
    expect(new URL(f.canonical!).pathname.replace(/\/$/, ""), "canonical points at this page").toBe(`${BASE}${path}`.replace(/\/$/, ""));
    expect(f.ogTitle, "og:title").toBeTruthy();
    expect(f.ogDescription, "og:description").toBeTruthy();
    expect(f.robots ?? "", "a page in the sitemap is not noindex").not.toMatch(/noindex/);
  });
}

test("every internal link on every page leads to a page that exists", async ({ page }) => {
  const known = new Set(paths.map((p) => p.replace(/\/$/, "")));
  const broken: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    for (const href of (await facts(page)).internalLinks) {
      const clean = href.split("#")[0]!.split("?")[0]!.replace(BASE, "").replace(/\/$/, "");
      if (clean === "" || known.has(clean)) continue;
      const file = resolve("out", `.${clean}`);
      if (existsSync(file) || existsSync(`${file}/index.html`) || existsSync(`${file}.html`)) continue; // feed, sitemap, assets, the admin
      broken.push(`${path} -> ${href}`);
    }
  }
  expect(broken).toEqual([]);
});

test("sitemap, robots and feed are consistent", async () => {
  const sitemap = readFileSync(resolve("out/sitemap.xml"), "utf-8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  expect(locs.length).toBeGreaterThan(5);
  expect(new Set(locs).size, "duplicate sitemap entries").toBe(locs.length);
  for (const loc of locs) {
    expect(loc).toMatch(/^https:\/\//);
    expect(loc).not.toContain("/admin");
    expect(loc.endsWith("/"), `${loc} ends with a slash like the real address`).toBe(true);
  }
  const robots = readFileSync(resolve("out/robots.txt"), "utf-8");
  expect(robots).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m);
  expect(robots).toMatch(/Disallow: .*\/admin\//);
  const feed = readFileSync(resolve("out/feed.xml"), "utf-8");
  expect(feed).toMatch(/<rss[^>]*version="2\.0"/);
  expect(feed).toMatch(/<item>/);
});

test("the admin page is out of search and strictly locked down", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("connect-src 'self' https://api.github.com");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
});
