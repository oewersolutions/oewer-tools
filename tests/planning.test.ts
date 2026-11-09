import { describe, expect, it } from "vitest";
import { formatMoney } from "../lib/tools/finance";
import { evaluateFinance, evaluateInflation, evaluateInterest, evaluateInvestment, evaluateRetirement, futureValue, type FinanceRaw, type InflationRaw, type InterestRaw, type InvestmentRaw, type RetirementRaw } from "../lib/tools/planning";
import { calculateSip } from "../lib/tools/growth";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");

describe("future value", () => {
  it("matches the SIP calculator when deposits are at the start of each month", () => {
    expect(futureValue(0, 5000, 0.01, 120, true)).toBeCloseTo(calculateSip(5000, 12, 10).maturity, 4);
  });
  it("handles a zero rate", () => {
    expect(futureValue(1000, 100, 0, 12)).toBe(2200);
  });
});

const inv = (over: Partial<InvestmentRaw> = {}) => evaluateInvestment({ start: "100000", monthly: "5000", rate: "12", years: "10", timing: "end", ...over } as InvestmentRaw);

describe("investment calculator", () => {
  it("adds up what was put in and what it earned", () => {
    const { result } = inv();
    expect(result!.invested).toBe(100_000 + 5000 * 120);
    expect(result!.balance).toBeCloseTo(100_000 * 1.01 ** 120 + 5000 * ((1.01 ** 120 - 1) / 0.01), 3);
    expect(result!.returns).toBeCloseTo(result!.balance - result!.invested, 6);
    expect(result!.rows).toHaveLength(10);
    expect(result!.rows[9]!.balance).toBeCloseTo(result!.balance, 6);
    expect(text(result!.workings)).toContain("Monthly rate i = 12 ÷ 12 ÷ 100 = 0.01");
  });
  it("start-of-month deposits end higher than end-of-month deposits", () => {
    expect(inv({ timing: "start" }).result!.balance).toBeGreaterThan(inv().result!.balance);
  });
  it("works with only a starting amount, only monthly additions, and a 0% return", () => {
    expect(inv({ monthly: "" }).result!.balance).toBeCloseTo(100_000 * 1.01 ** 120, 3);
    expect(inv({ start: "" }).result!.invested).toBe(600_000);
    expect(inv({ rate: "0" }).result!.balance).toBe(700_000);
  });
  it("adds a last row for a part year, and rejects bad input", () => {
    expect(inv({ years: "2.5" }).result!.rows).toHaveLength(3);
    expect(inv({ start: "", monthly: "" })).toEqual({ errors: {} });
    expect(inv({ rate: "abc" }).errors.rate).toMatch(/number/);
    expect(inv({ years: "0" }).errors.years).toMatch(/greater than 0/);
  });
});

const ret = (over: Partial<RetirementRaw> = {}) =>
  evaluateRetirement({ age: "30", retireAge: "60", lifeAge: "85", savings: "500000", monthly: "20000", expense: "40000", returnBefore: "10", returnAfter: "7", inflation: "6", ...over } as RetirementRaw);

describe("retirement calculator", () => {
  it("works out the corpus, the corpus needed and the gap", () => {
    const { result } = ret();
    expect(result!.yearsToRetire).toBe(30);
    expect(result!.yearsInRetirement).toBe(25);
    expect(result!.corpus).toBeCloseTo(futureValue(500_000, 20_000, 0.1 / 12, 360), 4);
    expect(result!.expenseAtRetirement).toBeCloseTo(40_000 * 1.06 ** 30, 4);
    expect(result!.gap).toBeCloseTo(result!.corpus - result!.required, 4);
    expect(text(result!.workings)).toContain("Corpus needed");
  });
  it("reports a shortfall and the extra monthly saving that closes it", () => {
    const { result } = ret({ monthly: "1000" });
    expect(result!.gap).toBeLessThan(0);
    expect(result!.extraMonthly).toBeGreaterThan(0);
    // saving the extra amount on top closes the gap
    const closed = ret({ monthly: String(1000 + result!.extraMonthly) }).result!;
    expect(closed.gap).toBeCloseTo(0, 0);
  });
  it("has no extra saving needed when there is a surplus", () => {
    expect(ret({ monthly: "200000" }).result!.extraMonthly).toBe(0);
  });
  it("with no inflation and no returns after retirement, the corpus needed is expenses times months", () => {
    const { result } = ret({ inflation: "0", returnAfter: "0", expense: "10000", retireAge: "60", lifeAge: "70" });
    expect(result!.required).toBeCloseTo(10_000 * 120, 4);
  });
  it("checks the ages", () => {
    expect(ret({ retireAge: "30" }).errors.retireAge).toMatch(/after your current age/);
    expect(ret({ lifeAge: "60" }).errors.lifeAge).toMatch(/after your retirement age/);
    expect(ret({ age: "" })).toEqual({ errors: {} });
    expect(ret({ age: "30.5" }).errors.age).toMatch(/whole number/);
  });
});

const infl = (over: Partial<InflationRaw>) => evaluateInflation({ mode: "future", amount: "", newAmount: "", rate: "6", years: "10", ...over } as InflationRaw);

