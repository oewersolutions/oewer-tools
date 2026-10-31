/** Maths for the simple and compound interest calculators. Pure functions, no DOM. */
import { MAX_AMOUNT, readAll, type Evaluation } from "./finance";

export type CompoundingPerYear = "365" | "12" | "4" | "2" | "1";
export const COMPOUNDING_CHOICES: Record<CompoundingPerYear, string> = {
  "1": "Yearly",
  "2": "Half-yearly",
  "4": "Quarterly",
  "12": "Monthly",
  "365": "Daily",
};

/** A = P x (1 + r/n)^(n x t): the balance after `years` when interest is added `timesPerYear` times a year. */
export function compoundBalance(principal: number, annualRatePercent: number, years: number, timesPerYear: number): number {
  return principal * (1 + annualRatePercent / 100 / timesPerYear) ** (timesPerYear * years);
}

export interface CompoundRow {
  year: number;
  balance: number;
  interestThisYear: number;
}
export interface CompoundResult {
  principal: number;
  amount: number;
  interest: number;
  rows: CompoundRow[];
}

export function calculateCompound(principal: number, annualRatePercent: number, years: number, timesPerYear: number): CompoundResult {
  const amount = compoundBalance(principal, annualRatePercent, years, timesPerYear);
  // One row per whole year, and a last row for the exact end when the period is not a whole number of years.
  const marks = Array.from({ length: Math.floor(years) }, (_, i) => i + 1);
  if (!Number.isInteger(years)) marks.push(years);
  let previous = principal;
  const rows = marks.map((year) => {
    const balance = compoundBalance(principal, annualRatePercent, year, timesPerYear);
    const row = { year, balance, interestThisYear: balance - previous };
    previous = balance;
    return row;
  });
  return { principal, amount, interest: amount - principal, rows };
}

export interface CompoundRaw extends Record<string, string> {
  principal: string;
  rate: string;
  years: string;
  compounding: CompoundingPerYear;
}

export function evaluateCompound(raw: CompoundRaw): Evaluation<CompoundRaw, CompoundResult> {
  const { errors, values } = readAll(raw, {
    principal: ["Principal", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    years: ["Time period", { positive: true, max: 50 }],
  });
  if (!values) return { errors };
  return { errors, result: calculateCompound(values.principal, values.rate, values.years, Number(raw.compounding)) };
}

// Simple interest

export type TimeUnit = "years" | "months" | "days";
export const TIME_UNITS: Record<TimeUnit, string> = { years: "Years", months: "Months", days: "Days" };
const UNITS_PER_YEAR: Record<TimeUnit, number> = { years: 1, months: 12, days: 365 };

/** SI = P x R x T / 100, with T in years. Months count as 1/12 of a year and days as 1/365. */
export function calculateSimple(principal: number, annualRatePercent: number, time: number, unit: TimeUnit) {
  const years = time / UNITS_PER_YEAR[unit];
  const interest = (principal * annualRatePercent * years) / 100;
  return { principal, interest, amount: principal + interest, years };
}

export interface SimpleRaw extends Record<string, string> {
  principal: string;
  rate: string;
  time: string;
  unit: TimeUnit;
}

export function evaluateSimple(raw: SimpleRaw): Evaluation<SimpleRaw, ReturnType<typeof calculateSimple>> {
  const max = { years: 100, months: 1200, days: 36500 }[raw.unit];
  const { errors, values } = readAll(raw, {
    principal: ["Principal", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    time: ["Time period", { positive: true, max }],
  });
  if (!values) return { errors };
  return { errors, result: calculateSimple(values.principal, values.rate, values.time, raw.unit) };
}
