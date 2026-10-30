import { createHash } from "node:crypto";

/**
 * Content Security Policy for the admin page.
 *
 * GitHub Pages cannot send headers, so the policy is delivered in a <meta> tag. The page's own inline scripts
 * (the framework's start-up data) are allowed by their SHA-256 hash instead of 'unsafe-inline', so an injected
 * script cannot run. Meta policies cannot set `frame-ancestors`, so framing is not covered.
 */

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const NON_EXECUTABLE_TYPE = /\stype\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap|speculationrules)/i;

/** SHA-256 CSP source expressions for every executable inline script in the HTML. */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const [, attributes = "", body = ""] = match;
    if (body === "" || NON_EXECUTABLE_TYPE.test(attributes)) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

export interface CspOptions {
  /** Origins the page may call with fetch. */
  connect: string[];
}

export function buildCsp(scriptHashes: string[], { connect }: CspOptions): string {
  return [
    "default-src 'none'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim(),
    `connect-src 'self' ${connect.join(" ")}`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

/** Put the policy first in <head>, so it applies to everything after it. */
export function injectCsp(html: string, csp: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, "&quot;")}"/>`;
  if (!/<head[^>]*>/i.test(html)) throw new Error("No <head> found to put the Content Security Policy in.");
  return html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
}
