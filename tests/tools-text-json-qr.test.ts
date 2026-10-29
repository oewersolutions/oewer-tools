import { describe, expect, it } from "vitest";
import { formatJson, locate, minifyJson, parseJson, sortKeys } from "../lib/tools/json";
import { buildQr, MAX_QR_CHARS, qrSvg } from "../lib/tools/qr";
import { analyzeText, formatDuration } from "../lib/tools/text";

describe("JSON", () => {
  it("parses valid JSON and reports empty input", () => {
    expect(parseJson('{"a":[1,2]}')).toEqual({ ok: true, value: { a: [1, 2] } });
    expect(parseJson("  ")).toMatchObject({ ok: false, error: { message: "Enter some JSON to check." } });
  });
  it("reports invalid JSON, with a location when the engine gives one", () => {
    const r = parseJson('{"a": 1,\n  "b": }');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message.length).toBeGreaterThan(0);
      if (r.error.line !== undefined) expect(r.error.line).toBe(2);
    }
  });
  it("rejects input over the size limit", () => {
    const r = parseJson(" ".repeat(5_000_001));
    expect(r.ok).toBe(false);
  });
  it("locates positions by line and column", () => {
    expect(locate("ab\ncd", 0)).toEqual({ line: 1, column: 1 });
    expect(locate("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
    expect(locate("ab", 99)).toEqual({ line: 1, column: 3 });
  });
  it("formats with 2, 4 or tab indent and minifies", () => {
    const v = { b: 1, a: { d: 1, c: [1] } };
    expect(formatJson(v, "2", false)).toBe('{\n  "b": 1,\n  "a": {\n    "d": 1,\n    "c": [\n      1\n    ]\n  }\n}');
    expect(formatJson({ a: 1 }, "tab", false)).toBe('{\n\t"a": 1\n}');
    expect(formatJson({ a: 1 }, "4", false)).toBe('{\n    "a": 1\n}');
    expect(minifyJson(v, false)).toBe('{"b":1,"a":{"d":1,"c":[1]}}');
  });
  it("sorts keys at every depth but leaves array order", () => {
    expect(minifyJson({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } }, true)).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
    expect(sortKeys([3, 1])).toEqual([3, 1]);
  });
});

describe("text statistics", () => {
  it("counts an empty text as zeros", () => {
    expect(analyzeText("")).toEqual({ words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0, lines: 0 });
  });
  it("counts words, characters, sentences and paragraphs", () => {
    const s = analyzeText("Hello world. This is a test!\n\nSecond paragraph here?");
    expect(s.words).toBe(9);
    expect(s.sentences).toBe(3);
    expect(s.paragraphs).toBe(2);
    expect(s.lines).toBe(3);
    expect(s.charactersNoSpaces).toBeLessThan(s.characters);
  });
  it("counts an emoji as one character", () => {
    expect(analyzeText("a👍b").characters).toBe(3);
  });
  it("formats durations", () => {
    expect(formatDuration(0, 200)).toBe("0 sec");
    expect(formatDuration(5, 200)).toBe("less than a minute");
    expect(formatDuration(100, 200)).toBe("30 sec");
    expect(formatDuration(200, 200)).toBe("1 min");
    expect(formatDuration(500, 200)).toBe("2 min 30 sec");
  });
});

describe("QR codes", () => {
  it("builds a square module matrix", () => {
    const r = buildQr("https://example.com", "M");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.modules.length).toBeGreaterThanOrEqual(21);
      expect(r.modules.every((row) => row.length === r.modules.length)).toBe(true);
    }
  });
  it("handles non-ASCII text", () => {
    expect(buildQr("₹ 500 – café 👍", "M").ok).toBe(true);
  });
  it("returns an empty error for blank input and a message when too long", () => {
    expect(buildQr("", "M")).toEqual({ ok: false, error: "" });
    const r = buildQr("a".repeat(MAX_QR_CHARS + 1), "M");
    expect(r.ok).toBe(false);
  });
  it("renders valid SVG with a quiet zone", () => {
    const r = buildQr("hi", "L");
    if (!r.ok) throw new Error("expected a code");
    const svg = qrSvg(r.modules, { size: 200, margin: 4, foreground: "#000000", background: "#ffffff" });
    expect(svg).toContain(`viewBox="0 0 ${r.modules.length + 8} ${r.modules.length + 8}"`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('fill="#000000"');
  });
});
