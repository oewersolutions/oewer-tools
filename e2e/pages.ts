import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Paths of every page in the sitemap, plus the 404 page, taken from the built site. */
export function builtPaths(): string[] {
  const xml = readFileSync(resolve("out/sitemap.xml"), "utf-8");
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  return [...paths, "/404.html"];
}
