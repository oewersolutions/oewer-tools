/**
 * Growth maths for the SIP and lumpsum calculators. Pure functions, no DOM. Both assume the same return every year, which is
 * a simplification: real investments go up and down, so every figure here is an estimate.
 */
import { MAX_AMOUNT, readAll, type Evaluation } from "./finance";

export interface GrowthResult {
  invested: number;
  maturity: number;
  returns: number;
}

/**
 * Value of a monthly SIP. Instalments are paid at the start of each month and the return compounds monthly:
 * FV = P x ((1 + i)^n - 1) / i x (1 + i), with i = annual rate / 12 / 100 and n = months. At a 0% return it is just the money put in.
 */
export function calculateSip(monthly: number, annualRatePercent: number, years: number): GrowthResult {
  const months = Math.round(years * 12);
  const i = annualRatePercent / 12 / 100;
  const invested = monthly * months;
  const maturity = i === 0 ? invested : monthly * (((1 + i) ** months - 1) / i) * (1 + i);
  return { invested, maturity, returns: maturity - invested };
}

/** Value of a single investment left to grow for whole or part years: FV = P x (1 + r)^years, compounded yearly. */
export function calculateLumpsum(amount: number, annualRatePercent: number, years: number): GrowthResult {
  const maturity = amount * (1 + annualRatePercent / 100) ** years;
  return { invested: amount, maturity, returns: maturity - amount };
}

/** What each year of a SIP looks like, for the year-by-year table. */
export function sipByYear(monthly: number, annualRatePercent: number, years: number): { year: number; invested: number; value: number }[] {
  const rows = [];
  for (let y = 1; y <= Math.floor(years); y++) {
    const r = calculateSip(monthly, annualRatePercent, y);
    rows.push({ year: y, invested: r.invested, value: r.maturity });
  }
  return rows;
}

export interface SipRaw extends Record<string, string> {
  monthly: string;
  rate: string;
  years: string;
}
export interface LumpsumRaw extends Record<string, string> {
  amount: string;
  rate: string;
  years: string;
}
export type SipResult = GrowthResult & { monthly: number; years: number };
export type LumpsumResult = GrowthResult & { years: number; yearlyGrowthPercent: number };

export function evaluateSip(raw: SipRaw): Evaluation<SipRaw, SipResult> {
  const { errors, values } = readAll(raw, {
    monthly: ["Monthly investment", { positive: true, max: MAX_AMOUNT }],
    rate: ["Expected return", { max: 50 }],
    years: ["Time period", { positive: true, max: 50 }],
  });
  if (!values) return { errors };
  if (Math.round(values.years * 12) < 1) return { errors: { years: "Time period must be at least 1 month." } };
  return { errors, result: { ...calculateSip(values.monthly, values.rate, values.years), monthly: values.monthly, years: values.years } };
}

export function evaluateLumpsum(raw: LumpsumRaw): Evaluation<LumpsumRaw, LumpsumResult> {
  const { errors, values } = readAll(raw, {
    amount: ["Investment amount", { positive: true, max: MAX_AMOUNT }],
    rate: ["Expected return", { max: 50 }],
    years: ["Time period", { positive: true, max: 50 }],
  });
  if (!values) return { errors };
  const r = calculateLumpsum(values.amount, values.rate, values.years);
  return { errors, result: { ...r, years: values.years, yearlyGrowthPercent: values.rate } };
}
