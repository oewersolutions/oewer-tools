import { describe, expect, it } from "vitest";
import { calculateCompound, calculateSimple, compoundBalance, evaluateCompound, evaluateSimple } from "../lib/tools/interest";

describe("compound interest", () => {
  it("matches the CFPB example: 1,000 at 5% compounded yearly is 1,050 then 1,102.50", () => {
    const r = calculateCompound(1000, 5, 2, 1);
    expect(r.rows.map((x) => x.balance)).toEqual([1050, 1102.5]);
    expect(r.amount).toBeCloseTo(1102.5, 10);
    expect(r.interest).toBeCloseTo(102.5, 10);
    expect(r.rows[1]!.interestThisYear).toBeCloseTo(52.5, 10);
  });
  it("grows faster the more often it compounds", () => {
    const yearly = compoundBalance(100_000, 10, 5, 1);
    const monthly = compoundBalance(100_000, 10, 5, 12);
    const daily = compoundBalance(100_000, 10, 5, 365);
    expect(monthly).toBeGreaterThan(yearly);
    expect(daily).toBeGreaterThan(monthly);
    expect(yearly).toBeCloseTo(161_051, 6);
    expect(monthly).toBeCloseTo(164_530.9, 1);
  });
  it("is unchanged at 0% and adds a last row for part years", () => {
    expect(calculateCompound(5000, 0, 3, 4).amount).toBe(5000);
    const r = calculateCompound(1000, 10, 1.5, 1);
    expect(r.rows.map((x) => x.year)).toEqual([1, 1.5]);
    expect(r.rows[1]!.balance).toBeCloseTo(r.amount, 10);
  });
  it("doubles in about 72 / rate years", () => {
    expect(compoundBalance(1, 12, 6, 1)).toBeCloseTo(1.97, 2);
  });
  it("validates input", () => {
    expect(evaluateCompound({ principal: "", rate: "7", years: "5", compounding: "4" })).toEqual({ errors: {} });
    expect(evaluateCompound({ principal: "1,00,000", rate: "7", years: "5", compounding: "4" }).result?.rows).toHaveLength(5);
    expect(evaluateCompound({ principal: "1000", rate: "101", years: "5", compounding: "4" }).errors.rate).toBeDefined();
    expect(evaluateCompound({ principal: "1000", rate: "7", years: "51", compounding: "4" }).errors.years).toBeDefined();
    expect(evaluateCompound({ principal: "1000", rate: "7", years: "0", compounding: "4" }).errors.years).toBeDefined();
  });
});

describe("simple interest", () => {
  it("matches the St. Louis Fed examples", () => {
    expect(calculateSimple(100, 8, 1, "years").interest).toBe(8);
    expect(calculateSimple(60, 10, 1, "years").amount).toBe(66);
    expect(calculateSimple(40, 4, 1, "years").interest).toBeCloseTo(1.6, 10);
  });
  it("converts months and days to years", () => {
    expect(calculateSimple(12_000, 10, 6, "months").interest).toBeCloseTo(600, 10);
    expect(calculateSimple(36_500, 10, 73, "days").interest).toBeCloseTo(730, 10);
  });
  it("is zero at 0%", () => {
    expect(calculateSimple(5000, 0, 2, "years").amount).toBe(5000);
  });
  it("validates input and the limit for each unit", () => {
    expect(evaluateSimple({ principal: "10000", rate: "8", time: "", unit: "years" })).toEqual({ errors: {} });
    expect(evaluateSimple({ principal: "10000", rate: "8", time: "101", unit: "years" }).errors.time).toBeDefined();
    expect(evaluateSimple({ principal: "10000", rate: "8", time: "101", unit: "months" }).result?.interest).toBeCloseTo((10000 * 8 * (101 / 12)) / 100, 6);
    expect(evaluateSimple({ principal: "x", rate: "8", time: "1", unit: "days" }).errors.principal).toBeDefined();
  });
});
