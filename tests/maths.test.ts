import { describe, expect, it } from "vitest";
import {
  evaluateFractions,
  gcd,
  type FractionRaw,
} from "../lib/tools/fractions";
import { evaluateStats, parseNumbers } from "../lib/tools/statistics";
import { evaluateTriangle, type TriangleRaw } from "../lib/tools/triangle";
import {
  checkRandom,
  drawNumbers,
  randomBelow,
  type RandomRaw,
  type RandomSource,
} from "../lib/tools/random";
import { evaluateExpression } from "../lib/tools/expression";

const frac = (o: Partial<FractionRaw> = {}): FractionRaw => ({
  op: "add",
  whole1: "",
  num1: "1",
  den1: "2",
  whole2: "",
  num2: "1",
  den2: "3",
  ...o,
});

describe("fractions", () => {
  it("adds with a common denominator", () => {
    const r = evaluateFractions(frac()).result!;
    expect(r.fraction).toBe("5/6");
    expect(r.decimal).toBe("0.8333333333");
    expect(r.workings.steps.join(" ")).toContain(
      "Lowest common denominator of 2 and 3 is 6",
    );
  });
  it("subtracts, simplifies and goes negative", () => {
    expect(
      evaluateFractions(
        frac({ op: "subtract", num1: "3", den1: "4", num2: "1", den2: "4" }),
      ).result!.fraction,
    ).toBe("1/2");
    expect(
      evaluateFractions(
        frac({ op: "subtract", num1: "1", den1: "3", num2: "1", den2: "2" }),
      ).result!.fraction,
    ).toBe("−1/6");
  });
  it("multiplies and divides", () => {
    expect(
      evaluateFractions(
        frac({ op: "multiply", num1: "2", den1: "3", num2: "3", den2: "4" }),
      ).result!.fraction,
    ).toBe("1/2");
    const d = evaluateFractions(
      frac({ op: "divide", num1: "1", den1: "2", num2: "3", den2: "4" }),
    ).result!;
    expect(d.fraction).toBe("2/3");
    expect(d.workings.steps.join(" ")).toContain("reciprocal");
  });
  it("handles mixed numbers and gives a mixed result", () => {
    const r = evaluateFractions(
      frac({
        whole1: "1",
        num1: "1",
        den1: "2",
        whole2: "2",
        num2: "3",
        den2: "4",
      }),
    ).result!;
    expect(r.fraction).toBe("17/4");
    expect(r.mixed).toBe("4 1/4");
  });
  it("returns whole numbers without a denominator", () => {
    const r = evaluateFractions(
      frac({ num1: "1", den1: "2", num2: "1", den2: "2" }),
    ).result!;
    expect(r.fraction).toBe("1");
    expect(r.mixed).toBe("1");
  });
  it("accepts a whole number on its own, and a minus sign", () => {
    expect(
      evaluateFractions(
        frac({
          whole1: "3",
          num1: "",
          den1: "",
          op: "multiply",
          num2: "1",
          den2: "2",
        }),
      ).result!.fraction,
    ).toBe("3/2");
    expect(
      evaluateFractions(frac({ whole1: "-1", num1: "1", den1: "2" })).result!
        .decimal,
    ).toBe("−1.1666666667");
  });
  it("stays exact with large numbers", () => {
    const r = evaluateFractions(
      frac({
        op: "multiply",
        num1: "999999999",
        den1: "999999998",
        num2: "999999997",
        den2: "999999999",
      }),
    ).result!;
    expect(r.fraction).toBe("999999997/999999998");
    expect(gcd(48n, 18n)).toBe(6n);
  });
  it("waits for input and reports problems", () => {
    expect(evaluateFractions(frac({ num1: "" })).result).toBeUndefined();
    expect(evaluateFractions(frac({ den1: "0" })).errors.first).toMatch(
      /cannot be 0/,
    );
    expect(evaluateFractions(frac({ num1: "1.5" })).errors.first).toMatch(
      /whole number/,
    );
    expect(
      evaluateFractions(frac({ op: "divide", num2: "0" })).errors.second,
    ).toMatch(/divide by zero/);
  });
});

