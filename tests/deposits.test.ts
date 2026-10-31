import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateRd, evaluateDiscount, evaluateRd } from "../lib/tools/deposits";

describe("recurring deposit", () => {
  it("matches the worked example on Groww's RD page: 2,000 a month for 2 years at 7% is about 51,640", () => {
    const r = calculateRd(2000, 7, 24);
    expect(r.deposited).toBe(48_000);
    expect(r.maturity).toBeCloseTo(51_639.56, 1);
    expect(r.interest).toBeCloseTo(3_639.56, 1);
  });
  it("returns only the deposits at 0%", () => {
    expect(calculateRd(1000, 0, 12).maturity).toBe(12_000);
  });
  it("handles one month and part quarters", () => {
    const one = calculateRd(1000, 6, 1);
    expect(one.maturity).toBeGreaterThan(1000);
    expect(one.maturity).toBeLessThan(1006);
    expect(calculateRd(1000, 6, 4).maturity).toBeGreaterThan(calculateRd(1000, 6, 3).maturity);
  });
  it("converts years to months and validates input", () => {
    expect(evaluateRd({ monthly: "5,000", rate: "6.5", tenure: "5", tenureUnit: "years" }).result?.months).toBe(60);
    expect(evaluateRd({ monthly: "", rate: "6.5", tenure: "5", tenureUnit: "years" })).toEqual({ errors: {} });
    expect(evaluateRd({ monthly: "5000", rate: "6.5", tenure: "11", tenureUnit: "years" }).errors.tenure).toBeDefined();
    expect(evaluateRd({ monthly: "5000", rate: "6.5", tenure: "6.5", tenureUnit: "months" }).errors.tenure).toBeDefined();
    expect(evaluateRd({ monthly: "5000", rate: "x", tenure: "12", tenureUnit: "months" }).errors.rate).toBeDefined();
  });
});

describe("discount", () => {
  it("matches the examples on the successive-discount pages", () => {
    const a = calculateDiscount(1000, 20, 10);
    expect(a.finalPrice).toBeCloseTo(720, 10);
    expect(a.effectivePercent).toBeCloseTo(28, 10);
    expect(a.afterFirst).toBeCloseTo(800, 10);
    expect(calculateDiscount(2500, 20, 10).finalPrice).toBeCloseTo(1800, 10);
    expect(calculateDiscount(2000, 25, 20).finalPrice).toBeCloseTo(1200, 10);
  });
  it("gives the same price in either order", () => {
    expect(calculateDiscount(1999, 15, 35).finalPrice).toBeCloseTo(calculateDiscount(1999, 35, 15).finalPrice, 8);
  });
  it("handles one discount, none and a full discount", () => {
    const one = calculateDiscount(500, 10);
    expect(one.finalPrice).toBe(450);
    expect(one.saved).toBe(50);
    expect(one.afterFirst).toBeUndefined();
    expect(calculateDiscount(500, 0).finalPrice).toBe(500);
    expect(calculateDiscount(500, 100).finalPrice).toBe(0);
  });
  it("validates input; the second discount is optional", () => {
    expect(evaluateDiscount({ price: "", first: "10", second: "" })).toEqual({ errors: {} });
    expect(evaluateDiscount({ price: "1,000", first: "20", second: "" }).result?.finalPrice).toBe(800);
    expect(evaluateDiscount({ price: "1000", first: "20", second: "10" }).result?.effectivePercent).toBeCloseTo(28, 10);
    expect(evaluateDiscount({ price: "1000", first: "101", second: "" }).errors.first).toBeDefined();
    expect(evaluateDiscount({ price: "1000", first: "20", second: "abc" }).errors.second).toBeDefined();
    expect(evaluateDiscount({ price: "0", first: "20", second: "" }).errors.price).toBeDefined();
  });
});