describe("inflation calculator", () => {
  it("future cost: ₹1,00,000 at 6% for 10 years is about ₹1,79,085", () => {
    const { result } = infl({ amount: "100000" });
    expect(result!.value).toBeCloseTo(100_000 * 1.06 ** 10, 6);
    expect(formatMoney(result!.value)).toBe("₹1,79,084.77");
    expect(result!.change).toBeCloseTo(result!.value - 100_000, 6);
  });
  it("today's worth of a future amount", () => {
    const { result } = infl({ mode: "value", amount: "179084.77" });
    expect(result!.value).toBeCloseTo(100_000, 1);
    expect(text(result!.workings)).toContain("Purchasing power lost");
  });
  it("average inflation from two prices", () => {
    const { result } = infl({ mode: "rate", amount: "100", newAmount: "179.0847696", years: "10" });
    expect(result!.value).toBeCloseTo(6, 5);
    expect(result!.change).toBeCloseTo(79.08477, 4);
  });
  it("waits for input and rejects bad values", () => {
    expect(infl({})).toEqual({ errors: {} });
    expect(infl({ amount: "100", years: "0" }).errors.years).toMatch(/greater than 0/);
    expect(infl({ mode: "rate", amount: "100" })).toEqual({ errors: {} });
  });
});

const fin = (over: Partial<FinanceRaw>) => evaluateFinance({ solve: "fv", pv: "", pmt: "", fv: "", rate: "12", years: "10", perYear: "12", timing: "end", ...over } as FinanceRaw);

describe("finance calculator", () => {
  it("finds the final amount", () => {
    const { result } = fin({ pv: "100000", pmt: "5000" });
    expect(result!.value).toBeCloseTo(100_000 * 1.01 ** 120 + 5000 * ((1.01 ** 120 - 1) / 0.01), 3);
  });
  it("finds the starting amount, and the deposit, from the final amount (they are inverses)", () => {
    const target = fin({ pv: "100000", pmt: "5000" }).result!.value;
    expect(fin({ solve: "pv", pmt: "5000", fv: String(target) }).result!.value).toBeCloseTo(100_000, 2);
    expect(fin({ solve: "pmt", pv: "100000", fv: String(target) }).result!.value).toBeCloseTo(5000, 4);
  });
  it("finds the time, and the rate", () => {
    const target = fin({ pv: "100000", pmt: "5000" }).result!.value;
    expect(fin({ solve: "years", pv: "100000", pmt: "5000", fv: String(target) }).result!.value).toBeCloseTo(10, 6);
    expect(fin({ solve: "rate", pv: "100000", pmt: "5000", fv: String(target) }).result!.value).toBeCloseTo(12, 5);
    expect(text(fin({ solve: "rate", pv: "100000", pmt: "5000", fv: String(target) }).result!.workings)).toContain("Check:");
  });
  it("handles a zero rate and different frequencies", () => {
    expect(fin({ rate: "0", pv: "1000", pmt: "100" }).result!.value).toBe(1000 + 100 * 120);
    expect(fin({ solve: "years", rate: "0", pv: "1000", pmt: "100", fv: "2200" }).result!.value).toBeCloseTo(1, 9); // 12 payments a year
    expect(fin({ perYear: "1", pv: "1000" }).result!.value).toBeCloseTo(1000 * 1.12 ** 10, 6);
  });
  it("explains impossible cases", () => {
    expect(fin({ solve: "pmt", pv: "100000", fv: "50000" }).errors.pv).toMatch(/already grows/);
    expect(fin({ solve: "pv", pmt: "100000", fv: "50000" }).errors.pmt).toMatch(/already reach/);
    expect(fin({ solve: "rate", pv: "1000", pmt: "10", fv: "500" }).errors.fv).toMatch(/negative/);
    expect(fin({ solve: "years", pv: "1000", fv: "500" }).errors.fv).toMatch(/never reached/);
  });
  it("waits quietly while a needed value is empty", () => {
    expect(fin({ solve: "fv", years: "" })).toEqual({ errors: {} });
    expect(fin({ solve: "pmt", pv: "100" })).toEqual({ errors: {} });
  });
});

const intr = (over: Partial<InterestRaw> = {}) => evaluateInterest({ principal: "100000", rate: "8", time: "10", unit: "years", compounding: "1", ...over } as InterestRaw);

describe("interest calculator", () => {
  it("shows simple and compound side by side", () => {
    const { result } = intr();
    expect(result!.simpleInterest).toBe(80_000);
    expect(result!.compoundTotal).toBeCloseTo(100_000 * 1.08 ** 10, 4);
    expect(result!.difference).toBeCloseTo(result!.compoundInterest - 80_000, 6);
    expect(text(result!.workings)).toContain("Compounding earns");
  });
  it("converts months and days to years", () => {
    expect(intr({ time: "18", unit: "months" }).result!.years).toBe(1.5);
    expect(text(intr({ time: "18", unit: "months" }).result!.workings)).toContain("18 months ÷ 12 = 1.5 years");
  });
  it("more frequent compounding earns more", () => {
    expect(intr({ compounding: "12" }).result!.compoundTotal).toBeGreaterThan(intr().result!.compoundTotal);
  });
  it("rejects bad input", () => {
    expect(intr({ principal: "" })).toEqual({ errors: {} });
    expect(intr({ rate: "150" }).errors.rate).toMatch(/more than 100/);
  });
});
