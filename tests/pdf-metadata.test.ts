import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { detectFormat, inspectImage, orientationOnlyExif, readExif, stripMetadata } from "../lib/tools/metadata";
import { checkPdfFile, parsePageRanges, parseSplitGroups, pdfOutputName, placeImage } from "../lib/tools/pdf";
import { countPages, extractPages, imagesToPdf, mergePdfs, PdfProblem } from "../lib/tools/pdf-ops";

const enc = (s: string) => new TextEncoder().encode(s);
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const u16 = (n: number) => new Uint8Array([n >> 8, n & 255]);
const segment = (marker: number, body: Uint8Array) => cat(new Uint8Array([0xff, marker]), u16(body.length + 2), body);

/** A little-endian Exif block with Make, Model, DateTime, Orientation and a GPS pointer. */
function exifBlock(orientation = 6): Uint8Array {
  const strings = [enc("Acme\0"), enc("Phone 9\0"), enc("2026:10:31 17:02:30\0")];
  const entries = 5;
  const dataStart = 8 + 2 + entries * 12 + 4;
  const offsets = [dataStart, dataStart + strings[0]!.length, dataStart + strings[0]!.length + strings[1]!.length];
  const ifd = new Uint8Array(2 + entries * 12 + 4);
  const v = new DataView(ifd.buffer);
  v.setUint16(0, entries, true);
  const put = (i: number, tag: number, type: number, count: number, value: number) => {
    const o = 2 + i * 12;
    v.setUint16(o, tag, true);
    v.setUint16(o + 2, type, true);
    v.setUint32(o + 4, count, true);
    if (type === 3) v.setUint16(o + 8, value, true);
    else v.setUint32(o + 8, value, true);
  };
  put(0, 0x010f, 2, strings[0]!.length, offsets[0]!);
  put(1, 0x0110, 2, strings[1]!.length, offsets[1]!);
  put(2, 0x0112, 3, 1, orientation);
  put(3, 0x0132, 2, strings[2]!.length, offsets[2]!);
  put(4, 0x8825, 4, 1, 0);
  const header = new Uint8Array([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
  return cat(enc("Exif\0\0"), header, ifd, ...strings);
}

const picture = new Uint8Array([0xff, 0xda, 0, 4, 1, 2, 9, 9, 9, 0xff, 0xd9]);
const jfif = segment(0xe0, enc("JFIF\0\x01\x01\0\0\x01\0\x01\0\0"));
const icc = segment(0xe2, enc("ICC_PROFILE\0\x01\x01profile"));
function makeJpeg(withOrientation = 6): Uint8Array {
  return cat(
    new Uint8Array([0xff, 0xd8]),
    jfif,
    segment(0xe1, exifBlock(withOrientation)),
    segment(0xe1, enc("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>")),
    segment(0xed, enc("Photoshop 3.0\0 8BIM")),
    segment(0xfe, enc("hello")),
    icc,
    picture,
  );
}

describe("image format detection", () => {
  it("recognises JPG, PNG and WebP by their first bytes", () => {
    expect(detectFormat(makeJpeg())).toBe("jpeg");
    expect(detectFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("png");
    expect(detectFormat(cat(enc("RIFF"), new Uint8Array(4), enc("WEBPVP8 "), new Uint8Array(4)))).toBe("webp");
    expect(detectFormat(enc("GIF89a......"))).toBeUndefined();
    expect(detectFormat(new Uint8Array())).toBeUndefined();
  });
});

describe("Exif reading", () => {
  it("reads camera, date, orientation and a GPS marker", () => {
    expect(readExif(exifBlock().subarray(6))).toEqual({ make: "Acme", model: "Phone 9", dateTime: "2026:10:31 17:02:30", orientation: 6, hasGps: true });
  });
  it("copes with rubbish", () => {
    expect(readExif(new Uint8Array([1, 2, 3]))).toBeUndefined();
    expect(readExif(enc("XXXXXXXXXXXX"))).toBeUndefined();
  });
  it("makes an orientation-only block that reads back", () => {
    expect(readExif(orientationOnlyExif(8).subarray(6))).toEqual({ hasGps: false, orientation: 8 });
  });
});

describe("JPG cleaning", () => {
  it("finds the hidden data", () => {
    const found = inspectImage(makeJpeg())!;
    expect(found.format).toBe("jpeg");
    expect(found.findings.map((f) => f.kind)).toEqual(["exif", "xmp", "iptc", "comment"]);
    expect(found.findings[0]!.label).toContain("GPS location");
    expect(found.findings[0]!.label).toContain("Acme Phone 9");
  });
  it("removes it all, keeps the picture and the colour profile byte for byte", () => {
    const clean = stripMetadata(makeJpeg(), { keepOrientation: false });
    expect(inspectImage(clean)!.findings).toEqual([]);
    expect(detectFormat(clean)).toBe("jpeg");
    const text = new TextDecoder("latin1").decode(clean);
    for (const gone of ["Acme", "Exif", "xmpmeta", "Photoshop", "hello"]) expect(text).not.toContain(gone);
    expect(text).toContain("ICC_PROFILE");
    expect(clean.subarray(clean.length - picture.length)).toEqual(picture);
    expect(clean.length).toBeLessThan(makeJpeg().length);
  });
  it("can keep only the orientation, so a rotated photo stays upright", () => {
    const clean = stripMetadata(makeJpeg(6), { keepOrientation: true });
    const found = inspectImage(clean)!;
    expect(found.findings.map((f) => f.kind)).toEqual(["exif"]);
    expect(found.exif).toEqual({ hasGps: false, orientation: 6 });
    expect(found.findings[0]!.label).not.toMatch(/Acme|GPS/);
    // and an upright photo gets no Exif block at all
    expect(inspectImage(stripMetadata(makeJpeg(1), { keepOrientation: true }))!.findings).toEqual([]);
  });
  it("is stable: cleaning twice changes nothing", () => {
    const once = stripMetadata(makeJpeg(), { keepOrientation: false });
    expect(stripMetadata(once, { keepOrientation: false })).toEqual(once);
  });
  it("refuses a damaged file", () => {
    expect(() => stripMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2]), { keepOrientation: false })).toThrow();
    expect(() => stripMetadata(enc("not an image"), { keepOrientation: false })).toThrow();
  });
});

