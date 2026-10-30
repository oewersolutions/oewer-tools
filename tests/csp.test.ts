import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCsp, injectCsp, inlineScriptHashes } from "../lib/csp";

const hash = (s: string) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;

describe("inlineScriptHashes", () => {
  it("hashes each executable inline script once", () => {
    const html = `<head><script>self.a=1</script><script src="/x.js" async=""></script><script id="r">self.b=2</script><script>self.a=1</script></head>`;
    expect(inlineScriptHashes(html)).toEqual([hash("self.a=1"), hash("self.b=2")]);
  });
  it("skips scripts that do not execute, and empty ones", () => {
    const html = `<script type="application/ld+json">{"a":1}</script><script type="application/json">{}</script><script></script>`;
    expect(inlineScriptHashes(html)).toEqual([]);
  });
  it("does not mistake an attribute that merely contains 'src' for an external script", () => {
    expect(inlineScriptHashes(`<script data-source="x">go()</script>`)).toEqual([hash("go()")]);
  });
});

describe("buildCsp", () => {
  const csp = buildCsp(["'sha256-abc'"], { connect: ["https://api.github.com"] });
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  it("allows scripts only from this site and the listed hashes, never inline in general", () => {
    expect(directive("script-src")).toBe("script-src 'self' 'sha256-abc'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });
  it("lets the page call only itself and GitHub", () => {
    expect(directive("connect-src")).toBe("connect-src 'self' https://api.github.com");
  });
  it("blocks everything not listed, plugins, base tag changes and form posts", () => {
    expect(directive("default-src")).toBe("default-src 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'none'");
    expect(directive("form-action")).toBe("form-action 'none'");
  });
});

describe("injectCsp", () => {
  it("puts the policy first in <head>", () => {
    const out = injectCsp(`<html><head><meta charSet="utf-8"/></head></html>`, "default-src 'none'");
    expect(out).toContain(`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'"/><meta charSet`);
  });
  it("escapes quotes in the policy and refuses a page with no head", () => {
    expect(injectCsp("<head></head>", 'a"b')).toContain('content="a&quot;b"');
    expect(() => injectCsp("<body></body>", "x")).toThrow(/No <head>/);
  });
});
