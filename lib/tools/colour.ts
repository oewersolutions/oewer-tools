/** Colour conversion and contrast for the colour converter. Pure functions, no DOM, so they are unit tested directly. */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0 to 1 */
  a: number;
}
export interface Hsl {
  /** 0 to 360 */
  h: number;
  /** 0 to 100 */
  s: number;
  /** 0 to 100 */
  l: number;
}

export type ParsedColour = { ok: true; colour: Rgba } | { ok: false; error: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const NUM = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)";

const BAD = "That is not a colour I can read. Try a hex code like #1a73e8, rgb(26, 115, 232) or hsl(214, 82%, 51%).";

function channel(text: string): number | undefined {
  const m = new RegExp(`^(${NUM})(%?)$`).exec(text);
  if (!m) return undefined;
  const v = Number(m[1]);
  return m[2] ? (clamp(v, 0, 100) / 100) * 255 : clamp(v, 0, 255);
}
function alphaOf(text: string | undefined): number | undefined {
  if (text === undefined) return 1;
  const m = new RegExp(`^(${NUM})(%?)$`).exec(text);
  if (!m) return undefined;
  const v = Number(m[1]);
  return clamp(m[2] ? v / 100 : v, 0, 1);
}

/** Read a hex code (3, 4, 6 or 8 digits, # optional), an rgb()/rgba() or an hsl()/hsla() colour. */
export function parseColour(input: string): ParsedColour {
  const text = input.trim().toLowerCase();
  if (text === "") return { ok: false, error: BAD };

  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { ok: true, colour: { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1 } };
  }

  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/.exec(text);
  if (!fn) return { ok: false, error: BAD };
  const kind = fn[1]!.slice(0, 3);
  // Both the comma form and the modern space-and-slash form are accepted.
  const parts = fn[2]!.replace(/[,/]/g, " ").trim().split(/\s+/);
  if (parts.length !== 3 && parts.length !== 4) return { ok: false, error: BAD };
  const a = alphaOf(parts[3]);
  if (a === undefined) return { ok: false, error: BAD };

  if (kind === "rgb") {
    const [r, g, b] = [channel(parts[0]!), channel(parts[1]!), channel(parts[2]!)];
    if (r === undefined || g === undefined || b === undefined) return { ok: false, error: BAD };
    return { ok: true, colour: { r: Math.round(r), g: Math.round(g), b: Math.round(b), a } };
  }
  const hue = new RegExp(`^(${NUM})(?:deg)?$`).exec(parts[0]!);
  const s = new RegExp(`^(${NUM})%?$`).exec(parts[1]!);
  const l = new RegExp(`^(${NUM})%?$`).exec(parts[2]!);
  if (!hue || !s || !l) return { ok: false, error: BAD };
  const rgb = hslToRgb({ h: Number(hue[1]), s: clamp(Number(s[1]), 0, 100), l: clamp(Number(l[1]), 0, 100) });
  return { ok: true, colour: { ...rgb, a } };
}

export function hslToRgb({ h, s, l }: Hsl): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): Hsl {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: s * 100, l: l * 100 };
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
const round = (n: number, places = 0) => Number(n.toFixed(places));

export function toHex(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${c.a < 1 ? hex2(c.a * 255) : ""}`;
}
export function toRgbString(c: Rgba): string {
  return c.a < 1 ? `rgb(${c.r} ${c.g} ${c.b} / ${round(c.a, 3)})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
}
export function toHslString(c: Rgba): string {
  const { h, s, l } = rgbToHsl(c);
  return c.a < 1 ? `hsl(${round(h)} ${round(s)}% ${round(l)}% / ${round(c.a, 3)})` : `hsl(${round(h)}, ${round(s)}%, ${round(l)}%)`;
}

// WCAG 2.2 relative luminance and contrast ratio.
const linear = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const relativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

export function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface Contrast {
  against: "white" | "black";
  ratio: number;
  /** AA normal text 4.5, AA large text 3, AAA normal text 7 */
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
}
/** How the colour reads as text on white and on black. Transparent colours are judged as if opaque. */
export function contrastAgainstWhiteAndBlack(c: { r: number; g: number; b: number }): Contrast[] {
  return (["white", "black"] as const).map((against) => {
    const ratio = contrastRatio(c, against === "white" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 });
    return { against, ratio, aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7 };
  });
}
