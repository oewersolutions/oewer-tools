/**
 * Maths for the salary, sales tax and income tax (slab) calculators. Pure functions, no DOM.
 * The income tax calculator carries no tax rates of its own: the visitor types the slabs, so nothing here goes out of date when a Budget changes them.
 */
import {
  MAX_AMOUNT,
  formatMoney as m,
  readAll,
  readNumber,
  type Evaluation,
} from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

// Salary: the same pay shown per year, month, week, day and hour

export type PayPeriod = "annual" | "monthly" | "weekly" | "daily" | "hourly";
export const PAY_PERIODS: Record<PayPeriod, string> = {
  annual: "Per year",
  monthly: "Per month",
  weekly: "Per week",
  daily: "Per day",
  hourly: "Per hour",
};

export interface SalaryRaw extends Record<string, string> {
  amount: string;
  period: PayPeriod;
  hoursPerWeek: string;
  daysPerWeek: string;
  weeksPerYear: string;
}
export interface SalaryResult {
  annual: number;
  monthly: number;
  weekly: number;
  daily: number;
  hourly: number;
  workings: Workings;
}

export function evaluateSalary(
  raw: SalaryRaw,
): Evaluation<SalaryRaw, SalaryResult> {
  const { errors, values } = readAll(raw, {
    amount: ["Pay", { positive: true, max: MAX_AMOUNT }],
    hoursPerWeek: ["Hours per week", { positive: true, max: 168 }],
    daysPerWeek: ["Days per week", { positive: true, max: 7 }],
    weeksPerYear: ["Weeks per year", { positive: true, max: 53 }],
  });
  if (!values) return { errors };
  const {
    amount,
    hoursPerWeek: hours,
    daysPerWeek: days,
    weeksPerYear: weeks,
  } = values;
  const toAnnual: Record<PayPeriod, number> = {
    annual: 1,
    monthly: 12,
    weekly: weeks,
    daily: days * weeks,
    hourly: hours * weeks,
  };
  const annual = amount * toAnnual[raw.period];
  const weekly = annual / weeks;
  const steps = [
    raw.period === "annual"
      ? `Yearly pay = ${m(annual)}`
      : `Yearly pay = ${m(amount)} × ${raw.period === "monthly" ? "12 months" : raw.period === "weekly" ? `${q(weeks)} weeks` : raw.period === "daily" ? `${q(days)} days × ${q(weeks)} weeks` : `${q(hours)} hours × ${q(weeks)} weeks`} = ${m(annual)}`,
    `Monthly = ${m(annual)} ÷ 12 = ${m(annual / 12)}`,
    `Weekly = ${m(annual)} ÷ ${q(weeks)} weeks = ${m(weekly)}`,
    `Daily = ${m(weekly)} ÷ ${q(days)} days = ${m(weekly / days)}`,
    `Hourly = ${m(weekly)} ÷ ${q(hours)} hours = ${m(weekly / hours)}`,
  ];
  return {
    errors,
    result: {
      annual,
      monthly: annual / 12,
      weekly,
      daily: weekly / days,
      hourly: weekly / hours,
      workings: {
        formula: [
          "Yearly pay = Pay × periods in a year",
          "Monthly = Yearly ÷ 12",
          "Weekly = Yearly ÷ weeks per year",
          "Daily = Weekly ÷ days per week",
          "Hourly = Weekly ÷ hours per week",
        ],
        steps,
        note: "Gross pay before tax and deductions. Use fewer weeks per year if some leave is unpaid. Overtime, bonuses and allowances are not included.",
      },
    },
  };
}

// Sales tax: price, quantity, a discount before tax and one or two tax rates

export interface SalesTaxRaw extends Record<string, string> {
  mode: "add" | "remove";
  price: string;
  quantity: string;
  discount: string;
  rate: string;
  rate2: string;
}
export interface SalesTaxResult {
  mode: "add" | "remove";
  subtotal: number;
  discountAmount: number;
  beforeTax: number;
  tax: number;
  tax2: number;
  total: number;
  workings: Workings;
}

