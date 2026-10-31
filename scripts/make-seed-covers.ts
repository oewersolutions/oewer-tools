/**
 * Draws the stand-in cover pictures for the sample articles into public/images/blog/<slug>/ (1600 and 800 pixels
 * wide, JPEG). Needs Google Chrome. Run it only to redo the sample covers; real articles use their own pictures.
 *
 *   npx tsx scripts/make-seed-covers.ts
 */
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { SEED_POSTS } from "./blog-content";
import { coverPath, paletteFor } from "./seed-covers";

const css = await readFile(resolve("app/globals.css"), "utf-8");
const coverCss = [...css.matchAll(/\.cover-\d \{[^}]*\}/g)].map((m) => m[0]).join("\n");
const posts = [{ id: "POST0001", slug: "how-emi-is-calculated" }, ...SEED_POSTS.map((p) => ({ id: p.id, slug: p.slug }))];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
for (const [i, post] of posts.entries()) {
  const cx = 300 + ((i * 173) % 900);
  const cy = 250 + ((i * 97) % 450);
  const svg = `<svg viewBox="0 0 1600 1000" width="1600" height="1000" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" style="position:absolute;inset:0"><circle cx="${cx}" cy="${cy}" r="260"/><circle cx="${cx}" cy="${cy}" r="420"/><path d="M0 ${600 + i * 30} Q 480 ${380 + i * 20} 1600 ${700 - i * 25}"/></svg>`;
  await page.setContent(`<style>*{margin:0}${coverCss}.c{position:relative;width:1600px;height:1000px;overflow:hidden}</style><div class="c ${paletteFor(post.id).cls}">${svg}</div>`);
  const dir = resolve("public", `.${coverPath(post.slug).replace(/\/[^/]+$/, "")}`);
  await mkdir(dir, { recursive: true });
  await page.locator(".c").screenshot({ path: resolve("public", `.${coverPath(post.slug, 1600)}`), type: "jpeg", quality: 82 });
  await page.setViewportSize({ width: 800, height: 500 });
  await page.setContent(`<style>*{margin:0}${coverCss}.c{position:relative;width:800px;height:500px;overflow:hidden}</style><div class="c ${paletteFor(post.id).cls}">${svg.replace('width="1600" height="1000"', 'width="800" height="500"')}</div>`);
  await page.locator(".c").screenshot({ path: resolve("public", `.${coverPath(post.slug, 800)}`), type: "jpeg", quality: 82 });
  await page.setViewportSize({ width: 1600, height: 1000 });
  console.log(`covers for ${post.slug}`);
}
await browser.close();
