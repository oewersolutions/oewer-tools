/**
 * Maths for the recurring deposit (RD) and discount calculators. Pure functions, no DOM.
 */
import { MAX_AMOUNT, readAll, readNumber, type Evaluation } from "./finance";

export interface RdResult {
  deposited: number;
  maturity: number;
  interest: number;
  months: number;
}

/**
 * Maturity value of a recurring deposit under the usual Indian bank convention: interest compounds quarterly at rate / 4,
 * and each monthly instalment earns for its months in the deposit:
 *   M = R x ((1 + i)^N - 1) / (1 - (1 + i)^(-1/3)),  i = annual rate / 400,  N = months / 3.
 * Banks round and count days in their own ways, so their figure can differ by a small amount. At a 0% rate it is the sum deposited.
 */
export function calculateRd(monthly: number, annualRatePercent: number, months: number): RdResult {
  const deposited = monthly * months;
  const i = annualRatePercent / 400;
  const maturity = i === 0 ? deposited : (monthly * ((1 + i) ** (months / 3) - 1)) / (1 - (1 + i) ** (-1 / 3));
  return { deposited, maturity, interest: maturity - deposited, months };
}

export interface RdRaw extends Record<string, string> {
  monthly: string;
  rate: string;
  tenure: string;
  tenureUnit: "years" | "months";
}

export function evaluateRd(raw: RdRaw): Evaluation<RdRaw, RdResult> {
  const years = raw.tenureUnit === "years";
  const { errors, values } = readAll(raw, {
    monthly: ["Monthly deposit", { positive: true, max: MAX_AMOUNT }],
    rate: ["Interest rate", { max: 100 }],
    tenure: ["Tenure", { positive: true, max: years ? 10 : 120, ...(years ? {} : { integer: true }) }],
  });
  if (!values) return { errors };
  const months = Math.round(years ? values.tenure * 12 : values.tenure);
  if (months < 1) return { errors: { tenure: "Tenure must be at least 1 month." } };
  return { errors, result: calculateRd(values.monthly, values.rate, months) };
}

// Discounts

export interface DiscountResult {
  original: number;
  finalPrice: number;
  saved: number;
  /** The single discount that gives the same final price, in percent. */
  effectivePercent: number;
  /** The price after only the first discount, when a second one is given. */
  afterFirst?: number;
}

/** Final price after one or two successive percentage discounts: P x (1 - a/100) x (1 - b/100). The order does not matter. */
export function calculateDiscount(price: number, first: number, second = 0): DiscountResult {
  const afterFirst = price * (1 - first / 100);
  const finalPrice = afterFirst * (1 - second / 100);
  const saved = price - finalPrice;
  return { original: price, finalPrice, saved, effectivePercent: (saved / price) * 100, ...(second > 0 ? { afterFirst } : {}) };
}

export interface DiscountRaw extends Record<string, string> {
  price: string;
  first: string;
  second: string;
}

export function evaluateDiscount(raw: DiscountRaw): Evaluation<DiscountRaw, DiscountResult> {
  const { errors, values } = readAll({ price: raw.price, first: raw.first }, {
    price: ["Original price", { positive: true, max: MAX_AMOUNT }],
    first: ["Discount", { max: 100 }],
  });
  const secondState = readNumber(raw.second, "Second discount", { max: 100 });
  const all: Partial<Record<keyof DiscountRaw, string>> = { ...errors };
  if ("error" in secondState) all.second = secondState.error;
  if (!values || "error" in secondState) return { errors: all };
  return { errors: all, result: calculateDiscount(values.price, values.first, "value" in secondState ? secondState.value : 0) };
}
