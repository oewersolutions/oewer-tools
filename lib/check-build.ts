import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Sanity checks on a finished static build, run before it is uploaded for publishing. A build can succeed and still
 * be wrong (a page missing, an empty export, a test build). Anything reported here stops the deploy, so the live
 * site keeps showing the last good version. Returns the problems found; an empty list means the build is fit to publish.
 */
export function checkBuild(dir: string, basePath = ""): string[] {
  const problems: string[] = [];
  const read = (file: string) => readFileSync(join(dir, file), "utf-8");

  for (const file of ["index.html", "404.html", "sitemap.xml", "robots.txt", "feed.xml", "tools/index.html", "admin/index.html"]) {
    if (!existsSync(join(dir, file))) problems.push(`Missing ${file}.`);
  }
  if (problems.length > 0) return problems;

  const home = read("index.html");
  if (!/<title>[^<]+<\/title>/.test(home)) problems.push("The home page has no title.");
  if (!/<h1[\s>]/.test(home)) problems.push("The home page has no main heading.");
  if (!/Content-Security-Policy/i.test(read("admin/index.html"))) problems.push("The admin page has no Content Security Policy, so it must not be published.");

  const locs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  if (locs.length < 3) problems.push(`The sitemap lists only ${locs.length} page(s); the content export looks empty.`);
  if (!locs.some((p) => /\/tools\/[^/]+\/[^/]+\/$/.test(p))) problems.push("The sitemap lists no tool pages.");
  for (const path of locs) {
    const local = path.startsWith(basePath) ? path.slice(basePath.length) : path;
    if (!existsSync(join(dir, local, "index.html"))) problems.push(`The sitemap lists ${path} but the build has no page for it.`);
  }

  // A test build must never be published.
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        if (name !== "_next") stack.push(full);
      } else if (name.endsWith(".html") && read(full.slice(dir.length + 1)).includes("Ad space (preview)")) {
        problems.push(`${full.slice(dir.length)} contains preview ad boxes: this is a test build.`);
      }
    }
  }
  return problems;
}
