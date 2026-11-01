/**
 * Prepare the pictures listed in content/images/credits.json for the site: covers are cropped from the centre to 16:10 (the shape
 * the site shows them in), pictures in the text to no taller than 4:3, each is scaled to the width in its file name (never enlarged)
 * and saved again as a lighter JPEG.
 * Needs Google Chrome. Run it once on freshly fetched pictures (running it again compresses them a second time).
 *
 *   npx tsx scripts/shrink-images.ts [quality=0.72] [onlyFilesLargerThanKB] [onlyFileNamesMatching, e.g. "cover-800"]
 */
import { statSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import type { Credit } from "./commons-images";

const quality = Number(process.argv[2] ?? 0.72);
const credits: Record<string, Credit> = JSON.parse(await readFile(resolve("content/images/credits.json"), "utf-8"));
const minBytes = Number(process.argv[3] ?? 0) * 1024;
const only = process.argv[4] ? new RegExp(process.argv[4]) : undefined;
// A middle size for pictures in the text, so a phone downloads 800 pixels rather than 1200 (made from the 1200 copy).
for (const credit of Object.values(credits)) {
  const big = credit.files.find((f) => /\/figure-1200\.jpg$/.test(f));
  if (big && !credit.files.some((f) => /\/figure-800\.jpg$/.test(f))) {
    await copyFile(resolve("public", `.${big}`), resolve("public", `.${big.replace("-1200", "-800")}`));
    credit.files.push(big.replace("-1200", "-800"));
  }
}
await writeFile(resolve("content/images/credits.json"), JSON.stringify(credits, null, 1));
const files = [...new Set(Object.values(credits).flatMap((c) => c.files))].filter((f) => (minBytes === 0 || statSync(resolve("public", `.${f}`)).size > minBytes) && (!only || only.test(f)));

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.setContent("<canvas></canvas>");
let before = 0;
let after = 0;
for (const file of files) {
  const path = resolve("public", `.${file}`);
  const original = await readFile(path);
  const b64 = await page.evaluate(
    async ([data, q, cover, target]) => {
      const blob = await (await fetch(`data:image/jpeg;base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      const canvas = document.querySelector("canvas")!;
      // centre crop: covers to 16:10, other pictures to at most 4:3 tall
      const shortest = cover ? 1.6 : 4 / 3;
      let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
      if (cover && sw / sh < 1.6) { sh = Math.round(sw / 1.6); sy = Math.round((bitmap.height - sh) / 2); }
      else if (cover && sw / sh > 1.6) { sw = Math.round(sh * 1.6); sx = Math.round((bitmap.width - sw) / 2); }
      else if (!cover && sw / sh < shortest) { sh = Math.round(sw / shortest); sy = Math.round((bitmap.height - sh) / 2); }
      // the width in the file name is the width of the picture (Commons only offers a few set sizes, so it is often bigger)
      const scale = Math.min(1, (target as number) / sw);
      const w = Math.round(sw * scale);
      const h = Math.round(sh * scale);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
      const out = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", q as number));
      const bytes = new Uint8Array(await out.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    },
    [original.toString("base64"), quality, /\/cover-\d+\.jpg$/.test(file), Number(/-(\d+)\.jpg$/.exec(file)![1])] as const,
  );
  const smaller = Buffer.from(b64, "base64");
  before += original.length;
  if (smaller.length < original.length) {
    await writeFile(path, smaller);
    after += smaller.length;
  } else after += original.length;
}
await browser.close();
const kb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`${files.length} files: ${kb(before)} -> ${kb(after)}`);
