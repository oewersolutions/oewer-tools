import { describe, expect, it } from "vitest";
import { formatMoney } from "../lib/tools/finance";
import { affordablePrincipal, buildSchedule, evaluateAmort, evaluateAuto, evaluateLoan, evaluateMortgage, evaluatePayment, evaluateRate, formatMonths, monthlyPayment, monthsToClear, solveRate, type AmortRaw, type AutoRaw, type LoanRaw, type MortgageRaw, type PaymentRaw, type RateRaw } from "../lib/tools/loans";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");

describe("loan maths", () => {
  it("matches a published example: ₹35,00,000 at 8.65% for 30 years is about ₹27,285 a month", () => {
    expect(Math.round(monthlyPayment(3_500_000, 8.65, 360))).toBe(27_285);
  });
  it("splits a zero-rate loan evenly", () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000);
  });
  it("a schedule clears the loan exactly and its interest matches EMI × n − P", () => {
    const emi = monthlyPayment(1_000_000, 9, 60);
    const s = buildSchedule(1_000_000, 9, emi);
    expect(s.months).toBe(60);
    expect(s.rows.at(-1)!.balance).toBe(0);
    expect(s.totalInterest).toBeCloseTo(emi * 60 - 1_000_000, 4);
    expect(s.rows[0]!.interest).toBeCloseTo(1_000_000 * 0.0075, 6);
  });
  it("an extra payment shortens the loan and saves interest", () => {
    const emi = monthlyPayment(1_000_000, 9, 60);
    const s = buildSchedule(1_000_000, 9, emi + 5000);
    expect(s.months).toBeLessThan(60);
    expect(s.totalInterest).toBeLessThan(emi * 60 - 1_000_000);
    expect(s.rows.at(-1)!.payment).toBeLessThanOrEqual(emi + 5000);
  });
  it("affordable principal and the payment are inverses", () => {
    const emi = monthlyPayment(2_500_000, 8.5, 240);
    expect(affordablePrincipal(emi, 8.5, 240)).toBeCloseTo(2_500_000, 4);
    expect(affordablePrincipal(10_000, 0, 12)).toBe(120_000);
  });
  it("months to clear is the inverse too, and is undefined when the payment cannot cover the interest", () => {
    const emi = monthlyPayment(1_000_000, 9, 60);
    expect(monthsToClear(1_000_000, 9, emi)).toBeCloseTo(60, 6);
    expect(monthsToClear(1_000_000, 12, 9_000)).toBeUndefined(); // interest alone is ₹10,000 a month
    expect(monthsToClear(120_000, 0, 10_000)).toBe(12);
  });
  it("solves the rate from the payment", () => {
    const emi = monthlyPayment(1_000_000, 9, 60);
    expect(solveRate(1_000_000, emi, 60)).toBeCloseTo(9, 6);
    expect(solveRate(1_000_000, 10_000, 100)).toBe(0);
    expect(solveRate(1_000_000, 10_000, 60)).toBeUndefined();
  });
  it("formats months", () => {
    expect(formatMonths(63)).toBe("5 years 3 months");
    expect(formatMonths(12)).toBe("1 year");
    expect(formatMonths(1)).toBe("1 month");
  });
});

const loan = (over: Partial<LoanRaw> = {}) => evaluateLoan({ principal: "1000000", rate: "9", tenure: "5", tenureUnit: "years", extra: "", ...over } as LoanRaw);

describe("loan calculator", () => {
  it("gives the EMI and totals with the working", () => {
    const { result } = loan();
    expect(formatMoney(result!.emi)).toBe("₹20,758.36");
    expect(result!.extra).toBeUndefined();
    expect(text(result!.workings)).toContain("Monthly rate i = 9 ÷ 12 ÷ 100 = 0.0075");
  });
  it("shows what an extra monthly payment saves", () => {
    const { result } = loan({ extra: "5000" });
    expect(result!.extra!.monthsSaved).toBeGreaterThan(0);
    expect(result!.extra!.interestSaved).toBeGreaterThan(0);
    expect(text(result!.workings)).toContain("sooner");
  });
  it("rejects bad input and waits while empty", () => {
    expect(loan({ principal: "" })).toEqual({ errors: {} });
    expect(loan({ rate: "150" }).errors.rate).toMatch(/more than 100/);
    expect(loan({ extra: "abc" }).errors.extra).toMatch(/number/);
    expect(loan({ tenure: "0" }).errors.tenure).toMatch(/greater than 0/);
  });
});

const auto = (over: Partial<AutoRaw> = {}) => evaluateAuto({ price: "1000000", down: "200000", rate: "9", tenure: "5", tenureUnit: "years", fee: "", ...over } as AutoRaw);

