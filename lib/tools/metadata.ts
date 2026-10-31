/**
 * Finding and removing hidden data (camera, date, GPS location and the like) from JPG, PNG and WebP files.
 * The picture data itself is copied byte for byte, so nothing is re-compressed and quality does not change.
 * Pure functions on bytes, so they are unit tested without a browser.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export interface Finding {
  kind: "exif" | "xmp" | "iptc" | "comment" | "text" | "time";
  label: string;
}

export interface ExifSummary {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  hasGps: boolean;
  /** 1 to 8; 1 means upright. */
  orientation?: number;
}

export interface Inspection {
  format: ImageFormat;
  findings: Finding[];
  exif?: ExifSummary;
}

export function detectFormat(b: Uint8Array): ImageFormat | undefined {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  return undefined;
}

const ascii = (b: Uint8Array, at: number, n: number): string => String.fromCharCode(...b.subarray(at, at + n));
const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

// Exif reading (the small part of the TIFF structure inside the Exif block that matters for privacy)

/** Read the tags that tell a story about the photo. `tiff` starts at the TIFF header ("II" or "MM"). */
export function readExif(tiff: Uint8Array): ExifSummary | undefined {
  if (tiff.length < 8) return undefined;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return undefined;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  if (u16(2) !== 42) return undefined;
  const first = u32(4);
  if (first + 2 > tiff.length) return undefined;
  const summary: ExifSummary = { hasGps: false };
  const count = u16(first);
  const text = (entry: number): string | undefined => {
    const length = u32(entry + 4);
    const at = length <= 4 ? entry + 8 : u32(entry + 8);
    if (at + length > tiff.length) return undefined;
    const value = ascii(tiff, at, length).replace(/\0.*$/s, "").trim();
    return value === "" ? undefined : value;
  };
  for (let i = 0; i < count; i++) {
    const entry = first + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    switch (u16(entry)) {
      case 0x010f:
        summary.make = text(entry);
        break;
      case 0x0110:
        summary.model = text(entry);
        break;
      case 0x0131:
        summary.software = text(entry);
        break;
      case 0x0132:
        summary.dateTime = text(entry);
        break;
      case 0x0112:
        summary.orientation = u16(entry + 8);
        break;
      case 0x8825:
        summary.hasGps = true;
        break;
    }
  }
  return summary;
}

/** An Exif block that holds only the Orientation tag, so a rotated photo still opens upright after cleaning. */
export function orientationOnlyExif(orientation: number): Uint8Array {
  const body = new Uint8Array(8 + 2 + 12 + 4);
  const v = new DataView(body.buffer);
  body.set([0x4d, 0x4d], 0); // big-endian
  v.setUint16(2, 42);
  v.setUint32(4, 8);
  v.setUint16(8, 1); // one entry
  v.setUint16(10, 0x0112); // Orientation
  v.setUint16(12, 3); // type SHORT
  v.setUint32(14, 1); // count
  v.setUint16(18, orientation);
  return concat([new TextEncoder().encode("Exif\0\0"), body]);
}

const label = (e: ExifSummary): string => {
  const camera = [e.make, e.model].filter(Boolean).join(" ");
  const bits = [camera && `camera: ${camera}`, e.dateTime && `taken: ${e.dateTime}`, e.software && `software: ${e.software}`, e.hasGps && "GPS location"].filter(Boolean);
  return bits.length ? `Camera and shot details (${bits.join("; ")})` : "Camera and shot details";
};

// JPEG

interface Segment {
  marker: number;
  start: number;
  end: number;
}

function jpegSegments(b: Uint8Array): { segments: Segment[]; scanStart: number } | undefined {
  const segments: Segment[] = [];
  let at = 2;
  while (at + 4 <= b.length) {
    if (b[at] !== 0xff) return undefined;
    const marker = b[at + 1]!;
    if (marker === 0xff) {
      at++;
      continue;
    }
    if (marker === 0xda) return { segments, scanStart: at }; // the picture data starts here and runs to the end
    if (marker === 0xd9) return { segments, scanStart: at };
    const length = (b[at + 2]! << 8) | b[at + 3]!;
    if (length < 2 || at + 2 + length > b.length) return undefined;
    segments.push({ marker, start: at, end: at + 2 + length });
    at += 2 + length;
  }
  return undefined;
}

const isExifSegment = (b: Uint8Array, s: Segment) => s.marker === 0xe1 && ascii(b, s.start + 4, 6) === "Exif\0\0";
const isXmpSegment = (b: Uint8Array, s: Segment) => s.marker === 0xe1 && ascii(b, s.start + 4, 28).startsWith("http://ns.adobe.com/xap/1.0/");
const isIptcSegment = (b: Uint8Array, s: Segment) => s.marker === 0xed && ascii(b, s.start + 4, 14) === "Photoshop 3.0\0";

function inspectJpeg(b: Uint8Array): Inspection | undefined {
  const parsed = jpegSegments(b);
  if (!parsed) return undefined;
  const findings: Finding[] = [];
  let exif: ExifSummary | undefined;
  for (const s of parsed.segments) {
    if (isExifSegment(b, s)) {
      exif = readExif(b.subarray(s.start + 10, s.end));
      findings.push({ kind: "exif", label: exif ? label(exif) : "Camera and shot details" });
    } else if (isXmpSegment(b, s)) findings.push({ kind: "xmp", label: "XMP data (editing history, authors, ratings)" });
    else if (isIptcSegment(b, s)) findings.push({ kind: "iptc", label: "IPTC data (captions, credits, keywords)" });
    else if (s.marker === 0xfe) findings.push({ kind: "comment", label: "A comment" });
  }
  return { format: "jpeg", findings, exif };
}

