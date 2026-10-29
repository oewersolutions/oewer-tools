import { describe, expect, it } from "vitest";
import {
  calculateEmi,
  calculateFd,
  calculateGst,
  evaluateEmi,
  evaluateFd,
  evaluateGst,
  evaluatePercentage,
  readNumber,
  type EmiRaw,
} from "../lib/tools/finance";

describe("readNumber", () => {
  it("treats blank input as empty, not an error", () => {
    expect(readNumber("  ", "Amount")).toEqual({ empty: true });
  });
  it("ignores commas and spaces", () => {
    expect(readNumber("10,00,000", "Amount")).toEqual({ value: 1000000 });
    expect(readNumber(" 2 500.5 ", "Amount")).toEqual({ value: 2500.5 });
  });
  it("rejects non-numbers, negatives, zero when positive is required, and values over the maximum", () => {
    expect(readNumber("abc", "Amount")).toEqual({ error: "Amount must be a number." });
    expect(readNumber("1e5", "Amount")).toEqual({ error: "Amount must be a number." });
    expect(readNumber("-5", "Amount")).toEqual({ error: "Amount cannot be less than 0." });
    expect(readNumber("0", "Amount", { positive: true })).toEqual({ error: "Amount must be greater than 0." });
    expect(readNumber("101", "Rate", { max: 100 })).toEqual({ error: "Rate cannot be more than 100." });
    expect(readNumber("2.5", "Months", { integer: true })).toEqual({ error: "Months must be a whole number." });
  });
});

describe("EMI", () => {
  it("matches the standard reducing-balance formula", () => {
    const r = calculateEmi(1_000_000, 10, 12);
    expect(r.emi).toBeCloseTo(87915.89, 2);
    expect(r.totalPayment).toBeCloseTo(r.emi * 12, 6);
    expect(r.totalInterest).toBeCloseTo(r.totalPayment - 1_000_000, 6);
  });
  it("splits the principal evenly at 0% interest", () => {
    const r = calculateEmi(120_000, 0, 12);
    expect(r.emi).toBe(10_000);
    expect(r.totalInterest).toBe(0);
  });
  it("converts years to months and validates input", () => {
    const raw: EmiRaw = { principal: "10,00,000", rate: "10", tenure: "1", tenureUnit: "years" };
    expect(evaluateEmi(raw).result?.months).toBe(12);
    expect(evaluateEmi({ ...raw, tenure: "" })).toEqual({ errors: {} });
    expect(evaluateEmi({ ...raw, rate: "x" }).errors.rate).toBeDefined();
    expect(evaluateEmi({ ...raw, tenure: "41" }).errors.tenure).toBeDefined();
    expect(evaluateEmi({ ...raw, tenureUnit: "months", tenure: "6.5" }).errors.tenure).toBeDefined();
    expect(evaluateEmi({ ...raw, tenure: "0.01" }).errors.tenure).toMatch(/at least 1 month/);
  });
});

describe("Fixed deposit", () => {
  it("compounds quarterly", () => {
    const r = calculateFd(100_000, 7, 1, 4);
    expect(r.maturityAmount).toBeCloseTo(100_000 * 1.0175 ** 4, 6);
    expect(r.interestEarned).toBeCloseTo(r.maturityAmount - 100_000, 6);
  });
  it("uses simple interest at maturity", () => {
    expect(calculateFd(100_000, 7, 2, 0).maturityAmount).toBeCloseTo(114_000, 6);
  });
  it("handles a tenure in months", () => {
    const r = evaluateFd({ principal: "100000", rate: "6", tenure: "6", tenureUnit: "months", compounding: "0" });
    expect(r.result?.interestEarned).toBeCloseTo(3000, 6);
  });
});

describe("GST", () => {
  it("adds GST to an exclusive amount", () => {
    expect(calculateGst(1000, 18, "add")).toEqual({ netAmount: 1000, gstAmount: 180, grossAmount: 1180, halfGst: 90 });
  });
  it("removes GST from an inclusive amount", () => {
    const r = calculateGst(1180, 18, "remove");
    expect(r.netAmount).toBeCloseTo(1000, 6);
    expect(r.gstAmount).toBeCloseTo(180, 6);
    expect(r.grossAmount).toBeCloseTo(1180, 6);
  });
  it("needs both fields", () => {
    expect(evaluateGst({ amount: "100", rate: "", mode: "add" }).result).toBeUndefined();
  });
});

describe("Percentage", () => {
  const run = (mode: Parameters<typeof evaluatePercentage>[0]["mode"], a: string, b: string) => evaluatePercentage({ a, b, mode });
  it("X% of Y", () => expect(run("of", "20", "150").result?.value).toBe(30));
  it("X is what % of Y", () => {
    expect(run("what-percent", "25", "200").result).toMatchObject({ value: 12.5, unit: "percent" });
    expect(run("what-percent", "5", "0").errors.b).toBeDefined();
  });
  it("percentage change", () => {
    expect(run("change", "80", "100").result?.value).toBe(25);
    expect(run("change", "100", "80").result?.value).toBe(-20);
    expect(run("change", "0", "5").errors.a).toBeDefined();
  });
  it("increase and decrease", () => {
    expect(run("increase", "200", "10").result?.value).toBeCloseTo(220, 9);
    expect(run("decrease", "200", "25").result?.value).toBe(150);
  });
});
