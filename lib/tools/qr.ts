import qrcode from "qrcode-generator";

/** QR code generation. The encoder runs entirely in the browser. */

export const MAX_QR_CHARS = 1000;
export type ErrorCorrection = "L" | "M" | "Q" | "H";

// Encode as UTF-8 so accents, ₹ and emoji scan correctly (the library defaults to a single byte per character).
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));

export type QrResult = { ok: true; modules: boolean[][] } | { ok: false; error: string };

export function buildQr(text: string, level: ErrorCorrection): QrResult {
  if (text === "") return { ok: false, error: "" };
  if (text.length > MAX_QR_CHARS) return { ok: false, error: `That is too long for a QR code that scans reliably. The limit is ${MAX_QR_CHARS} characters.` };
  try {
    const qr = qrcode(0, level);
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    return { ok: true, modules: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c))) };
  } catch {
    return { ok: false, error: "That text does not fit in a QR code. Try something shorter, or a lower error correction level." };
  }
}

export interface QrStyle {
  /** Width and height of the whole image in pixels. */
  size: number;
  /** Quiet zone, in modules. Scanners need at least 4. */
  margin: number;
  foreground: string;
  background: string;
}

/** SVG markup: one path for all dark modules, so the file stays small. */
export function qrSvg(modules: boolean[][], { size, margin, foreground, background }: QrStyle): string {
  const total = modules.length + margin * 2;
  let path = "";
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) path += `M${c + margin} ${r + margin}h1v1h-1z`;
    }),
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${background}"/><path d="${path}" fill="${foreground}"/></svg>`
  );
}
