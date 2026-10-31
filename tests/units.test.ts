import { describe, expect, it } from "vitest";
import { CATEGORIES, convert, evaluateConverter, formatQuantity, UNITS } from "../lib/tools/units";

const near = (a: number, b: number, digits = 9) => expect(a).toBeCloseTo(b, digits);

describe("length", () => {
  it("matches the definitions", () => {
    near(convert("length", 1, "in", "mm"), 25.4);
    near(convert("length", 1, "ft", "in"), 12);
    near(convert("length", 1, "yd", "ft"), 3);
    near(convert("length", 1, "mi", "km"), 1.609344);
    near(convert("length", 1, "nmi", "m"), 1852);
    near(convert("length", 100, "cm", "m"), 1);
  });
});

describe("weight", () => {
  it("matches the definitions", () => {
    near(convert("weight", 1, "lb", "g"), 453.59237);
    near(convert("weight", 1, "oz", "g"), 28.349523125);
    near(convert("weight", 1, "st", "lb"), 14);
    near(convert("weight", 1, "quintal", "kg"), 100);
    near(convert("weight", 1, "tonne", "quintal"), 10);
    near(convert("weight", 500, "mg", "g"), 0.5);
  });
});

describe("temperature", () => {
  it("converts the fixed points", () => {
    near(convert("temperature", 0, "c", "f"), 32);
    near(convert("temperature", 100, "c", "f"), 212);
    near(convert("temperature", 32, "f", "c"), 0);
    near(convert("temperature", 0, "c", "k"), 273.15);
    near(convert("temperature", -40, "c", "f"), -40);
    near(convert("temperature", 98.6, "f", "c"), 37);
    near(convert("temperature", 0, "k", "c"), -273.15);
  });
  it("round-trips", () => {
    for (const v of [-100, 0, 36.6, 1000]) near(convert("temperature", convert("temperature", v, "c", "f"), "f", "c"), v, 9);
  });
});

describe("area, volume and speed", () => {
  it("matches the definitions", () => {
    near(convert("area", 1, "acre", "sqft"), 43560);
    near(convert("area", 1, "acre", "sqm"), 4046.8564224);
    near(convert("area", 1, "ha", "acre"), 2.4710538147, 8);
    near(convert("area", 1, "sqft", "sqin"), 144);
    near(convert("volume", 1, "usgal", "l"), 3.785411784);
    near(convert("volume", 1, "usgal", "usfloz"), 128);
    near(convert("volume", 1, "ukgal", "l"), 4.54609);
    near(convert("volume", 1, "m3", "l"), 1000);
    near(convert("speed", 36, "kmh", "ms"), 10);
    near(convert("speed", 60, "mph", "kmh"), 96.56064);
    near(convert("speed", 1, "kn", "kmh"), 1.852);
  });
});

describe("every category", () => {
  it("has unique ids and a base unit of factor 1", () => {
    for (const c of CATEGORIES) {
      const ids = UNITS[c].map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(UNITS[c].some((u) => u.factor === 1)).toBe(true);
    }
  });
  it("round-trips every pair", () => {
    for (const c of CATEGORIES) for (const a of UNITS[c]) for (const b of UNITS[c]) near(convert(c, convert(c, 7.5, a.id, b.id), b.id, a.id), 7.5, 6);
  });
  it("refuses a unit from another category", () => {
    expect(() => convert("length", 1, "kg", "m")).toThrow();
  });
});

describe("evaluateConverter", () => {
  it("lists every unit", () => {
    const { result } = evaluateConverter("length", "in", { value: "1" });
    expect(result?.all).toHaveLength(UNITS.length.length);
    near(result!.all.find((r) => r.unit.id === "mm")!.value, 25.4);
  });
  it("waits quietly for input and explains bad input", () => {
    expect(evaluateConverter("length", "m", { value: "" })).toEqual({ errors: {} });
    expect(evaluateConverter("length", "m", { value: "abc" }).errors.value).toMatch(/number/);
    expect(evaluateConverter("length", "m", { value: "-1" }).errors.value).toMatch(/less than 0/);
  });
  it("allows negative temperatures but not below absolute zero", () => {
    expect(evaluateConverter("temperature", "c", { value: "-40" }).result).toBeDefined();
    expect(evaluateConverter("temperature", "c", { value: "-273.15" }).result).toBeDefined();
    expect(evaluateConverter("temperature", "c", { value: "-300" }).errors.value).toMatch(/absolute zero/);
    expect(evaluateConverter("temperature", "k", { value: "-1" }).errors.value).toMatch(/absolute zero/);
    expect(evaluateConverter("temperature", "f", { value: "-460" }).errors.value).toMatch(/absolute zero/);
  });
  it("accepts commas", () => {
    expect(evaluateConverter("length", "m", { value: "1,500" }).result).toBeDefined();
  });
});

describe("formatQuantity", () => {
  it("groups the Indian way and trims digits", () => {
    expect(formatQuantity(1234567.891)).toBe("12,34,568");
    expect(formatQuantity(25.4)).toBe("25.4");
    expect(formatQuantity(1 / 3)).toBe("0.3333333");
    expect(formatQuantity(0)).toBe("0");
    expect(formatQuantity(1e-12)).toBe("1.0000e-12");
  });
});
