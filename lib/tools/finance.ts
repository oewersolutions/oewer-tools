/** Calculation logic for the finance tools. Pure functions, no DOM, so it is unit tested directly. */

export type FieldState = { value: number } | { error: string } | { empty: true };

export interface NumberRules {
  min?: number;
  max?: number;
  /** Reject zero (use for amounts and durations). */
  positive?: boolean;
  integer?: boolean;
}

/** Parse what a visitor typed. Commas and spaces are ignored; empty input is "not entered yet", not an error. */
export function readNumber(raw: string, label: string, rules: NumberRules = {}): FieldState {
  const text = raw.replace(/[,\s]/g, "");
  if (text === "") return { empty: true };
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return { error: `${label} must be a number.` };
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: `${label} must be a number.` };
  const min = rules.min ?? 0;
  if (value < min) return { error: `${label} cannot be less than ${min}.` };
  if (rules.positive && value === 0) return { error: `${label} must be greater than 0.` };
  if (rules.max !== undefined && value > rules.max) return { error: `${label} cannot be more than ${rules.max.toLocaleString("en-IN")}.` };
  if (rules.integer && !Number.isInteger(value)) return { error: `${label} must be a whole number.` };
  return { value };
}

export type Evaluation<Raw, Result> = { errors: Partial<Record<keyof Raw, string>>; result?: Result };

/** Read several fields at once: collects errors, and yields values only when every field is valid. */
function readAll<Raw extends Record<string, string>>(
  raw: Raw,
  specs: { [K in keyof Raw]?: [label: string, rules?: NumberRules] },
): { errors: Partial<Record<keyof Raw, string>>; values?: { [K in keyof Raw]: number } } {
  const errors: Partial<Record<keyof Raw, string>> = {};
  const values: Record<string, number> = {};
  let ready = true;
  for (const key of Object.keys(specs) as (keyof Raw & string)[]) {
    const [label, rules] = specs[key]!;
    const state = readNumber(raw[key] ?? "", label, rules);
    if ("error" in state) {
      errors[key] = state.error;
      ready = false;
    } else if ("empty" in state) {
      ready = false;
    } else {
      values[key] = state.value;
    }
  }
  return ready ? { errors, values: values as { [K in keyof Raw]: number } } : { errors };
}

export const MAX_AMOUNT = 1e12;

// EMI

export interface EmiRaw extends Record<string, string> {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: "years" | "months";
}
export interface EmiResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  months: number;
}

/** Monthly instalment for a reducing-balance loan. A rate of 0 splits the principal evenly. */
export function calculateEmi(principal: number, annualRatePercent: number, months: number): EmiResult {
  const i = annualRatePercent / 12 / 100;
  const emi = i === 0 ? principal / months : (principal * i * (1 + i) ** months) / ((1 + i) ** months - 1);
  const totalPayment = emi * months;
  return { emi, totalPayment, totalInterest: totalPayment - principal, principal, months };
}

