import { describe, expect, it } from "vitest";
import { evaluateRd } from "../lib/tools/deposits";
import { evaluateEmi, evaluateFd, evaluateGst, formatMoney } from "../lib/tools/finance";
import { evaluateLumpsum, evaluateSip } from "../lib/tools/growth";
import { evaluateCompound, evaluateSimple } from "../lib/tools/interest";
import { ageWorkings, compoundWorkings, converterWorkings, daysWorkings, discountWorkings, emiWorkings, fdWorkings, gstWorkings, lumpsumWorkings, percentageWorkings, rdWorkings, simpleWorkings, sipWorkings } from "../lib/tools/workings";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");

describe("workings agree with the answers", () => {
  it("EMI: ₹10,00,000 at 9% for 5 years", () => {
    const raw = { principal: "1000000", rate: "9", tenure: "5", tenureUnit: "years" as const };
    const w = emiWorkings(raw)!;
    expect(w.formula[0]).toContain("EMI = P × i");
    expect(text(w)).toContain("= 0.0075");
    expect(text(w)).toContain("n = 5 years × 12 = 60");
    expect(text(w)).toContain(formatMoney(evaluateEmi(raw).result!.emi));
    expect(text(w)).toContain(formatMoney(evaluateEmi(raw).result!.totalInterest));
  });

  it("EMI at 0% explains the even split", () => {
    expect(text(emiWorkings({ principal: "120000", rate: "0", tenure: "12", tenureUnit: "months" }))).toContain("split evenly");
  });

  it("FD: compounding and simple", () => {
    const raw = { principal: "100000", rate: "7", tenure: "3", tenureUnit: "years" as const, compounding: "4" as const };
    expect(text(fdWorkings(raw))).toContain(formatMoney(evaluateFd(raw).result!.maturityAmount));
    expect(text(fdWorkings(raw))).toContain("(1 + r ÷ k)^(k × t)");
    const simple = { ...raw, compounding: "0" as const };
    expect(fdWorkings(simple)!.formula[0]).toBe("A = P × (1 + r × t)");
    expect(text(fdWorkings({ ...raw, tenure: "18", tenureUnit: "months" }))).toContain("18 months ÷ 12 = 1.5 years");
  });

  it("GST: add and remove", () => {
    const add = { amount: "1000", rate: "18", mode: "add" as const };
    expect(text(gstWorkings(add))).toContain("₹180.00");
    expect(text(gstWorkings(add))).toContain("₹1,180.00");
    const remove = { amount: "1180", rate: "18", mode: "remove" as const };
    expect(text(gstWorkings(remove))).toContain(formatMoney(evaluateGst(remove).result!.netAmount));
    expect(text(gstWorkings(remove))).toContain("CGST = SGST");
  });

  it("percentage: every mode shows its formula and the sum", () => {
    expect(text(percentageWorkings({ a: "20", b: "150", mode: "of" }))).toContain("150 × 20 ÷ 100 = 30");
    expect(text(percentageWorkings({ a: "30", b: "120", mode: "what-percent" }))).toContain("= 25%");
    expect(text(percentageWorkings({ a: "80", b: "100", mode: "change" }))).toContain("= 25%");
    expect(text(percentageWorkings({ a: "200", b: "10", mode: "increase" }))).toContain("200 × 1.1 = 220");
    expect(text(percentageWorkings({ a: "200", b: "10", mode: "decrease" }))).toContain("200 × 0.9 = 180");
  });

  it("SIP, lumpsum, compound, simple and RD show the totals the calculators show", () => {
    const sip = { monthly: "5000", rate: "12", years: "10" };
    expect(text(sipWorkings(sip))).toContain(formatMoney(evaluateSip(sip).result!.maturity));
    expect(text(sipWorkings({ ...sip, rate: "0" }))).toContain("just the money put in");
    const lump = { amount: "100000", rate: "12", years: "10" };
    expect(text(lumpsumWorkings(lump))).toContain(formatMoney(evaluateLumpsum(lump).result!.maturity));
    const comp = { principal: "100000", rate: "8", years: "10", compounding: "1" as const };
    expect(text(compoundWorkings(comp))).toContain(formatMoney(evaluateCompound(comp).result!.amount));
    const simple = { principal: "100000", rate: "8", time: "18", unit: "months" as const };
    expect(text(simpleWorkings(simple))).toContain("18 months ÷ 12 = 1.5 years");
    expect(text(simpleWorkings(simple))).toContain(formatMoney(evaluateSimple(simple).result!.interest));
    const rd = { monthly: "5000", rate: "6.5", tenure: "5", tenureUnit: "years" as const };
    expect(text(rdWorkings(rd))).toContain(formatMoney(evaluateRd(rd).result!.maturity));
  });

  it("discount: two discounts explain why they do not add up", () => {
    const w = discountWorkings({ price: "2000", first: "20", second: "10" })!;
    expect(text(w)).toContain("₹1,440.00");
    expect(w.note).toContain("28% in total, not 30%");
    expect(discountWorkings({ price: "2000", first: "20", second: "" })!.note).toBeUndefined();
  });

  it("age: years, months, days and the day count", () => {
    const w = ageWorkings({ born: "1990-05-14", asOf: "2026-11-09" })!;
    expect(text(w)).toContain("Whole years: 36");
    expect(text(w)).toContain("14 May 1990 + 36 years = 14 May 2026");
    expect(text(w)).toContain("Whole months after that: 5");
    expect(text(w)).toContain("Days left to 9 November 2026: 26");
  });

  it("days between: with and without the end date, and swapped dates", () => {
    const plain = daysWorkings({ start: "2026-01-01", end: "2026-01-31" }, false)!;
    expect(text(plain)).toContain("= 30");
    const inclusive = daysWorkings({ start: "2026-01-01", end: "2026-01-31" }, true)!;
    expect(text(inclusive)).toContain("30 + 1 = 31");
    expect(text(daysWorkings({ start: "2026-01-31", end: "2026-01-01" }, false))).toContain("swapped");
  });

  it("unit converter: factors for most units, formulas for temperature", () => {
    const len = converterWorkings("length", "in", "mm", { value: "1" })!;
    expect(text(len)).toContain("1 in = 0.0254 m, and 1 mm = 0.001 m");
    expect(text(len)).toContain("25.4 mm");
    const temp = converterWorkings("temperature", "f", "c", { value: "98.6" })!;
    expect(text(temp)).toContain("(98.6 − 32) × 5 ÷ 9 = 37 °C");
  });

  it("returns nothing until the inputs are valid", () => {
    expect(emiWorkings({ principal: "", rate: "9", tenure: "5", tenureUnit: "years" })).toBeUndefined();
    expect(gstWorkings({ amount: "abc", rate: "18", mode: "add" })).toBeUndefined();
    expect(percentageWorkings({ a: "5", b: "0", mode: "what-percent" })).toBeUndefined();
    expect(ageWorkings({ born: "", asOf: "2026-11-09" })).toBeUndefined();
    expect(daysWorkings({ start: "2026-01-01", end: "" }, false)).toBeUndefined();
    expect(converterWorkings("length", "m", "ft", { value: "" })).toBeUndefined();
  });
});
