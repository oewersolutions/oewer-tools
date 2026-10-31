/** Base64 and URL (percent) encoding for the developer tools. Pure functions, no DOM, so they are unit tested directly. */

export type Result = { ok: true; value: string } | { ok: false; error: string };

// Base64

export type Base64Variant = "standard" | "url" | "url-unpadded";

const bytesToBinary = (bytes: Uint8Array): string => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return out;
};

/** Encode text (as UTF-8) in Base64. The URL variants use - and _ for + and /, as in RFC 4648 section 5. */
export function base64Encode(text: string, variant: Base64Variant = "standard"): string {
  const standard = btoa(bytesToBinary(new TextEncoder().encode(text)));
  if (variant === "standard") return standard;
  const url = standard.replace(/\+/g, "-").replace(/\//g, "_");
  return variant === "url" ? url : url.replace(/=+$/, "");
}

/** Decode Base64 (either alphabet, with or without padding, spaces and line breaks ignored) to UTF-8 text. */
export function base64Decode(input: string): Result {
  const compact = input.replace(/\s+/g, "");
  if (compact === "") return { ok: true, value: "" };
  const body = compact.replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/_-]*$/.test(body) || (/[+/]/.test(body) && /[_-]/.test(body))) {
    return { ok: false, error: "This is not valid Base64. It may only contain letters, numbers, + and / (or - and _ in the URL-safe form), with = at the end." };
  }
  if (compact.length - body.length > 2 || body.length % 4 === 1) return { ok: false, error: "This is not valid Base64: the length does not fit. Some of the text may be missing." };
  const standard = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return { ok: false, error: "This is not valid Base64." };
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: "This is valid Base64, but it does not decode to text (it may be an image or another file)." };
  }
}

/** The length of the Base64 text for a given number of bytes, with padding: 4 characters for every 3 bytes, rounded up. */
export const base64Length = (bytes: number): number => Math.ceil(bytes / 3) * 4;

// URL encoding

export type UrlMode = "component" | "url" | "form";

export const URL_MODE_LABELS: Record<UrlMode, string> = {
  component: "Part of a URL (a query value or path piece)",
  url: "Whole URL (keep / ? & = # : and similar)",
  form: "Form data (space becomes +)",
};

export function urlEncode(text: string, mode: UrlMode): Result {
  try {
    if (mode === "url") return { ok: true, value: encodeURI(text) };
    const encoded = encodeURIComponent(text);
    return { ok: true, value: mode === "form" ? encoded.replace(/%20/g, "+") : encoded };
  } catch {
    return { ok: false, error: "This text has a broken character (half of an emoji or similar) that cannot be encoded." };
  }
}

export function urlDecode(text: string, mode: UrlMode): Result {
  try {
    const source = mode === "form" ? text.replace(/\+/g, " ") : text;
    return { ok: true, value: mode === "url" ? decodeURI(source) : decodeURIComponent(source) };
  } catch {
    return { ok: false, error: "This is not valid percent-encoding. Every % must be followed by two hex digits (0 to 9, A to F), and the bytes must make valid UTF-8 text." };
  }
}