const crc = new Uint8Array(4);
const pngChunk = (type: string, data: Uint8Array) => cat(new Uint8Array([0, 0, 0, data.length]), enc(type), data, crc);
const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
describe("PNG cleaning", () => {
  const png = cat(PNG_SIG, pngChunk("IHDR", new Uint8Array(13)), pngChunk("tEXt", enc("Author\0Someone")), pngChunk("tIME", new Uint8Array(7)), pngChunk("eXIf", exifBlock().subarray(6)), pngChunk("pHYs", new Uint8Array(9)), pngChunk("IDAT", new Uint8Array([1, 2, 3])), pngChunk("IEND", new Uint8Array()));
  it("finds and removes text notes, the time and Exif, and keeps the rest", () => {
    expect(inspectImage(png)!.findings.map((f) => f.kind)).toEqual(["text", "time", "exif"]);
    const clean = stripMetadata(png, { keepOrientation: true });
    expect(inspectImage(clean)!.findings).toEqual([]);
    const text = new TextDecoder("latin1").decode(clean);
    expect(text).not.toContain("Someone");
    for (const kept of ["IHDR", "pHYs", "IDAT", "IEND"]) expect(text).toContain(kept);
  });
});

const riff = (chunks: Uint8Array[]) => {
  const body = cat(enc("WEBP"), ...chunks);
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, body.length, true);
  return cat(enc("RIFF"), size, body);
};
const webpChunk = (type: string, data: Uint8Array) => {
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, data.length, true);
  return cat(enc(type), size, data, data.length % 2 ? new Uint8Array(1) : new Uint8Array());
};
describe("WebP cleaning", () => {
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x08 | 0x04 | 0x10; // Exif, XMP and alpha flags
  const webp = riff([webpChunk("VP8X", vp8x), webpChunk("VP8 ", new Uint8Array([9, 9, 9])), webpChunk("EXIF", exifBlock().subarray(6)), webpChunk("XMP ", enc("<x/>"))]);
  it("removes Exif and XMP, clears their flags and fixes the length", () => {
    expect(inspectImage(webp)!.findings.map((f) => f.kind)).toEqual(["exif", "xmp"]);
    const clean = stripMetadata(webp, { keepOrientation: false });
    expect(inspectImage(clean)!.findings).toEqual([]);
    expect(new DataView(clean.buffer).getUint32(4, true)).toBe(clean.length - 8);
    expect(clean[20]).toBe(0x10); // only the alpha flag is left
    expect(new TextDecoder("latin1").decode(clean)).toContain("VP8 ");
  });
});

