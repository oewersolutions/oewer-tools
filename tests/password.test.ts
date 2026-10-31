import { describe, expect, it } from "vitest";
import { CHARACTER_SETS, checkOptions, entropyBits, generatePassword, LOOKALIKES, poolFor, randomBelow, strengthOf, type RandomSource } from "../lib/tools/password";

/** A source that plays back fixed numbers, then repeats the last. */
const fixed = (...values: number[]): RandomSource => {
  let i = 0;
  return (buffer) => {
    buffer[0] = values[Math.min(i++, values.length - 1)]!;
  };
};
/** A small deterministic generator (mulberry32) so statistical tests are repeatable. */
const seeded = (seed: number): RandomSource => {
  let a = seed;
  return (buffer) => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    buffer[0] = (t ^ (t >>> 14)) >>> 0;
  };
};

describe("randomBelow", () => {
  it("returns a value in range", () => {
    expect(randomBelow(10, fixed(123456789))).toBe(9);
    expect(randomBelow(1, fixed(4_000_000_000))).toBe(0);
  });
  it("throws away numbers from the uneven tail instead of folding them in", () => {
    // 2^32 % 10 = 6, so values from 4294967290 up are rejected and the next draw is used.
    expect(randomBelow(10, fixed(4294967295, 4294967290, 7))).toBe(7);
    expect(randomBelow(10, fixed(4294967289))).toBe(9);
  });
  it("is even across values (chi-squared on a seeded stream)", () => {
    const source = seeded(1);
    const counts = new Array(7).fill(0);
    const draws = 70_000;
    for (let i = 0; i < draws; i++) counts[randomBelow(7, source)]++;
    const expected = draws / 7;
    const chi = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(22.46); // 6 degrees of freedom, p = 0.001
  });
  it("rejects a bad range", () => {
    expect(() => randomBelow(0, fixed(1))).toThrow();
    expect(() => randomBelow(1.5, fixed(1))).toThrow();
  });
});

describe("pools", () => {
  it("joins the chosen sets and removes look-alikes on request", () => {
    expect(poolFor(["digits"], false)).toBe("0123456789");
    expect(poolFor(["digits", "digits"], false)).toBe("0123456789");
    expect(poolFor(["digits"], true)).toBe("23456789");
    const all = poolFor(["lower", "upper", "digits", "symbols"], true);
    for (const c of LOOKALIKES) expect(all.includes(c)).toBe(false);
    expect(poolFor(["lower", "upper", "digits", "symbols"], false)).toHaveLength(26 + 26 + 10 + CHARACTER_SETS.symbols.characters.length);
  });
});

describe("generatePassword", () => {
  const all = ["lower", "upper", "digits", "symbols"] as const;
  it("has the requested length and uses only the pool", () => {
    const pw = generatePassword({ length: 20, sets: ["lower", "digits"], avoidLookalikes: false }, seeded(2));
    expect(pw).toHaveLength(20);
    expect(pw).toMatch(/^[a-z0-9]+$/);
  });
  it("always includes every chosen kind", () => {
    const source = seeded(3);
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword({ length: 8, sets: [...all], avoidLookalikes: false }, source);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
  });
  it("never uses a look-alike when asked", () => {
    const source = seeded(4);
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword({ length: 32, sets: [...all], avoidLookalikes: true }, source);
      for (const c of LOOKALIKES) expect(pw.includes(c)).toBe(false);
    }
  });
  it("uses every character of the pool about equally often", () => {
    const source = seeded(5);
    const pool = poolFor(["lower"], false);
    const counts = new Map<string, number>();
    for (let i = 0; i < 1000; i++) for (const c of generatePassword({ length: 64, sets: ["lower"], avoidLookalikes: false }, source)) counts.set(c, (counts.get(c) ?? 0) + 1);
    const expected = (1000 * 64) / pool.length;
    for (const c of pool) expect(Math.abs((counts.get(c) ?? 0) - expected) / expected).toBeLessThan(0.1);
  });
  it("gives a different password each time", () => {
    const source = seeded(6);
    const set = new Set(Array.from({ length: 50 }, () => generatePassword({ length: 16, sets: [...all], avoidLookalikes: false }, source)));
    expect(set.size).toBe(50);
  });
  it("refuses impossible options", () => {
    expect(() => generatePassword({ length: 7, sets: ["lower"], avoidLookalikes: false }, seeded(1))).toThrow();
    expect(() => generatePassword({ length: 65, sets: ["lower"], avoidLookalikes: false }, seeded(1))).toThrow();
    expect(() => generatePassword({ length: 12, sets: [], avoidLookalikes: false }, seeded(1))).toThrow();
  });
});

describe("strength", () => {
  it("is log2 of the pool for each character", () => {
    expect(entropyBits(10, 2)).toBe(10);
    expect(entropyBits(16, 94)).toBeCloseTo(104.87, 1);
    expect(entropyBits(8, 1)).toBe(0);
  });
  it("labels by bits", () => {
    expect(strengthOf(30)).toBe("Weak");
    expect(strengthOf(55)).toBe("Fair");
    expect(strengthOf(80)).toBe("Strong");
    expect(strengthOf(128)).toBe("Very strong");
  });
});

describe("checkOptions", () => {
  it("accepts a normal choice", () => {
    const r = checkOptions({ length: "16" }, ["lower", "upper", "digits"], false);
    expect(r.errors).toEqual({});
    expect(r.pool).toBe(62);
    expect(r.bits).toBeCloseTo(95.27, 1);
    expect(r.strength).toBe("Strong");
  });
  it("explains a bad length and an empty choice", () => {
    expect(checkOptions({ length: "4" }, ["lower"], false).errors.length).toMatch(/8/);
    expect(checkOptions({ length: "99" }, ["lower"], false).errors.length).toMatch(/64/);
    expect(checkOptions({ length: "12.5" }, ["lower"], false).errors.length).toMatch(/whole/);
    expect(checkOptions({ length: "abc" }, ["lower"], false).errors.length).toMatch(/number/);
    expect(checkOptions({ length: "12" }, [], false).errors.sets).toMatch(/at least one/);
  });
});