export function evaluateEmi(raw: EmiRaw): Evaluation<EmiRaw, EmiResult> {
  const years = raw.tenureUnit === "years";
  const { errors, values } = readAll(raw, {
    principal: ["Loan amount", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    tenure: ["Tenure", { positive: true, max: years ? 40 : 480, ...(years ? {} : { integer: true }) }],
  });
  if (!values) return { errors };
  const months = Math.round(years ? values.tenure * 12 : values.tenure);
  if (months < 1) return { errors: { tenure: "Tenure must be at least 1 month." } };
  return { errors, result: calculateEmi(values.principal, values.rate, months) };
}

// Fixed deposit

export type Compounding = "12" | "4" | "2" | "1" | "0";
export const COMPOUNDING_LABELS: Record<Compounding, string> = {
  "12": "Monthly",
  "4": "Quarterly",
  "2": "Half-yearly",
  "1": "Yearly",
  "0": "At maturity (simple interest)",
};

export interface FdRaw extends Record<string, string> {
  principal: string;
  rate: string;
  tenure: string;
  tenureUnit: "years" | "months";
  compounding: Compounding;
}
export interface FdResult {
  principal: number;
  maturityAmount: number;
  interestEarned: number;
}

/** Maturity amount; `timesPerYear` of 0 means simple interest paid at maturity. */
export function calculateFd(principal: number, annualRatePercent: number, years: number, timesPerYear: number): FdResult {
  const r = annualRatePercent / 100;
  const maturityAmount = timesPerYear === 0 ? principal * (1 + r * years) : principal * (1 + r / timesPerYear) ** (timesPerYear * years);
  return { principal, maturityAmount, interestEarned: maturityAmount - principal };
}

export function evaluateFd(raw: FdRaw): Evaluation<FdRaw, FdResult> {
  const inYears = raw.tenureUnit === "years";
  const { errors, values } = readAll(raw, {
    principal: ["Deposit amount", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    tenure: ["Tenure", { positive: true, max: inYears ? 50 : 600 }],
  });
  if (!values) return { errors };
  const years = inYears ? values.tenure : values.tenure / 12;
  return { errors, result: calculateFd(values.principal, values.rate, years, Number(raw.compounding)) };
}

// GST

export interface GstRaw extends Record<string, string> {
  amount: string;
  rate: string;
  mode: "add" | "remove";
}
export interface GstResult {
  netAmount: number;
  gstAmount: number;
  grossAmount: number;
  /** Half of the GST, for intra-state supplies (CGST and SGST are equal). */
  halfGst: number;
}

/** "add": the amount excludes GST. "remove": the amount already includes it. */
export function calculateGst(amount: number, ratePercent: number, mode: "add" | "remove"): GstResult {
  const netAmount = mode === "add" ? amount : (amount * 100) / (100 + ratePercent);
  const gstAmount = mode === "add" ? (amount * ratePercent) / 100 : amount - netAmount;
  return { netAmount, gstAmount, grossAmount: netAmount + gstAmount, halfGst: gstAmount / 2 };
}

export function evaluateGst(raw: GstRaw): Evaluation<GstRaw, GstResult> {
  const { errors, values } = readAll(raw, {
    amount: ["Amount", { positive: true, max: MAX_AMOUNT }],
    rate: ["GST rate", { max: 100 }],
  });
  return values ? { errors, result: calculateGst(values.amount, values.rate, raw.mode) } : { errors };
}

// Percentage

export type PercentageMode = "of" | "what-percent" | "change" | "increase" | "decrease";

export interface PercentageRaw extends Record<string, string> {
  a: string;
  b: string;
  mode: PercentageMode;
}
export interface PercentageResult {
  /** The headline answer, already a plain number; `unit` tells the display how to show it. */
  value: number;
  unit: "number" | "percent";
  explanation: string;
}

export const PERCENTAGE_MODES: Record<PercentageMode, { label: string; aLabel: string; bLabel: string }> = {
  of: { label: "X% of Y", aLabel: "Percentage (X)", bLabel: "Number (Y)" },
  "what-percent": { label: "X is what % of Y", aLabel: "Part (X)", bLabel: "Whole (Y)" },
  change: { label: "% change from X to Y", aLabel: "Old value (X)", bLabel: "New value (Y)" },
  increase: { label: "Increase X by Y%", aLabel: "Number (X)", bLabel: "Increase (Y%)" },
  decrease: { label: "Decrease X by Y%", aLabel: "Number (X)", bLabel: "Decrease (Y%)" },
};

export function evaluatePercentage(raw: PercentageRaw): Evaluation<PercentageRaw, PercentageResult> {
  const { mode } = raw;
  const labels = PERCENTAGE_MODES[mode];
  const allowNegative = mode === "change" || mode === "of" || mode === "increase" || mode === "decrease";
  const big = 1e15;
  const { errors, values } = readAll(raw, {
    a: [labels.aLabel, { min: allowNegative ? -big : 0, max: big }],
    b: [labels.bLabel, { min: mode === "of" || mode === "change" ? -big : 0, max: big }],
  });
  if (!values) return { errors };
  const { a, b } = values;

  switch (mode) {
    case "of":
      return { errors, result: { value: (a / 100) * b, unit: "number", explanation: `${a}% of ${b}` } };
    case "what-percent":
      if (b === 0) return { errors: { b: "Whole (Y) cannot be 0." } };
      return { errors, result: { value: (a / b) * 100, unit: "percent", explanation: `${a} out of ${b}` } };
    case "change":
      if (a === 0) return { errors: { a: "Old value (X) cannot be 0 when working out a % change." } };
      return { errors, result: { value: ((b - a) / Math.abs(a)) * 100, unit: "percent", explanation: `from ${a} to ${b}` } };
    case "increase":
      return { errors, result: { value: a * (1 + b / 100), unit: "number", explanation: `${a} increased by ${b}%` } };
    case "decrease":
      return { errors, result: { value: a * (1 - b / 100), unit: "number", explanation: `${a} decreased by ${b}%` } };
  }
}

// Display

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

export const formatMoney = (n: number): string => inr.format(n);
export const formatNumber = (n: number): string => plain.format(n);
export const formatPercent = (n: number): string => `${plain.format(n)}%`;
