import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../lib/markdown";

describe("parseMarkdown", () => {
  it("splits paragraphs on blank lines and joins soft line breaks", () => {
    expect(parseMarkdown("First line\nsecond line\n\nNext")).toEqual([
      { type: "paragraph", text: "First line second line" },
      { type: "paragraph", text: "Next" },
    ]);
  });

  it("parses headings and lists", () => {
    expect(parseMarkdown("## Title\n\n- one\n- two")).toEqual([
      { type: "heading", level: 2, text: "Title" },
      { type: "list", items: ["one", "two"] },
    ]);
  });

  it("ignores empty input", () => {
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("parses bold, italic, code and links", () => {
    expect(parseInline("a **b** *c* `d` [e](/f)")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "c" },
      { type: "text", text: " " },
      { type: "code", text: "d" },
      { type: "text", text: " " },
      { type: "link", text: "e", href: "/f" },
    ]);
  });

  it("keeps maths-style asterisks and brackets as plain text", () => {
    expect(parseInline("2 * 3 = 6 and (1 + r)^n")).toEqual([{ type: "text", text: "2 * 3 = 6 and (1 + r)^n" }]);
  });

  it("drops unsafe link targets but keeps the text", () => {
    // Link targets cannot contain parentheses, so this renders as plain text, never as a link.
    expect(parseInline("[x](javascript:alert(1))").some((part) => part.type === "link")).toBe(false);
    expect(parseInline("[x](javascript:void)")).toEqual([{ type: "text", text: "x" }]);
    expect(parseInline("[x](http://insecure.example)")).toEqual([{ type: "text", text: "x" }]);
    expect(parseInline("[x](//evil.example)")).toEqual([{ type: "text", text: "x" }]);
  });
});