function stripJpeg(b: Uint8Array, keepOrientation: boolean): Uint8Array {
  const parsed = jpegSegments(b);
  if (!parsed) throw new Error("This JPG file is damaged or not a standard JPG.");
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let upright: number | undefined;
  for (const s of parsed.segments) {
    if (isExifSegment(b, s)) {
      if (keepOrientation) upright = readExif(b.subarray(s.start + 10, s.end))?.orientation;
      continue;
    }
    if (isXmpSegment(b, s) || isIptcSegment(b, s) || s.marker === 0xfe) continue;
    parts.push(b.subarray(s.start, s.end));
  }
  if (upright && upright !== 1) {
    // Put it right after the first segment (normally the JFIF header), as in a regular file.
    const body = orientationOnlyExif(upright);
    const header = new Uint8Array([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff]);
    parts.splice(Math.min(2, parts.length), 0, header, body);
  }
  parts.push(b.subarray(parsed.scanStart));
  return concat(parts);
}

// PNG

const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function pngChunks(b: Uint8Array): { type: string; start: number; end: number }[] | undefined {
  const chunks: { type: string; start: number; end: number }[] = [];
  let at = 8;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (at + 12 <= b.length) {
    const length = view.getUint32(at);
    const end = at + 12 + length;
    if (end > b.length) return undefined;
    chunks.push({ type: ascii(b, at + 4, 4), start: at, end });
    at = end;
    if (chunks[chunks.length - 1]!.type === "IEND") return chunks;
  }
  return undefined;
}

function inspectPng(b: Uint8Array): Inspection | undefined {
  const chunks = pngChunks(b);
  if (!chunks) return undefined;
  const findings: Finding[] = [];
  let exif: ExifSummary | undefined;
  for (const c of chunks) {
    if (c.type === "eXIf") {
      exif = readExif(b.subarray(c.start + 8, c.end - 4));
      findings.push({ kind: "exif", label: exif ? label(exif) : "Camera and shot details" });
    } else if (c.type === "tEXt" || c.type === "zTXt" || c.type === "iTXt") findings.push({ kind: "text", label: `Text note (${ascii(b, c.start + 8, Math.min(20, c.end - c.start - 12)).split("\0")[0]})` });
    else if (c.type === "tIME") findings.push({ kind: "time", label: "Last-changed time" });
  }
  return { format: "png", findings, exif };
}

function stripPng(b: Uint8Array): Uint8Array {
  const chunks = pngChunks(b);
  if (!chunks) throw new Error("This PNG file is damaged.");
  return concat([b.subarray(0, 8), ...chunks.filter((c) => !PNG_METADATA.has(c.type)).map((c) => b.subarray(c.start, c.end))]);
}

// WebP

function webpChunks(b: Uint8Array): { type: string; start: number; end: number }[] | undefined {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: { type: string; start: number; end: number }[] = [];
  let at = 12;
  while (at + 8 <= b.length) {
    const size = view.getUint32(at + 4, true);
    const end = at + 8 + size + (size % 2);
    if (at + 8 + size > b.length) return undefined;
    chunks.push({ type: ascii(b, at, 4), start: at, end: Math.min(end, b.length) });
    at = end;
  }
  return chunks.length ? chunks : undefined;
}

function inspectWebp(b: Uint8Array): Inspection | undefined {
  const chunks = webpChunks(b);
  if (!chunks) return undefined;
  const findings: Finding[] = [];
  let exif: ExifSummary | undefined;
  for (const c of chunks) {
    if (c.type === "EXIF") {
      let data = b.subarray(c.start + 8, c.end);
      if (data.length > 6 && ascii(data, 0, 6) === "Exif\0\0") data = data.subarray(6);
      exif = readExif(data);
      findings.push({ kind: "exif", label: exif ? label(exif) : "Camera and shot details" });
    } else if (c.type === "XMP ") findings.push({ kind: "xmp", label: "XMP data (editing history, authors, ratings)" });
  }
  return { format: "webp", findings, exif };
}

function stripWebp(b: Uint8Array): Uint8Array {
  const chunks = webpChunks(b);
  if (!chunks) throw new Error("This WebP file is damaged.");
  const kept = chunks.filter((c) => c.type !== "EXIF" && c.type !== "XMP ").map((c) => {
    const bytes = b.slice(c.start, c.end);
    if (c.type === "VP8X" && bytes.length > 8) bytes[8] = bytes[8]! & ~0x0c; // clear the "has Exif" and "has XMP" flags
    return bytes;
  });
  const body = concat(kept);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, 4 + body.length, true);
  out.set(body, 12);
  return out;
}

// Public

export function inspectImage(bytes: Uint8Array): Inspection | undefined {
  const format = detectFormat(bytes);
  if (format === "jpeg") return inspectJpeg(bytes);
  if (format === "png") return inspectPng(bytes);
  if (format === "webp") return inspectWebp(bytes);
  return undefined;
}

/** The same picture without the hidden data. For JPG the Orientation tag can be kept so a rotated photo stays upright. */
export function stripMetadata(bytes: Uint8Array, options: { keepOrientation: boolean }): Uint8Array {
  const format = detectFormat(bytes);
  if (format === "jpeg") return stripJpeg(bytes, options.keepOrientation);
  if (format === "png") return stripPng(bytes);
  if (format === "webp") return stripWebp(bytes);
  throw new Error("Please choose a JPG, PNG or WebP image.");
}