describe("standard deviation", () => {
  const stats = (
    values: string,
    kind: "sample" | "population" = "population",
  ) => evaluateStats({ values, kind });
  it("matches the textbook example", () => {
    const r = stats("2, 4, 4, 4, 5, 5, 7, 9").result!;
    expect(r.mean).toBe(5);
    expect(r.variance).toBe(4);
    expect(r.deviation).toBe(2);
    expect(r.median).toBe(4.5);
    expect(r.workings.steps.join(" ")).toContain("Divide by n = 8");
  });
  it("divides by n − 1 for a sample", () => {
    const r = stats("2 4 4 4 5 5 7 9", "sample").result!;
    expect(r.variance).toBeCloseTo(32 / 7, 10);
    expect(r.deviation).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(r.otherDeviation).toBe(2);
  });
  it("accepts new lines and decimals, and rejects text", () => {
    expect(parseNumbers("1.5\n2.5;3").numbers).toEqual([1.5, 2.5, 3]);
    expect(stats("1, two, 3").errors.values).toMatch(/two/);
  });
  it("needs two numbers for a sample", () => {
    expect(stats("5", "sample").errors.values).toMatch(/at least two/);
    expect(stats("5").result!.deviation).toBe(0);
    expect(stats("").result).toBeUndefined();
  });
});

const tri = (o: Partial<TriangleRaw>): TriangleRaw => ({
  mode: "sss",
  a: "",
  b: "",
  c: "",
  angleA: "",
  angleB: "",
  angleC: "",
  ...o,
});

describe("triangle", () => {
  it("solves 3-4-5 from three sides", () => {
    const r = evaluateTriangle(tri({ a: "3", b: "4", c: "5" })).result!;
    expect(r.A).toBeCloseTo(36.8699, 3);
    expect(r.B).toBeCloseTo(53.1301, 3);
    expect(r.C).toBeCloseTo(90, 8);
    expect(r.area).toBeCloseTo(6, 10);
    expect(r.perimeter).toBe(12);
    expect(r.byAngles).toBe("Right");
    expect(r.bySides).toBe("Scalene");
  });
  it("rejects sides that cannot close", () => {
    expect(evaluateTriangle(tri({ a: "1", b: "2", c: "5" })).errors.a).toMatch(
      /cannot make a triangle/,
    );
  });
  it("solves from two sides and the angle between", () => {
    const r = evaluateTriangle(
      tri({ mode: "sas", a: "3", b: "4", angleC: "90" }),
    ).result!;
    expect(r.c).toBeCloseTo(5, 10);
    expect(r.A).toBeCloseTo(36.8699, 3);
    expect(r.B).toBeCloseTo(53.1301, 3);
    expect(r.area).toBeCloseTo(6, 10);
  });
  it("solves from two angles and a side", () => {
    const r = evaluateTriangle(
      tri({ mode: "aas", angleA: "30", angleB: "60", a: "5" }),
    ).result!;
    expect(r.C).toBe(90);
    expect(r.b).toBeCloseTo(8.660254, 5);
    expect(r.c).toBeCloseTo(10, 10);
    expect(
      evaluateTriangle(
        tri({ mode: "aas", angleA: "100", angleB: "80", a: "5" }),
      ).errors.angleB,
    ).toMatch(/less than 180/);
  });
  it("names equilateral and obtuse triangles", () => {
    const e = evaluateTriangle(tri({ a: "6", b: "6", c: "6" })).result!;
    expect(e.bySides).toBe("Equilateral");
    expect(e.A).toBeCloseTo(60, 8);
    expect(
      evaluateTriangle(tri({ a: "2", b: "2", c: "3" })).result!.byAngles,
    ).toBe("Obtuse");
    expect(
      evaluateTriangle(tri({ a: "2", b: "2", c: "3" })).result!.bySides,
    ).toBe("Isosceles");
  });
  it("waits for input", () => {
    expect(evaluateTriangle(tri({ a: "3", b: "4" })).result).toBeUndefined();
  });
});

