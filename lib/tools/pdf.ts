/** PDF helpers that need no PDF library: page-range text and page layout. Pure functions, unit tested without a browser. */

export type RangeResult = { ok: true; pages: number[] } | { ok: false; error: string };

/**
 * Turn "1-3, 5, 8-" into page indexes (counting from 0). "8-" means page 8 to the end. Order is kept and a page may be listed twice.
 */
export function parsePageRanges(text: string, pageCount: number): RangeResult {
  const parts = text
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Enter the pages you want, such as 1-3, 5, 8-." };
  const pages: number[] = [];
  for (const part of parts) {
    const m = /^(\d+)(?:\s*-\s*(\d*))?$/.exec(part);
    if (!m) return { ok: false, error: `"${part}" is not a page or a range. Use numbers like 3 or 2-5.` };
    const first = Number(m[1]);
    const dashed = part.includes("-");
    const last = !dashed ? first : m[2] === "" ? pageCount : Number(m[2]);
    if (first < 1 || last < 1) return { ok: false, error: "Page numbers start at 1." };
    if (first > pageCount || last > pageCount) return { ok: false, error: `The file has ${pageCount} page${pageCount === 1 ? "" : "s"}, so "${part}" is out of range.` };
    if (last < first) return { ok: false, error: `"${part}" goes backwards. Write the lower page number first.` };
    for (let p = first; p <= last; p++) pages.push(p - 1);
  }
  return { ok: true, pages };
}

/** One output file per line. Returns the pages of each non-empty line, or the first error with its line number. */
export function parseSplitGroups(text: string, pageCount: number): { ok: true; groups: { label: string; pages: number[] }[] } | { ok: false; error: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "Enter the pages for each file, one file per line, such as 1-3 on the first line and 4-6 on the second." };
  const groups: { label: string; pages: number[] }[] = [];
  for (const [i, line] of lines.entries()) {
    const r = parsePageRanges(line, pageCount);
    if (!r.ok) return { ok: false, error: lines.length > 1 ? `Line ${i + 1}: ${r.error}` : r.error };
    groups.push({ label: line, pages: r.pages });
  }
  return { ok: true, groups };
}

export type PageSize = "fit" | "a4" | "letter";
export const PAGE_SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

export interface Placement {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a picture of imageWidth x imageHeight goes on its page. "fit" makes the page the size of the picture. A4 and Letter use
 * portrait for a tall picture and landscape for a wide one, and scale the picture to fit inside the margin (never enlarging it past
 * the page) and centre it. All sizes are in PDF points (1/72 inch).
 */
export function placeImage(imageWidth: number, imageHeight: number, size: PageSize, margin: number): Placement {
  if (size === "fit") return { pageWidth: imageWidth, pageHeight: imageHeight, x: 0, y: 0, width: imageWidth, height: imageHeight };
  const [short, long] = PAGE_SIZES[size];
  const landscape = imageWidth > imageHeight;
  const pageWidth = landscape ? long : short;
  const pageHeight = landscape ? short : long;
  const boxW = pageWidth - 2 * margin;
  const boxH = pageHeight - 2 * margin;
  const scale = Math.min(boxW / imageWidth, boxH / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { pageWidth, pageHeight, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}

/** "report.pdf" + "pages 1-3" -> "report-pages-1-3.pdf". */
export function pdfOutputName(original: string, suffix: string): string {
  const dot = original.lastIndexOf(".");
  const base = (dot > 0 ? original.slice(0, dot) : original).replace(/[^\w.\- ]+/g, "_") || "document";
  return `${base}-${suffix.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "")}.pdf`;
}

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
export const MAX_FILES = 20;

export function checkPdfFile(file: { type: string; name: string; size: number }): string | null {
  const looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksPdf) return `"${file.name}" is not a PDF file.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_PDF_BYTES) return `"${file.name}" is too large for a browser tool (the limit is 50 MB).`;
  return null;
}
