import { describe, expect, it } from "vitest";
import { formatMoney } from "../lib/tools/finance";
import { evaluateSalary, evaluateSalesTax, evaluateTax, type SalaryRaw, type SalesTaxRaw, type TaxRaw } from "../lib/tools/pay";

const text = (w: { formula: string[]; steps: string[] } | undefined) => [...(w?.formula ?? []), ...(w?.steps ?? [])].join("\n");

const sal = (over: Partial<SalaryRaw> = {}) => evaluateSalary({ amount: "600000", period: "annual", hoursPerWeek: "40", daysPerWeek: "5", weeksPerYear: "52", ...over } as SalaryRaw);

describe("salary calculator", () => {
  it("shows a yearly salary in every period", () => {
    const { result } = sal();
    expect(result!.monthly).toBe(50_000);
    expect(result!.weekly).toBeCloseTo(600_000 / 52, 6);
    expect(result!.daily).toBeCloseTo(600_000 / 52 / 5, 6);
    expect(result!.hourly).toBeCloseTo(600_000 / 52 / 40, 6);
    expect(text(result!.workings)).toContain("Monthly = ₹6,00,000.00 ÷ 12 = ₹50,000.00");
  });
  it("converts from each period back to the same year", () => {
    expect(sal({ amount: "50000", period: "monthly" }).result!.annual).toBe(600_000);
    expect(sal({ amount: "1000", period: "weekly" }).result!.annual).toBe(52_000);
    expect(sal({ amount: "200", period: "daily" }).result!.annual).toBe(200 * 5 * 52);
    expect(sal({ amount: "300", period: "hourly" }).result!.annual).toBe(300 * 40 * 52);
  });
  it("uses fewer weeks when asked, and rejects bad values", () => {
    expect(sal({ amount: "1000", period: "weekly", weeksPerYear: "48" }).result!.annual).toBe(48_000);
    expect(sal({ amount: "" })).toEqual({ errors: {} });
    expect(sal({ hoursPerWeek: "200" }).errors.hoursPerWeek).toMatch(/more than 168/);
    expect(sal({ daysPerWeek: "0" }).errors.daysPerWeek).toMatch(/greater than 0/);
    expect(sal({ weeksPerYear: "60" }).errors.weeksPerYear).toMatch(/more than 53/);
  });
});

const tax = (over: Partial<SalesTaxRaw> = {}) => evaluateSalesTax({ mode: "add", price: "1000", quantity: "1", discount: "", rate: "18", rate2: "", ...over } as SalesTaxRaw);

describe("sales tax calculator", () => {
  it("adds tax to a price", () => {
    const { result } = tax();
    expect(result!.tax).toBe(180);
    expect(result!.total).toBe(1180);
  });
  it("takes the discount off before tax, and multiplies by the quantity", () => {
    const { result } = tax({ quantity: "3", discount: "10" });
    expect(result!.subtotal).toBe(3000);
    expect(result!.discountAmount).toBe(300);
    expect(result!.beforeTax).toBe(2700);
    expect(result!.total).toBeCloseTo(2700 * 1.18, 6);
    expect(text(result!.workings)).toContain("Discount");
  });
  it("applies a second tax to the same price, not on top of the first", () => {
    const { result } = tax({ rate: "5", rate2: "3" });
    expect(result!.tax).toBe(50);
    expect(result!.tax2).toBe(30);
    expect(result!.total).toBe(1080);
  });
  it("removes tax from a price that includes it", () => {
    const { result } = tax({ mode: "remove", price: "1180" });
    expect(result!.beforeTax).toBeCloseTo(1000, 9);
    expect(result!.tax).toBeCloseTo(180, 9);
    const two = tax({ mode: "remove", price: "1080", rate: "5", rate2: "3" }).result!;
    expect(two.beforeTax).toBeCloseTo(1000, 9);
    expect(text(two.workings)).toContain("5% + 3% = 8%");
  });
  it("ignores quantity and discount when removing tax, and rejects bad input", () => {
    expect(tax({ mode: "remove", price: "1180", quantity: "abc", discount: "x" }).result).toBeDefined();
    expect(tax({ price: "" })).toEqual({ errors: {} });
    expect(tax({ rate: "150" }).errors.rate).toMatch(/more than 100/);
    expect(tax({ quantity: "0" }).errors.quantity).toMatch(/greater than 0/);
    expect(tax({ rate2: "abc" }).errors.rate2).toMatch(/number/);
  });
});