export function evaluateSalesTax(
  raw: SalesTaxRaw,
): Evaluation<SalesTaxRaw, SalesTaxResult> {
  const add = raw.mode === "add";
  const { errors, values } = readAll(
    { price: raw.price, rate: raw.rate },
    {
      price: [
        add ? "Price" : "Price including tax",
        { positive: true, max: MAX_AMOUNT },
      ],
      rate: ["Tax rate", { max: 100 }],
    },
  );
  const all: Partial<Record<string, string>> = { ...errors };
  const qty = readNumber(raw.quantity, "Quantity", {
    positive: true,
    max: 1e9,
  });
  const discount = readNumber(raw.discount, "Discount", { max: 100 });
  const rate2 = readNumber(raw.rate2, "Second tax rate", { max: 100 });
  if (add && "error" in qty) all.quantity = qty.error;
  if (add && "error" in discount) all.discount = discount.error;
  if ("error" in rate2) all.rate2 = rate2.error;
  if (
    !values ||
    (add && "error" in qty) ||
    (add && "error" in discount) ||
    "error" in rate2
  )
    return { errors: all };
  const r1 = values.rate;
  const r2 = "value" in rate2 ? rate2.value : 0;
  const quantity = add && "value" in qty ? qty.value : 1;
  const disc = add && "value" in discount ? discount.value : 0;
  const rates = r2 > 0 ? `${q(r1)}% + ${q(r2)}%` : `${q(r1)}%`;

  if (add) {
    const subtotal = values.price * quantity;
    const discountAmount = (subtotal * disc) / 100;
    const beforeTax = subtotal - discountAmount;
    const tax = (beforeTax * r1) / 100;
    const tax2 = (beforeTax * r2) / 100;
    const total = beforeTax + tax + tax2;
    const steps = [
      `Subtotal = ${m(values.price)} × ${q(quantity)} = ${m(subtotal)}`,
    ];
    if (disc > 0)
      steps.push(
        `Discount = ${m(subtotal)} × ${q(disc)} ÷ 100 = ${m(discountAmount)}, so the price before tax is ${m(beforeTax)}`,
      );
    steps.push(
      `Tax at ${q(r1)}% = ${m(beforeTax)} × ${q(r1)} ÷ 100 = ${m(tax)}`,
    );
    if (r2 > 0)
      steps.push(
        `Second tax at ${q(r2)}% = ${m(beforeTax)} × ${q(r2)} ÷ 100 = ${m(tax2)}`,
      );
    steps.push(
      `Total = ${m(beforeTax)} + ${m(tax)}${r2 > 0 ? ` + ${m(tax2)}` : ""} = ${m(total)}`,
    );
    return {
      errors: {},
      result: {
        mode: "add",
        subtotal,
        discountAmount,
        beforeTax,
        tax,
        tax2,
        total,
        workings: {
          formula: [
            "Tax = Price before tax × Rate ÷ 100",
            "Total = Price before tax + Tax",
          ],
          steps,
          note: "The discount is taken off before tax. Both tax rates are applied to the same price, not to each other. Rules differ between places and goods, so check the tax rules that apply to you.",
        },
      },
    };
  }
  const combined = r1 + r2;
  const beforeTax = (values.price * 100) / (100 + combined);
  const tax = (beforeTax * r1) / 100;
  const tax2 = (beforeTax * r2) / 100;
  return {
    errors: {},
    result: {
      mode: "remove",
      subtotal: beforeTax,
      discountAmount: 0,
      beforeTax,
      tax,
      tax2,
      total: values.price,
      workings: {
        formula: [
          "Price before tax = Price with tax × 100 ÷ (100 + Rate)",
          "Tax = Price with tax − Price before tax",
        ],
        steps: [
          `Total rate = ${rates}${r2 > 0 ? ` = ${q(combined)}%` : ""}`,
          `Price before tax = ${m(values.price)} × 100 ÷ (100 + ${q(combined)}) = ${m(beforeTax)}`,
          `Tax = ${m(values.price)} − ${m(beforeTax)} = ${m(values.price - beforeTax)}${r2 > 0 ? `, which is ${m(tax)} at ${q(r1)}% and ${m(tax2)} at ${q(r2)}%` : ""}`,
        ],
        note: "Rules differ between places and goods, so check the tax rules that apply to you.",
      },
    },
  };
}

// Income tax by slabs the visitor enters

export const SLAB_ROWS = 7;

export interface TaxRaw extends Record<string, string> {
  income: string;
  deduction: string;
  cess: string;
  from1: string;
  rate1: string;
  from2: string;
  rate2: string;
  from3: string;
  rate3: string;
  from4: string;
  rate4: string;
  from5: string;
  rate5: string;
  from6: string;
  rate6: string;
  from7: string;
  rate7: string;
}
export interface SlabRow {
  from: number;
  /** Where the slab ends, or undefined for the top slab. */
  to?: number;
  rate: number;
  income: number;
  tax: number;
}
export interface TaxResult {
  taxable: number;
  slabs: SlabRow[];
  taxBeforeCess: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  takeHome: number;
  workings: Workings;
}

