/**
 * Restricted Markdown for workbook text. Supported: # / ## / ### headings, "- " lists,
 * paragraphs, **bold**, *italic*, `code` and [links](url). Raw HTML is never produced:
 * the result is data that React components render as elements.
 */

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong" | "em" | "code"; text: string }
  | { type: "link"; text: string; href: string };

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const chunk of source.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;

    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0]!);
    if (heading && lines.length === 1) {
      blocks.push({ type: "heading", level: heading[1]!.length as 1 | 2 | 3, text: heading[2]!.trim() });
    } else if (lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push({ type: "list", items: lines.map((l) => l.replace(/^[-*]\s+/, "").trim()) });
    } else {
      blocks.push({ type: "paragraph", text: lines.map((l) => l.trim()).join(" ") });
    }
  }
  return blocks;
}

/** Links are kept only when they are site-relative, https or a plain mailto address; anything else becomes plain text. */
function isSafeHref(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("https://") || /^mailto:[^\s@?&<>"']+@[^\s@?&<>"']+\.[^\s@?&<>"']+$/.test(href);
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/;

export function parseInline(text: string): Inline[] {
  return text
    .split(INLINE)
    .filter((part) => part !== "")
    .map((part): Inline => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return { type: "strong", text: part.slice(2, -2) };
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return { type: "code", text: part.slice(1, -1) };
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return { type: "em", text: part.slice(1, -1) };
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (link) return isSafeHref(link[2]!) ? { type: "link", text: link[1]!, href: link[2]! } : { type: "text", text: link[1]! };
      return { type: "text", text: part };
    });
}
