import { IMAGE_EXTENSIONS, imageSizeFromBytes } from "../image-size";

/**
 * Picture handling for the article editor. The rules here are plain functions (tested without a browser); the part
 * that needs a canvas is `prepareImage`, which runs only in the visitor's browser.
 */

export type PictureKind = "cover" | "inline";

export const LIMITS = {
  /** The biggest file a person may choose. Phone photos are usually 2 to 8 MB. */
  maxInputBytes: 25 * 1024 * 1024,
  /** Refuse absurdly large pictures (a decoded 100 megapixel image needs about 400 MB of memory). */
  maxInputPixels: 80_000_000,
  /** What a saved picture should weigh: quality is lowered until it fits. */
  targetBytes: 300 * 1024,
  /** Never save anything heavier than this, whatever the quality. */
  maxOutputBytes: 800 * 1024,
  minQuality: 0.5,
  startQuality: 0.82,
} as const;

/** The widths saved for each kind of picture: a full size and a half-size copy for phones. */
export const TARGET_WIDTHS: Record<
  PictureKind,
  { full: number; small: number }
> = {
  cover: { full: 1600, small: 800 },
  inline: { full: 1200, small: 600 },
};

export interface PlannedSize {
  width: number;
  height: number;
  role: "full" | "small";
}

/** The sizes to save for a source picture. Pictures are never enlarged, and a small copy is made only when it is smaller. */
export function planSizes(
  kind: PictureKind,
  sourceWidth: number,
  sourceHeight: number,
): PlannedSize[] {
  const target = TARGET_WIDTHS[kind];
  const full = Math.min(target.full, sourceWidth);
  const height = (w: number) =>
    Math.max(1, Math.round((sourceHeight * w) / sourceWidth));
  const sizes: PlannedSize[] = [
    { width: full, height: height(full), role: "full" },
  ];
  const small = Math.min(target.small, Math.round(full / 2));
  if (small >= 200 && small < full)
    sizes.push({ width: small, height: height(small), role: "small" });
  return sizes;
}

/** A safe file-name part from what the person's file was called: lower case letters, digits and single hyphens. */
export function cleanName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  const name = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return name || "image";
}

/** First six hex characters of the file's SHA-256: the same picture always gets the same name, a different one never collides. */
export async function shortHash(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as ArrayBuffer,
  );
  return [...new Uint8Array(digest)]
    .slice(0, 3)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const extensionFor = (
  type: "image/webp" | "image/jpeg",
): "webp" | "jpg" => (type === "image/webp" ? "webp" : "jpg");

/** Where a saved copy goes on the site: `/images/blog/<article>/<name>-<hash>-<width>.<ext>`. */
export function sitePathFor(args: {
  slug: string;
  kind: PictureKind;
  fileName: string;
  hash: string;
  width: number;
  extension: string;
}): string {
  const name = args.kind === "cover" ? "cover" : cleanName(args.fileName);
  return `/images/blog/${args.slug}/${name}-${args.hash}-${args.width}.${args.extension}`;
}

export function describeBytes(n: number): string {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export type PickResult =
  { ok: true; width: number; height: number } | { ok: false; message: string };

/**
 * Check a chosen file before anything is done with it. The type is judged by the file's own first bytes, not by its
 * name, so a renamed file cannot slip through.
 */
export function checkPicked(
  file: { size: number },
  bytes: Uint8Array,
): PickResult {
  if (file.size === 0) return { ok: false, message: "That file is empty." };
  if (file.size > LIMITS.maxInputBytes)
    return {
      ok: false,
      message: `That file is ${describeBytes(file.size)}. The limit is ${describeBytes(LIMITS.maxInputBytes)}; make it smaller first.`,
    };
  const size = imageSizeFromBytes(bytes);
  if (!size)
    return {
      ok: false,
      message: `Only ${IMAGE_EXTENSIONS.join(", ")} pictures can be used (SVG and GIF are not accepted).`,
    };
  if (size.width * size.height > LIMITS.maxInputPixels)
    return {
      ok: false,
      message: `That picture is ${size.width} × ${size.height} pixels, too large to process in the browser. Make it smaller first.`,
    };
  return { ok: true, ...size };
}

export interface PreparedFile {
  width: number;
  height: number;
  bytes: Uint8Array;
  role: "full" | "small";
  type: "image/webp" | "image/jpeg";
  /** A temporary address to show the result in the page (create with URL.createObjectURL, release when done). */
  blob: Blob;
}

/**
 * Resize and compress a picture in the browser: decode it (honouring the camera's rotation), draw it at each planned
 * size, and save as WebP, or JPEG where the browser cannot make WebP (Safari). Quality is lowered a step at a time
 * until the file is about 300 KB or less. Nothing leaves the device here.
 */
export async function prepareImage(
  file: File,
  kind: PictureKind,
  encode: { webp: boolean },
): Promise<PreparedFile[]> {
  const { decodeImage, encodeImage } = await import("../tools/image-canvas");
  const bitmap = await decodeImage(file);
  try {
    const type = encode.webp ? "image/webp" : "image/jpeg";
    const out: PreparedFile[] = [];
    for (const size of planSizes(kind, bitmap.width, bitmap.height)) {
      let quality: number = LIMITS.startQuality;
      let blob = await encodeImage(bitmap, {
        width: size.width,
        height: size.height,
        type,
        quality,
      });
      while (
        blob.size > LIMITS.targetBytes &&
        quality - 0.08 >= LIMITS.minQuality
      ) {
        quality -= 0.08;
        blob = await encodeImage(bitmap, {
          width: size.width,
          height: size.height,
          type,
          quality,
        });
      }
      if (blob.size > LIMITS.maxOutputBytes)
        throw new Error(
          `The ${size.width} pixel version is still ${describeBytes(blob.size)} after compressing. Try a simpler or smaller picture.`,
        );
      out.push({
        ...size,
        type,
        blob,
        bytes: new Uint8Array(await blob.arrayBuffer()),
      });
    }
    return out;
  } finally {
    bitmap.close();
  }
}