export function evaluateTax(raw: TaxRaw): Evaluation<TaxRaw, TaxResult> {
  const errors: Partial<Record<string, string>> = {};
  const income = readNumber(raw.income, "Income", {
    positive: true,
    max: MAX_AMOUNT,
  });
  const deduction = readNumber(raw.deduction, "Deductions", {
    max: MAX_AMOUNT,
  });
  const cess = readNumber(raw.cess, "Cess", { max: 100 });
  if ("error" in income) errors.income = income.error;
  if ("error" in deduction) errors.deduction = deduction.error;
  if ("error" in cess) errors.cess = cess.error;

  // The slabs: a row with both boxes empty is ignored, and a half-filled row is an error. The first slab always starts at 0.
  const slabs: { from: number; rate: number }[] = [];
  for (let i = 1; i <= SLAB_ROWS; i++) {
    const fromKey = `from${i}`;
    const rateKey = `rate${i}`;
    const fromText = i === 1 ? "0" : raw[fromKey]!;
    const rateText = raw[rateKey]!;
    if (i > 1 && fromText.trim() === "" && rateText.trim() === "") continue;
    const from = readNumber(fromText, `Slab ${i} start`, { max: MAX_AMOUNT });
    const rate = readNumber(rateText, `Slab ${i} rate`, { max: 100 });
    if ("error" in from) errors[fromKey] = from.error;
    else if ("empty" in from) errors[fromKey] = `Enter where slab ${i} starts.`;
    if ("error" in rate) errors[rateKey] = rate.error;
    else if ("empty" in rate) errors[rateKey] = `Enter the rate for slab ${i}.`;
    if ("value" in from && "value" in rate) {
      const last = slabs[slabs.length - 1];
      if (last && from.value <= last.from)
        errors[fromKey] =
          `Slab ${i} must start above ${m(last.from)}, where the slab before it starts.`;
      else slabs.push({ from: from.value, rate: rate.value });
    }
  }
  if (Object.keys(errors).length > 0 || !("value" in income)) return { errors };

  const taxable = Math.max(
    0,
    income.value - ("value" in deduction ? deduction.value : 0),
  );
  const rows: SlabRow[] = slabs.map((s, i) => {
    const to = slabs[i + 1]?.from;
    const inSlab = Math.max(0, Math.min(taxable, to ?? Infinity) - s.from);
    return {
      from: s.from,
      ...(to === undefined ? {} : { to }),
      rate: s.rate,
      income: inSlab,
      tax: (inSlab * s.rate) / 100,
    };
  });
  const taxBeforeCess = rows.reduce((t, r) => t + r.tax, 0);
  const cessRate = "value" in cess ? cess.value : 0;
  const cessAmount = (taxBeforeCess * cessRate) / 100;
  const totalTax = taxBeforeCess + cessAmount;
  const top = [...rows].reverse().find((r) => r.income > 0);
  const range = (r: SlabRow) =>
    r.to === undefined ? `above ${m(r.from)}` : `${m(r.from)} to ${m(r.to)}`;
  const steps = [
    `Taxable income = ${m(income.value)} − ${m("value" in deduction ? deduction.value : 0)} = ${m(taxable)}`,
  ];
  for (const r of rows)
    steps.push(
      r.income > 0
        ? `Slab ${range(r)} at ${q(r.rate)}%: ${m(r.income)} × ${q(r.rate)} ÷ 100 = ${m(r.tax)}`
        : `Slab ${range(r)} at ${q(r.rate)}%: no income falls here, so ${m(0)}`,
    );
  steps.push(
    `Tax before cess = ${rows.map((r) => m(r.tax)).join(" + ")} = ${m(taxBeforeCess)}`,
  );
  if (cessRate > 0)
    steps.push(
      `Cess = ${m(taxBeforeCess)} × ${q(cessRate)} ÷ 100 = ${m(cessAmount)}, so the total tax is ${m(totalTax)}`,
    );
  steps.push(
    `Effective rate = ${m(totalTax)} ÷ ${m(income.value)} × 100 = ${q((totalTax / income.value) * 100)}%`,
  );
  return {
    errors: {},
    result: {
      taxable,
      slabs: rows,
      taxBeforeCess,
      cess: cessAmount,
      totalTax,
      effectiveRate: (totalTax / income.value) * 100,
      marginalRate: top?.rate ?? 0,
      takeHome: income.value - totalTax,
      workings: {
        formula: [
          "Tax = sum over the slabs of (income inside the slab × slab rate ÷ 100)",
          "Cess = Tax × cess rate ÷ 100",
          "Effective rate = Total tax ÷ Income",
        ],
        steps,
        note: "Only the slabs you enter are used. Rebates, surcharge, other income, special rates and the other rules of your tax regime are not applied, and rates and slabs change every year, so check the current rules or ask a tax professional. This is general information, not tax advice.",
      },
    },
  };
}