/** A source that plays back fixed 53-bit draws, for repeatable tests. */
const playback = (draws: number[]): RandomSource => {
  let i = 0;
  return (buffer) => {
    const d = draws[i++ % draws.length]!;
    buffer[0] = Math.floor(d / 2 ** 32) & 0x1fffff;
    buffer[1] = d % 2 ** 32;
  };
};
const seeded = (seed: number): RandomSource => {
  let s = seed >>> 0;
  return (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      // mulberry32
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      buffer[i] = (t ^ (t >>> 14)) >>> 0;
    }
  };
};
const rnd = (o: Partial<RandomRaw> = {}): RandomRaw => ({
  min: "1",
  max: "100",
  count: "5",
  kind: "integer",
  places: "2",
  unique: "no",
  ...o,
});

describe("random numbers", () => {
  it("maps a draw into the range", () => {
    const options = checkRandom(rnd({ count: "1" })).options!;
    const d = drawNumbers(options, playback([137]));
    expect(d.offsets).toEqual([37]);
    expect(d.values).toEqual([38]);
    expect(d.workings.steps.join(" ")).toContain("1 + 37 = 38");
  });
  it("stays inside the range and is roughly even", () => {
    const source = seeded(7);
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 6000; i++) counts[randomBelow(6, source)]++;
    for (const c of counts) expect(c).toBeGreaterThan(850);
    const { options } = checkRandom(rnd({ min: "-5", max: "5", count: "200" }));
    for (const v of drawNumbers(options!, seeded(3)).values) {
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
  it("makes unique numbers, even when the whole range is wanted", () => {
    const some = drawNumbers(
      checkRandom(rnd({ count: "20", unique: "yes" })).options!,
      seeded(11),
    ).values;
    expect(new Set(some).size).toBe(20);
    const all = drawNumbers(
      checkRandom(rnd({ min: "1", max: "10", count: "10", unique: "yes" }))
        .options!,
      seeded(5),
    ).values;
    expect([...all].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });
  it("makes decimals with the chosen places", () => {
    const d = drawNumbers(
      checkRandom(
        rnd({ kind: "decimal", min: "0", max: "1", places: "2", count: "50" }),
      ).options!,
      seeded(9),
    );
    for (const v of d.values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 8);
    }
  });
  it("rejects bad choices", () => {
    expect(checkRandom(rnd({ min: "10", max: "5" })).errors.max).toMatch(
      /not be lower/,
    );
    expect(
      checkRandom(rnd({ min: "1", max: "5", count: "6", unique: "yes" })).errors
        .count,
    ).toMatch(/only 5 different/);
    expect(checkRandom(rnd({ count: "5000" })).errors.count).toMatch(
      /more than 1,000/,
    );
    expect(checkRandom(rnd({ min: "1.5" })).errors.min).toMatch(/whole number/);
  });
});

const ev = (s: string, mode: "deg" | "rad" = "deg") =>
  evaluateExpression(s, mode);

describe("scientific expressions", () => {
  it("follows the order of operations", () => {
    expect(ev("2 + 3 * 4").result!.value).toBe(14);
    expect(ev("(2 + 3) * 4").result!.value).toBe(20);
    expect(ev("2 ^ 3 ^ 2").result!.value).toBe(512);
    expect(ev("-2 ^ 2").result!.value).toBe(-4);
    expect(ev("2 ^ -1").result!.value).toBe(0.5);
    expect(ev("10 - 4 - 3").result!.value).toBe(3);
    expect(ev("100 / 4 / 5").result!.value).toBe(5);
  });
  it("accepts the symbols on the keypad", () => {
    expect(ev("6 × 7").result!.value).toBe(42);
    expect(ev("9 ÷ 3 − 1").result!.value).toBe(2);
    expect(ev("√16").error).toBeDefined();
    expect(ev("√(16)").result!.value).toBe(4);
    expect(ev("2π").result!.value).toBeCloseTo(6.283185307, 8);
  });
  it("multiplies side-by-side terms", () => {
    expect(ev("2(3 + 4)").result!.value).toBe(14);
    expect(ev("3pi").result!.value).toBeCloseTo(9.42477796, 7);
    expect(ev("2e3").result!.value).toBe(2000);
  });
  it("does trigonometry in degrees and radians without noise", () => {
    expect(ev("sin(30)").result!.text).toBe("0.5");
    expect(ev("cos(60)").result!.text).toBe("0.5");
    expect(ev("sin(180)").result!.text).toBe("0");
    expect(ev("tan(45)").result!.text).toBe("1");
    expect(ev("asin(1)").result!.text).toBe("90");
    expect(ev("sin(pi / 6)", "rad").result!.text).toBe("0.5");
    expect(ev("tan(90)").error).toMatch(/not defined/);
  });
  it("evaluates functions", () => {
    expect(ev("sqrt(2)").result!.text).toBe("1.41421356237");
    expect(ev("ln(e)").result!.value).toBe(1);
    expect(ev("log(1000)").result!.text).toBe("3");
    expect(ev("log2(8)").result!.value).toBe(3);
    expect(ev("cbrt(27)").result!.value).toBeCloseTo(3, 12);
    expect(ev("root(8, 3)").result!.value).toBeCloseTo(2, 12);
    expect(ev("mod(-1, 5)").result!.value).toBe(4);
    expect(ev("max(3, 9)").result!.value).toBe(9);
    expect(ev("abs(-7.5)").result!.value).toBe(7.5);
  });
  it("handles factorial and percent", () => {
    expect(ev("5!").result!.value).toBe(120);
    expect(ev("0!").result!.value).toBe(1);
    expect(ev("50%").result!.value).toBe(0.5);
    expect(ev("200 * 10%").result!.value).toBe(20);
    expect(ev("2.5!").error).toMatch(/whole numbers/);
    expect(ev("171!").error).toMatch(/too large/);
  });
  it("rounds away floating-point noise and formats big numbers", () => {
    expect(ev("0.1 + 0.2").result!.text).toBe("0.3");
    expect(ev("1234567.891 * 1").result!.text).toBe("12,34,567.891");
    expect(ev("10 ^ 20").result!.text).toBe("1e20");
    expect(ev("2 ^ 0.5 * 2 ^ 0.5").result!.text).toBe("2");
  });
  it("explains each step", () => {
    const r = ev("2 + 3 * 4").result!;
    expect(r.workings.steps[0]).toBe("Read as: 2 + (3 × 4)");
    expect(r.workings.steps.slice(1)).toEqual(["3 × 4 = 12", "2 + 12 = 14"]);
  });
  it("reports mistakes in plain words", () => {
    expect(ev("1 / 0").error).toMatch(/divide by zero/);
    expect(ev("sqrt(-1)").error).toMatch(/negative/);
    expect(ev("ln(0)").error).toMatch(/above zero/);
    expect(ev("(2 + 3").error).toMatch(/not closed/);
    expect(ev("2 + 3)").error).toMatch(/closing bracket/);
    expect(ev("2 +").error).toBeDefined();
    expect(ev("foo(3)").error).toMatch(/not a function/);
    expect(ev("sin 30").error).toMatch(/brackets/);
    expect(ev("2 $ 3").error).toMatch(/cannot be used/);
    expect(ev("0 ^ -1").error).toMatch(/negative power/);
    expect(ev("").result).toBeUndefined();
  });
  it("cannot run code", () => {
    for (const s of [
      "constructor(1)",
      "alert(1)",
      "process.exit()",
      "__proto__",
      "toString(2)",
      "globalThis",
    ]) {
      const r = ev(s);
      expect(r.result).toBeUndefined();
      expect(r.error).toBeDefined();
    }
  });
  it("limits length and nesting", () => {
    expect(ev("1+".repeat(200) + "1").error).toMatch(/longer than/);
    expect(ev("(".repeat(60) + "1" + ")".repeat(60)).error).toMatch(
      /too many brackets/,
    );
  });
});
