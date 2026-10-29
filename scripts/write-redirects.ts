import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getContent } from "../lib/content";
import { getSiteUrl } from "../lib/metadata";
import { activeRedirects, redirectFile, redirectHtml, redirectTargetUrl } from "../lib/seo";

// Run after `next build`: writes a static redirect page into out/ for each enabled row of the `redirects` sheet.
const outDir = resolve(process.cwd(), "out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = getSiteUrl().replace(/\/+$/, "");

let count = 0;
for (const rule of activeRedirects(getContent())) {
  const file = join(outDir, redirectFile(rule.source));
  if (existsSync(file)) {
    console.error(`Redirect source ${rule.source} collides with an existing page.`);
    process.exit(1);
  }
  mkdirSync(dirname(file), { recursive: true });
  const target = redirectTargetUrl(rule.target, basePath);
  writeFileSync(file, redirectHtml(/^https?:/i.test(target) ? target : `${siteUrl}${target}`));
  count++;
}
console.log(`Wrote ${count} redirect page(s).`);