describe("page ranges", () => {
  it("reads pages, ranges and open ranges", () => {
    expect(parsePageRanges("1-3, 5, 8-", 10)).toEqual({ ok: true, pages: [0, 1, 2, 4, 7, 8, 9] });
    expect(parsePageRanges("2", 3)).toEqual({ ok: true, pages: [1] });
    expect(parsePageRanges("3,1", 3)).toEqual({ ok: true, pages: [2, 0] });
    expect(parsePageRanges(" 2 - 3 ", 3)).toEqual({ ok: true, pages: [1, 2] });
  });
  it("explains mistakes", () => {
    for (const bad of ["", "a", "0", "4", "2-9", "3-1", "1--2", "1.5"]) expect(parsePageRanges(bad, 3).ok, bad).toBe(false);
    expect(parsePageRanges("2-9", 3)).toMatchObject({ error: expect.stringContaining("3 pages") });
  });
  it("splits into one file per line", () => {
    expect(parseSplitGroups("1-2\n3\n", 5)).toEqual({ ok: true, groups: [{ label: "1-2", pages: [0, 1] }, { label: "3", pages: [2] }] });
    expect(parseSplitGroups("1\nzz", 5)).toMatchObject({ ok: false, error: expect.stringContaining("Line 2") });
    expect(parseSplitGroups("  \n", 5).ok).toBe(false);
  });
});

describe("page layout", () => {
  it("makes the page the size of the picture", () => {
    expect(placeImage(800, 600, "fit", 0)).toEqual({ pageWidth: 800, pageHeight: 600, x: 0, y: 0, width: 800, height: 600 });
  });
  it("centres on A4, choosing portrait or landscape", () => {
    const tall = placeImage(1000, 2000, "a4", 36);
    expect(tall.pageWidth).toBeCloseTo(595.28);
    expect(tall.pageHeight).toBeCloseTo(841.89);
    expect(tall.height).toBeCloseTo(841.89 - 72);
    expect(tall.x + tall.width / 2).toBeCloseTo(595.28 / 2);
    const wide = placeImage(2000, 1000, "letter", 0);
    expect(wide.pageWidth).toBe(792);
    expect(wide.pageHeight).toBe(612);
    expect(wide.width).toBeCloseTo(792);
    expect(wide.height).toBeCloseTo(396);
    expect(wide.y).toBeCloseTo((612 - 396) / 2);
  });
  it("names and checks files", () => {
    expect(pdfOutputName("My Report.pdf", "pages 1-3")).toBe("My Report-pages-1-3.pdf");
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 10 })).toBeNull();
    expect(checkPdfFile({ name: "a.PDF", type: "", size: 10 })).toBeNull();
    expect(checkPdfFile({ name: "a.txt", type: "text/plain", size: 10 })).toMatch(/not a PDF/);
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 0 })).toMatch(/empty/);
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 60 * 1024 * 1024 })).toMatch(/too large/);
  });
});

async function samplePdf(pages: number, tag: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([200 + i, 300]);
    p.drawText(`${tag} ${i + 1}`);
  }
  return doc.save();
}
const PNG_1X1 = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

describe("PDF operations", () => {
  it("merges files in order", async () => {
    const merged = await mergePdfs([
      { name: "a.pdf", bytes: await samplePdf(2, "A") },
      { name: "b.pdf", bytes: await samplePdf(3, "B") },
    ]);
    expect(merged.pages).toBe(5);
    const doc = await PDFDocument.load(merged.bytes);
    expect(doc.getPageCount()).toBe(5);
    expect(doc.getPage(2).getWidth()).toBe(200); // the first page of the second file
    expect(doc.getPage(4).getWidth()).toBe(202);
  });
  it("extracts chosen pages in the order given", async () => {
    const out = await extractPages(await samplePdf(5, "P"), [3, 0, 4]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect([0, 1, 2].map((i) => doc.getPage(i).getWidth())).toEqual([203, 200, 204]);
  });
  it("counts pages", async () => {
    expect(await countPages(await samplePdf(4, "C"))).toBe(4);
  });
  it("explains a file that is not a PDF", async () => {
    await expect(countPages(enc("hello"), "bad.pdf")).rejects.toThrow(PdfProblem);
    await expect(mergePdfs([{ name: "bad.pdf", bytes: enc("hello") }])).rejects.toThrow(/bad\.pdf/);
  });
  it("builds a PDF from pictures, one per page", async () => {
    const out = await imagesToPdf([{ bytes: PNG_1X1, kind: "png" }, { bytes: PNG_1X1, kind: "png" }], "a4", 36);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
    const fit = await PDFDocument.load(await imagesToPdf([{ bytes: PNG_1X1, kind: "png" }], "fit", 0));
    expect(fit.getPage(0).getWidth()).toBe(1);
  });
});
