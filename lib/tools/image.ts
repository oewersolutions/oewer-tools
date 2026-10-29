/** Helpers for the in-browser image tools. Pure functions, so they are unit tested without a browser. */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export const TYPE_LABELS: Record<ImageType, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };
const EXTENSIONS: Record<ImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PIXELS = 50_000_000;
export const MAX_DIMENSION = 16_384;

export const isImageType = (type: string): type is ImageType => (IMAGE_TYPES as readonly string[]).includes(type);
export const isLossy = (type: ImageType): boolean => type !== "image/png";

/** Why a chosen file cannot be used, or null when it is fine. */
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!isImageType(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}

export function checkImageSize(width: number, height: number): string | null {
  if (width * height > MAX_PIXELS) return `That image is ${width} × ${height} pixels, which is too large to process in a browser.`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** "photo.final.png" + WebP + "compressed" -> "photo.final-compressed.webp". */
export function outputName(original: string, type: ImageType, suffix: string): string {
  const dot = original.lastIndexOf(".");
  const base = (dot > 0 ? original.slice(0, dot) : original).replace(/[^\w.\- ]+/g, "_") || "image";
  return `${base}-${suffix}.${EXTENSIONS[type]}`;
}

/** Percentage saved, negative when the new file is larger. */
export function savedPercent(originalBytes: number, newBytes: number): number {
  return originalBytes === 0 ? 0 : ((originalBytes - newBytes) / originalBytes) * 100;
}

export const heightForWidth = (naturalW: number, naturalH: number, width: number): number => Math.max(1, Math.round((width * naturalH) / naturalW));
export const widthForHeight = (naturalW: number, naturalH: number, height: number): number => Math.max(1, Math.round((height * naturalW) / naturalH));

export function scaleByPercent(naturalW: number, naturalH: number, percent: number): { width: number; height: number } {
  return { width: Math.max(1, Math.round((naturalW * percent) / 100)), height: Math.max(1, Math.round((naturalH * percent) / 100)) };
}

/** Whole-pixel size typed by the visitor, or an error message. */
export function readDimension(raw: string, label: string): { value: number } | { error: string } | { empty: true } {
  const text = raw.trim();
  if (text === "") return { empty: true };
  if (!/^\d+$/.test(text)) return { error: `${label} must be a whole number of pixels.` };
  const value = Number(text);
  if (value < 1) return { error: `${label} must be at least 1.` };
  if (value > MAX_DIMENSION) return { error: `${label} cannot be more than ${MAX_DIMENSION.toLocaleString("en-IN")}.` };
  return { value };
}