const SLABS = { from1: "0", rate1: "0", from2: "300000", rate2: "5", from3: "700000", rate3: "10", from4: "1000000", rate4: "15", from5: "1200000", rate5: "20", from6: "1500000", rate6: "30", from7: "", rate7: "" };
const inc = (over: Partial<TaxRaw> = {}) => evaluateTax({ income: "1200000", deduction: "75000", cess: "4", ...SLABS, ...over } as TaxRaw);

describe("income tax by slabs", () => {
  it("works out the tax slab by slab on income after deductions", () => {
    const { result } = inc();
    expect(result!.taxable).toBe(1_125_000);
    expect(result!.slabs.map((s) => s.tax)).toEqual([0, 20_000, 30_000, 18_750, 0, 0]);
    expect(result!.taxBeforeCess).toBe(68_750);
    expect(result!.cess).toBe(2750);
    expect(result!.totalTax).toBe(71_500);
    expect(result!.effectiveRate).toBeCloseTo((71_500 / 1_200_000) * 100, 9);
    expect(result!.marginalRate).toBe(15);
    expect(result!.takeHome).toBe(1_128_500);
    expect(formatMoney(result!.totalTax)).toBe("₹71,500.00");
    expect(text(result!.workings)).toContain("Slab ₹10,00,000.00 to ₹12,00,000.00 at 15%: ₹1,25,000.00 × 15 ÷ 100 = ₹18,750.00");
  });
  it("taxes only the part of income above the top slab's start at the top rate", () => {
    const { result } = inc({ income: "2000000", deduction: "", cess: "" });
    expect(result!.slabs.at(-1)!.income).toBe(500_000);
    expect(result!.slabs.at(-1)!.tax).toBe(150_000);
    expect(result!.taxBeforeCess).toBe(20_000 + 30_000 + 30_000 + 60_000 + 150_000);
    expect(result!.marginalRate).toBe(30);
  });
  it("is zero when income after deductions is inside the first slab, and never negative", () => {
    expect(inc({ income: "200000", deduction: "50000" }).result!.totalTax).toBe(0);
    expect(inc({ income: "100000", deduction: "500000" }).result!.taxable).toBe(0);
  });
  it("ignores empty rows and handles a single flat slab", () => {
    const flat = evaluateTax({ income: "1000000", deduction: "", cess: "", ...{ from1: "0", rate1: "10", from2: "", rate2: "", from3: "", rate3: "", from4: "", rate4: "", from5: "", rate5: "", from6: "", rate6: "", from7: "", rate7: "" } } as TaxRaw);
    expect(flat.result!.totalTax).toBe(100_000);
    expect(flat.result!.slabs).toHaveLength(1);
  });
  it("explains slabs that are out of order, half filled or have a bad rate", () => {
    expect(inc({ from3: "200000" }).errors.from3).toMatch(/must start above/);
    expect(inc({ from7: "2000000" }).errors.rate7).toMatch(/Enter the rate for slab 7/);
    expect(inc({ rate7: "20" }).errors.from7).toMatch(/Enter where slab 7 starts/);
    expect(inc({ rate2: "150" }).errors.rate2).toMatch(/more than 100/);
    expect(inc({ income: "" })).toEqual({ errors: {} });
    expect(inc({ cess: "abc" }).errors.cess).toMatch(/number/);
  });
});
