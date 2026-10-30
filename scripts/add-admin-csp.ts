import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCsp, inlineScriptHashes, injectCsp } from "../lib/csp";

// Run after `next build`: adds a strict Content Security Policy to the admin page, which holds the GitHub token.
const file = resolve(process.cwd(), "out/admin/index.html");
const html = readFileSync(file, "utf-8");
const hashes = inlineScriptHashes(html);
if (hashes.length === 0) throw new Error("Found no inline scripts in the admin page; the policy would block the page. Has the build output changed?");
writeFileSync(file, injectCsp(html, buildCsp(hashes, { connect: ["https://api.github.com"] })));
console.log(`Added a Content Security Policy to the admin page (${hashes.length} inline script hashes).`);
