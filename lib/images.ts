import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { imageSizeFromBytes } from "./image-size";

/** What the pages need to show a picture well: its size, and its smaller versions when there are any. */
export interface ImageInfo {
  width: number;
  height: number;
  /** Value for `srcSet` (site paths, without the base path), or "" when there is only one size. */
  srcSet: string;
}

const WIDTHS = [400, 480, 600, 640, 800, 1000, 1200, 1600, 2000];
const cache = new Map<string, ImageInfo | null>();

const file = (path: string) => resolve(process.cwd(), "public", `.${path}`);

/**
 * Read a picture from `public/` (build time only). A file named like `cover-1600.jpg` gets its smaller versions
 * (`cover-800.jpg` and so on) put in the srcset when they exist, so phones download the small one.
 */
export function getImageInfo(path: string): ImageInfo | null {
  if (cache.has(path)) return cache.get(path)!;
  let info: ImageInfo | null = null;
  if (existsSync(file(path))) {
    const size = imageSizeFromBytes(readFileSync(file(path)));
    if (size) {
      const match = /^(.*)-(\d+)(\.[a-z]+)$/i.exec(path);
      const variants: { path: string; width: number }[] = [{ path, width: size.width }];
      if (match) {
        for (const w of WIDTHS) {
          const sibling = `${match[1]}-${w}${match[3]}`;
          if (sibling !== path && existsSync(file(sibling))) {
            const s = imageSizeFromBytes(readFileSync(file(sibling)));
            if (s) variants.push({ path: sibling, width: s.width });
          }
        }
      }
      const unique = [...new Map(variants.map((v) => [v.width, v])).values()].sort((a, b) => a.width - b.width);
      info = { ...size, srcSet: unique.length > 1 ? unique.map((v) => `${v.path} ${v.width}w`).join(", ") : "" };
    }
  }
  cache.set(path, info);
  return info;
}
