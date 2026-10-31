/** UUID generation for the UUID tool. The random source is passed in so tests can control it. */

import type { RandomSource } from "./password";

export type UuidVersion = "4" | "7";
export const MAX_UUIDS = 100;

const hex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function randomBytes(count: number, source: RandomSource): Uint8Array {
  const words = new Uint32Array(Math.ceil(count / 4));
  source(words);
  const bytes = new Uint8Array(words.length * 4);
  const view = new DataView(bytes.buffer);
  words.forEach((w, i) => view.setUint32(i * 4, w));
  return bytes.subarray(0, count);
}

const hyphenate = (h: string): string => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

/** Version 4 (RFC 9562 section 5.4): 122 random bits, with the version and variant bits set. */
export function uuidV4(source: RandomSource): string {
  const b = randomBytes(16, source);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return hyphenate(hex(b));
}

/** Version 7 (RFC 9562 section 5.7): a 48-bit Unix time in milliseconds, then random bits, so UUIDs sort by creation time. */
export function uuidV7(source: RandomSource, now: number): string {
  if (!Number.isInteger(now) || now < 0 || now >= 2 ** 48) throw new Error("The time must be a whole number of milliseconds that fits in 48 bits.");
  const b = randomBytes(16, source);
  const time = BigInt(now);
  for (let i = 0; i < 6; i++) b[i] = Number((time >> BigInt(8 * (5 - i))) & 0xffn);
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return hyphenate(hex(b));
}

export interface UuidOptions {
  version: UuidVersion;
  count: number;
  uppercase: boolean;
  hyphens: boolean;
}

export function generateUuids(options: UuidOptions, source: RandomSource, now: number): string[] {
  const { version, count, uppercase, hyphens } = options;
  if (!Number.isInteger(count) || count < 1 || count > MAX_UUIDS) throw new Error(`Count must be from 1 to ${MAX_UUIDS}.`);
  return Array.from({ length: count }, () => {
    let id = version === "7" ? uuidV7(source, now) : uuidV4(source);
    if (!hyphens) id = id.replace(/-/g, "");
    return uppercase ? id.toUpperCase() : id;
  });
}