describe("auto loan calculator", () => {
  it("borrows the price less the down payment and adds up the total cost", () => {
    const { result } = auto({ fee: "1" });
    expect(result!.loan).toBe(800_000);
    expect(result!.feeAmount).toBe(8000);
    expect(result!.totalCost).toBeCloseTo(200_000 + result!.emi * 60 + 8000, 4);
    expect(text(result!.workings)).toContain("Total cost of the vehicle");
  });
  it("refuses a down payment that covers the whole price", () => {
    expect(auto({ down: "1000000" }).errors.down).toMatch(/less than/);
  });
});

const mort = (over: Partial<MortgageRaw> = {}) => evaluateMortgage({ price: "5000000", downPercent: "20", rate: "8.5", tenure: "20", tenureUnit: "years", ...over } as MortgageRaw);

describe("mortgage calculator", () => {
  it("works out the down payment, the loan-to-value and the cost", () => {
    const { result } = mort();
    expect(result!.downPayment).toBe(1_000_000);
    expect(result!.loan).toBe(4_000_000);
    expect(result!.loanToValue).toBe(80);
    expect(result!.totalCost).toBeCloseTo(1_000_000 + result!.emi * 240, 3);
    expect(text(result!.workings)).toContain("Loan-to-value = ₹40,00,000.00 ÷ ₹50,00,000.00 × 100 = 80%");
  });
  it("accepts no down payment and rejects 100%", () => {
    expect(mort({ downPercent: "0" }).result!.loan).toBe(5_000_000);
    expect(mort({ downPercent: "100" }).errors.downPercent).toMatch(/more than 99/);
  });
});

const pay = (over: Partial<PaymentRaw>) => evaluatePayment({ mode: "payment", principal: "", payment: "", rate: "9", tenure: "5", tenureUnit: "years", ...over } as PaymentRaw);

describe("payment calculator", () => {
  it("finds the monthly payment", () => {
    expect(formatMoney(pay({ principal: "1000000" }).result!.payment)).toBe("₹20,758.36");
  });
  it("finds the loan a payment can carry", () => {
    const { result } = pay({ mode: "amount", payment: "20758.36" });
    expect(result!.principal).toBeCloseTo(1_000_000, 0);
    expect(text(result!.workings)).toContain("Loan = Payment × (1 − (1 + i)^−n) ÷ i");
  });
  it("finds the time to pay off, and refuses a payment below the interest", () => {
    const { result } = pay({ mode: "term", principal: "1000000", payment: "20758.36" });
    expect(result!.months).toBe(60);
    expect(pay({ mode: "term", principal: "1000000", payment: "5000" }).errors.payment).toMatch(/more than the interest/);
  });
  it("only asks for what each mode needs", () => {
    expect(pay({ mode: "payment" })).toEqual({ errors: {} });
    expect(pay({ mode: "amount" })).toEqual({ errors: {} });
    expect(pay({ mode: "term", principal: "100" })).toEqual({ errors: {} });
  });
});

const am = (over: Partial<AmortRaw> = {}) => evaluateAmort({ principal: "1000000", rate: "9", tenure: "5", tenureUnit: "years", extra: "", ...over } as AmortRaw);

describe("amortization calculator", () => {
  it("builds 60 monthly rows and 5 yearly rows that add up", () => {
    const { result } = am();
    expect(result!.schedule.rows).toHaveLength(60);
    expect(result!.years).toHaveLength(5);
    expect(result!.years.reduce((t, y) => t + y.principal, 0)).toBeCloseTo(1_000_000, 4);
    expect(result!.years.reduce((t, y) => t + y.interest, 0)).toBeCloseTo(result!.schedule.totalInterest, 6);
    expect(result!.years[4]!.balance).toBe(0);
    expect(text(result!.workings)).toContain("Month 1 interest = ₹10,00,000.00 × 0.0075 = ₹7,500.00");
  });
  it("finishes sooner with an extra payment", () => {
    expect(am({ extra: "10000" }).result!.schedule.months).toBeLessThan(60);
  });
});

const rt = (over: Partial<RateRaw>) => evaluateRate({ principal: "1000000", payment: "20758.36", tenure: "5", tenureUnit: "years", ...over } as RateRaw);

describe("interest rate calculator", () => {
  it("finds 9% from a ₹20,758.36 payment", () => {
    const { result } = rt({});
    expect(result!.rate).toBeCloseTo(9, 3);
    expect(text(result!.workings)).toContain("Check:");
  });
  it("finds 0% when the payments add up to exactly the loan", () => {
    expect(rt({ payment: "16666.6666666667" }).result!.rate).toBeLessThan(0.0001);
  });
  it("explains a payment that is too small", () => {
    expect(rt({ payment: "10000" }).errors.payment).toMatch(/less than the loan/);
  });
});
