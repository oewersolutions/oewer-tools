import { describe, expect, it } from "vitest";
import { calculateLumpsum, calculateSip, evaluateLumpsum, evaluateSip, sipByYear } from "../lib/tools/growth";

describe("SIP", () => {
  it("matches the annuity-due formula for a worked example", () => {
    // 5,000 a month at 12% a year for 10 years: i = 1%, n = 120
    const r = calculateSip(5000, 12, 10);
    expect(r.invested).toBe(600_000);
    expect(r.maturity).toBeCloseTo(1_161_695.38, 1);
    expect(r.returns).toBeCloseTo(r.maturity - 600_000, 6);
  });
  it("returns only what was put in at a 0% return", () => {
    const r = calculateSip(1000, 0, 5);
    expect(r.maturity).toBe(60_000);
    expect(r.returns).toBe(0);
  });
  it("handles one month and part years", () => {
    expect(calculateSip(1000, 12, 1 / 12).maturity).toBeCloseTo(1010, 6);
    expect(calculateSip(1000, 12, 1.5).invested).toBe(18_000);
  });
  it("handles very large amounts without overflowing", () => {
    const r = calculateSip(1e12, 50, 50);
    expect(Number.isFinite(r.maturity)).toBe(true);
  });
  it("builds a year-by-year table that ends at the total", () => {
    const rows = sipByYear(5000, 12, 3);
    expect(rows).toHaveLength(3);
    expect(rows[2]!.value).toBeCloseTo(calculateSip(5000, 12, 3).maturity, 6);
    expect(rows[0]!.invested).toBe(60_000);
  });
  it("validates input", () => {
    expect(evaluateSip({ monthly: "", rate: "12", years: "10" })).toEqual({ errors: {} });
    expect(evaluateSip({ monthly: "abc", rate: "12", years: "10" }).errors.monthly).toBeDefined();
    expect(evaluateSip({ monthly: "5,000", rate: "51", years: "10" }).errors.rate).toBeDefined();
    expect(evaluateSip({ monthly: "5000", rate: "12", years: "0" }).errors.years).toBeDefined();
    expect(evaluateSip({ monthly: "5000", rate: "12", years: "51" }).errors.years).toBeDefined();
    expect(evaluateSip({ monthly: "5000", rate: "12", years: "0.01" }).errors.years).toBeDefined();
    expect(evaluateSip({ monthly: "5,000", rate: "12", years: "10" }).result?.invested).toBe(600_000);
  });
});

describe("lumpsum", () => {
  it("compounds yearly", () => {
    const r = calculateLumpsum(100_000, 10, 2);
    expect(r.maturity).toBeCloseTo(121_000, 6);
    expect(r.returns).toBeCloseTo(21_000, 6);
  });
  it("is unchanged at 0% and for part years", () => {
    expect(calculateLumpsum(50_000, 0, 7).maturity).toBe(50_000);
    expect(calculateLumpsum(100_000, 10, 0.5).maturity).toBeCloseTo(100_000 * 1.1 ** 0.5, 6);
  });
  it("validates input", () => {
    expect(evaluateLumpsum({ amount: "", rate: "10", years: "5" })).toEqual({ errors: {} });
    expect(evaluateLumpsum({ amount: "1,00,000", rate: "10", years: "5" }).result?.maturity).toBeCloseTo(161_051, 6);
    expect(evaluateLumpsum({ amount: "100000", rate: "-1", years: "5" }).errors.rate).toBeDefined();
  });
});
