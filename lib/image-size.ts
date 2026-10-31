/**
 * Picture sizes read from the file's own header, with no image library. Used at build time so every image on a page
 * is given its width and height (the page then reserves the space and nothing jumps while it loads), and in the
 * admin to check what a person chose. Supports JPEG, PNG and WebP, the only types the site accepts.
 */
export interface ImageSize {
  width: number;
  height: number;
}

/** File types the site accepts for article images. SVG is left out on purpose: it can carry scripts. */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const isImagePath = (path: string): boolean => new RegExp(`\\.(${IMAGE_EXTENSIONS.join("|")})$`, "i").test(path);

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0;
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

function png(b: Uint8Array): ImageSize | null {
  if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function jpeg(b: Uint8Array): ImageSize | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1]!;
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: u16be(b, i + 5), width: u16be(b, i + 7) };
    i += 2 + u16be(b, i + 2);
  }
  return null;
}

function webp(b: Uint8Array): ImageSize | null {
  if (b.length < 30) return null;
  const kind = ascii(b, 12, 4);
  if (kind === "VP8X") return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  if (kind === "VP8L") {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8 ") return { width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
  return null;
}

/** The size of a JPEG, PNG or WebP file, or null when the bytes are not one of those or are damaged. */
export function imageSizeFromBytes(bytes: Uint8Array): ImageSize | null {
  const size =
    bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" ? png(bytes) : bytes[0] === 0xff && bytes[1] === 0xd8 ? jpeg(bytes) : ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP" ? webp(bytes) : null;
  return size && size.width > 0 && size.height > 0 ? size : null;
}
