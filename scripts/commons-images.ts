/**
 * Find, check and fetch openly licensed photos from Wikimedia Commons for the articles.
 *
 *   npx tsx scripts/commons-images.ts search <queries.json> <sheet.png>   # candidates for each query, shown on one contact sheet
 *   npx tsx scripts/commons-images.ts fetch "File:Name.jpg" <slug> <cover|name> # download 1600 and 800 wide copies and record the credit
 *
 * Only Public domain, CC0, CC BY and CC BY-SA files are accepted (never NC or ND), and each download is checked to be a real
 * JPEG. The credit for every picture is saved in content/images/credits.json so it can be shown on the article.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "OEWERTools/1.0 (https://oewer.in; oewersolutions@gmail.com) article-images";
const CREDITS = resolve("content/images/credits.json");

export interface Credit {
  title: string;
  page: string;
  author: string;
  licence: string;
  licenceUrl: string;
  description: string;
  width: number;
  height: number;
  files: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url: string): Promise<Response> {
  const wait = 700 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    return res;
  }
  throw new Error(`Commons did not answer: ${url}`);
}

const text = (html: string | undefined) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ALLOWED = /^(public domain|cc0|cc[- ]by(-sa)? \d\.\d|pd[- ]|no restrictions)/i;
export const licenceOk = (short: string) => ALLOWED.test(short.trim()) && !/\b(nc|nd)\b/i.test(short);

/** The parts of a Commons API page that are read here. */
interface ApiPage {
  title: string;
  index?: number;
  imageinfo?: { width: number; height: number; mime: string; thumburl?: string; url: string; extmetadata?: Record<string, { value?: string } | undefined> }[];
}

interface Info {
  title: string;
  width: number;
  height: number;
  mime: string;
  thumb: string;
  url: string;
  licence: string;
  licenceUrl: string;
  author: string;
  description: string;
  restrictions: string;
}

function toInfo(page: ApiPage): Info | undefined {
  const ii = page.imageinfo?.[0];
  if (!ii) return undefined;
  const m = ii.extmetadata ?? {};
  return {
    title: page.title,
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    thumb: ii.thumburl ?? ii.url,
    url: ii.url,
    licence: text(m.LicenseShortName?.value),
    licenceUrl: text(m.LicenseUrl?.value),
    author: text(m.Artist?.value) || text(m.Credit?.value),
    description: text(m.ImageDescription?.value).slice(0, 200),
    restrictions: text(m.Restrictions?.value),
  };
}
const PROPS = "action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Restrictions";

async function search(query: string, thumbWidth: number, minWidth: number): Promise<Info[]> {
  const url = `${API}?${PROPS}&iiurlwidth=${thumbWidth}&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}`;
  const json = (await (await get(url)).json()) as { query?: { pages?: Record<string, ApiPage> } };
  const pages: ApiPage[] = Object.values(json.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .map((p) => toInfo(p))
    .filter((i): i is Info => Boolean(i) && i!.mime === "image/jpeg" && i!.width >= minWidth && licenceOk(i!.licence) && !/personality|trademark/i.test(i!.restrictions));
}

async function info(title: string, thumbWidth: number): Promise<Info> {
  const url = `${API}?${PROPS}&iiurlwidth=${thumbWidth}&titles=${encodeURIComponent(title)}`;
  const json = (await (await get(url)).json()) as { query?: { pages?: Record<string, ApiPage> } };
  const page = Object.values(json.query?.pages ?? {})[0];
  const i = page && toInfo(page);
  if (!i) throw new Error(`Not found on Commons: ${title}`);
  return i;
}

async function download(url: string): Promise<Buffer> {
  const res = await get(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) throw new Error(`Not a JPEG file: ${url}`);
  return bytes;
}

const [command, ...rest] = process.argv.slice(2);

if (command === "search") {
  const [queriesFile, sheetFile] = rest;
  const queries: Record<string, string[]> = JSON.parse(await readFile(resolve(queriesFile!), "utf-8"));
  const out: Record<string, Info[]> = {};
  for (const [key, list] of Object.entries(queries)) {
    const seen = new Set<string>();
    const found: Info[] = [];
    for (const q of list) for (const i of await search(q, 360, 1400)) if (!seen.has(i.title) && found.length < 8) {
        seen.add(i.title);
        found.push(i);
      }
    out[key] = found;
    console.log(`${key}: ${found.length} candidates`);
  }
  await writeFile(resolve(sheetFile!).replace(/\.png$/, ".json"), JSON.stringify(out, null, 1));
  const html = Object.entries(out)
    .map(([key, list]) => `<h2>${key}</h2><div class="row">${list.map((i, n) => `<figure><img src="${i.thumb}"><figcaption>${n}: ${i.title.replace("File:", "").slice(0, 38)}<br>${i.licence}</figcaption></figure>`).join("")}</div>`)
    .join("");
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1700, height: 800 } });
  await page.setContent(`<style>body{font:12px sans-serif;margin:8px}h2{margin:10px 0 2px;font-size:15px}.row{display:flex;gap:6px}figure{margin:0;width:200px}img{width:200px;height:130px;object-fit:cover;background:#ddd}figcaption{height:42px;overflow:hidden}</style>${html}`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: resolve(sheetFile!), fullPage: true });
  await browser.close();
} else if (command === "fetch") {
  const [title, slug, name = "cover"] = rest;
  if (!title || !slug) throw new Error('Usage: fetch "File:Name.jpg" <slug> <cover|name>');
  const meta = await info(title, 1600);
  if (!licenceOk(meta.licence)) throw new Error(`Licence not accepted for ${title}: ${meta.licence}`);
  if (meta.mime !== "image/jpeg") throw new Error(`${title} is ${meta.mime}, not a JPEG`);
  const dir = resolve("public/images/blog", slug);
  await mkdir(dir, { recursive: true });
  const widths = name === "cover" ? [1600, 800] : [1200, 600];
  const files: string[] = [];
  for (const w of widths) {
    const sized = w === 1600 ? meta : await info(title, w);
    if (meta.width < w) throw new Error(`${title} is only ${meta.width} pixels wide`);
    await writeFile(resolve(dir, `${name}-${w}.jpg`), await download(sized.thumb));
    files.push(`/images/blog/${slug}/${name}-${w}.jpg`);
  }
  const credits: Record<string, Credit> = existsSync(CREDITS) ? JSON.parse(await readFile(CREDITS, "utf-8")) : {};
  credits[`${slug}/${name}`] = { title: meta.title, page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(meta.title.replace(/ /g, "_"))}`, author: meta.author, licence: meta.licence, licenceUrl: meta.licenceUrl, description: meta.description, width: meta.width, height: meta.height, files };
  await writeFile(CREDITS, JSON.stringify(credits, null, 1));
  console.log(`${slug}/${name}: ${meta.title} (${meta.licence}, ${meta.author.slice(0, 40)})`);
} else {
  console.log("Usage: search <queries.json> <sheet.png> | fetch <File:Title> <slug> <cover|name>");
}
