/** Password generation for the generator tool. Pure functions; the source of randomness is passed in so tests can control it. */

import { readNumber } from "./finance";

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

export type CharacterSet = "lower" | "upper" | "digits" | "symbols";

export const CHARACTER_SETS: Record<CharacterSet, { label: string; characters: string }> = {
  lower: { label: "Lowercase letters (a–z)", characters: "abcdefghijklmnopqrstuvwxyz" },
  upper: { label: "Uppercase letters (A–Z)", characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  digits: { label: "Numbers (0–9)", characters: "0123456789" },
  symbols: { label: "Symbols (!@#$…)", characters: "!@#$%^&*()-_=+[]{}:;,.?/" },
};

/** Characters that are easy to mistake for one another when read or typed by hand. */
export const LOOKALIKES = "Il1|O0o";

export interface PasswordOptions {
  length: number;
  sets: CharacterSet[];
  avoidLookalikes: boolean;
}

/** Fills the array with random 32-bit numbers. In the browser this is `crypto.getRandomValues`. */
export type RandomSource = (buffer: Uint32Array) => void;

const TWO_POW_32 = 2 ** 32;

/**
 * A whole number from 0 to `max - 1`, every value equally likely. A plain remainder (`random % max`) would make the
 * lower values slightly more likely whenever `max` does not divide 2^32 evenly, so numbers from the uneven tail are
 * thrown away and another is drawn (rejection sampling).
 */
export function randomBelow(max: number, source: RandomSource): number {
  if (!Number.isInteger(max) || max < 1 || max > TWO_POW_32) throw new Error("max must be a whole number from 1 to 2^32.");
  const limit = TWO_POW_32 - (TWO_POW_32 % max);
  const buffer = new Uint32Array(1);
  for (;;) {
    source(buffer);
    const value = buffer[0]!;
    if (value < limit) return value % max;
  }
}

/** The characters a password with these options can use. */
export function poolFor(sets: CharacterSet[], avoidLookalikes: boolean): string {
  const unique = [...new Set(sets)];
  const all = unique.map((s) => CHARACTER_SETS[s].characters).join("");
  return avoidLookalikes ? [...all].filter((c) => !LOOKALIKES.includes(c)).join("") : all;
}

/**
 * A random password. Each position is drawn evenly from the whole pool. If a chosen kind of character is missing from
 * the result the whole password is drawn again, rather than patching one position, so every password that has all the
 * chosen kinds is equally likely.
 */
export function generatePassword(options: PasswordOptions, source: RandomSource): string {
  const { length, sets, avoidLookalikes } = options;
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) throw new Error(`Length must be from ${MIN_LENGTH} to ${MAX_LENGTH}.`);
  const unique = [...new Set(sets)];
  if (unique.length === 0) throw new Error("Choose at least one kind of character.");
  const pool = [...poolFor(unique, avoidLookalikes)];
  const groups = unique.map((s) => new Set([...CHARACTER_SETS[s].characters].filter((c) => !avoidLookalikes || !LOOKALIKES.includes(c))));
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const chars: string[] = [];
    for (let i = 0; i < length; i++) chars.push(pool[randomBelow(pool.length, source)]!);
    if (groups.every((g) => chars.some((c) => g.has(c)))) return chars.join("");
  }
  throw new Error("Could not draw a password that uses every chosen kind of character.");
}

/** Bits of strength of a password drawn evenly at random: log2(pool size) for each character. */
export function entropyBits(length: number, poolSize: number): number {
  return poolSize <= 1 ? 0 : length * Math.log2(poolSize);
}

export type Strength = "Weak" | "Fair" | "Strong" | "Very strong";
export function strengthOf(bits: number): Strength {
  if (bits < 50) return "Weak";
  if (bits < 70) return "Fair";
  if (bits < 100) return "Strong";
  return "Very strong";
}

export interface PasswordRaw extends Record<string, string> {
  length: string;
}
export interface PasswordCheck {
  errors: { length?: string; sets?: string };
  options?: PasswordOptions;
  pool?: number;
  bits?: number;
  strength?: Strength;
}

/** Check what the visitor chose and say how strong a password made with those choices will be. */
export function checkOptions(raw: PasswordRaw, sets: CharacterSet[], avoidLookalikes: boolean): PasswordCheck {
  const errors: PasswordCheck["errors"] = {};
  const state = readNumber(raw.length, "Length", { min: MIN_LENGTH, max: MAX_LENGTH, integer: true });
  if ("error" in state) errors.length = state.error.replace(/less than \d+/, `less than ${MIN_LENGTH}`);
  else if ("empty" in state) errors.length = undefined;
  if (sets.length === 0) errors.sets = "Choose at least one kind of character.";
  if (!("value" in state) || sets.length === 0) return { errors };
  const pool = poolFor(sets, avoidLookalikes).length;
  const bits = entropyBits(state.value, pool);
  return { errors, options: { length: state.value, sets, avoidLookalikes }, pool, bits, strength: strengthOf(bits) };
}

export const formatBits = (bits: number): string => `${Math.floor(bits)} bits`;
