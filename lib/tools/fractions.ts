/** Maths for the fraction calculator. Whole numbers are BigInt, so large fractions stay exact. Pure functions, no DOM. */
import type { Workings } from "./workings";

export type FractionOp = "add" | "subtract" | "multiply" | "divide";

export interface FractionRaw extends Record<string, string> {
  op: FractionOp;
  whole1: string;
  num1: string;
  den1: string;
  whole2: string;
  num2: string;
  den2: string;
}

export interface Frac {
  n: bigint;
  d: bigint;
}

export interface FractionResult {
  fraction: string;
  mixed: string;
  decimal: string;
  workings: Workings;
}

const SYMBOL: Record<FractionOp, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

export const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

export const reduce = (f: Frac): Frac => {
  if (f.n === 0n) return { n: 0n, d: 1n };
  const g = gcd(f.n, f.d);
  return { n: f.n / g, d: f.d / g };
};

const abs = (n: bigint) => (n < 0n ? -n : n);
const show = (f: Frac) => `${f.n}/${f.d}`;

/** "7/2" as "3 1/2" (a whole number when it divides exactly). */
export function mixedText(f: Frac): string {
  const sign = f.n < 0n ? "−" : "";
  const n = abs(f.n);
  const whole = n / f.d;
  const rest = n % f.d;
  if (rest === 0n) return `${sign}${whole}`;
  return whole === 0n
    ? `${sign}${rest}/${f.d}`
    : `${sign}${whole} ${rest}/${f.d}`;
}

/** A decimal for a fraction, to 10 places, with trailing zeros dropped. Exact in BigInt, so a huge fraction cannot lose digits. */
export function decimalText(f: Frac): string {
  const sign = f.n < 0n ? "−" : "";
  const n = abs(f.n);
  const scale = 10n ** 10n;
  const scaled = (n * scale * 2n + f.d) / (f.d * 2n); // rounds half up
  const whole = scaled / scale;
  const frac = (scaled % scale).toString().padStart(10, "0").replace(/0+$/, "");
  const text = frac === "" ? `${whole}` : `${whole}.${frac}`;
  return text === "0" ? "0" : `${sign}${text}`;
}

type Operand =
  { frac: Frac; text: string } | { error: string } | { empty: true };

const DIGITS = /^\d{1,9}$/;

function readOperand(
  wholeRaw: string,
  numRaw: string,
  denRaw: string,
  which: string,
): Operand {
  const whole = wholeRaw.replace(/\s/g, "");
  const num = numRaw.replace(/\s/g, "");
  const den = denRaw.replace(/\s/g, "");
  if (whole === "" && num === "" && den === "") return { empty: true };
  if (num !== "" && den === "") return { empty: true };
  if (num === "" && den !== "" && whole === "") return { empty: true };

  const negative =
    whole.startsWith("-") || (whole === "" && num.startsWith("-"));
  const w = whole.replace(/^-/, "");
  const nTxt = whole === "" ? num.replace(/^-/, "") : num;
  if (w !== "" && !DIGITS.test(w))
    return {
      error: `The whole number of the ${which} fraction must be a whole number of up to 9 digits.`,
    };
  if (nTxt !== "" && !DIGITS.test(nTxt))
    return {
      error: `The numerator of the ${which} fraction must be a whole number of up to 9 digits, with no sign after the whole number.`,
    };
  if (den !== "" && !DIGITS.test(den))
    return {
      error: `The denominator of the ${which} fraction must be a positive whole number of up to 9 digits.`,
    };

  const wholePart = w === "" ? 0n : BigInt(w);
  const numerator = nTxt === "" ? 0n : BigInt(nTxt);
  const denominator = den === "" ? 1n : BigInt(den);
  if (denominator === 0n)
    return { error: `The denominator of the ${which} fraction cannot be 0.` };

  const improper = wholePart * denominator + numerator;
  const frac: Frac = { n: negative ? -improper : improper, d: denominator };
  const text =
    den === ""
      ? `${negative ? "−" : ""}${wholePart}`
      : w !== ""
        ? `${negative ? "−" : ""}${wholePart} ${numerator}/${denominator}`
        : `${negative ? "−" : ""}${numerator}/${denominator}`;
  return { frac, text };
}

export function evaluateFractions(raw: FractionRaw): {
  errors: Partial<Record<string, string>>;
  result?: FractionResult;
} {
  const first = readOperand(raw.whole1, raw.num1, raw.den1, "first");
  const second = readOperand(raw.whole2, raw.num2, raw.den2, "second");
  const errors: Partial<Record<string, string>> = {};
  if ("error" in first) errors.first = first.error;
  if ("error" in second) errors.second = second.error;
  if (!("frac" in first) || !("frac" in second)) return { errors };

  const a = first.frac;
  const b = second.frac;
  if (raw.op === "divide" && b.n === 0n)
    return { errors: { second: "You cannot divide by zero." } };

  const steps: string[] = [];
  const symbol = SYMBOL[raw.op];
  const unreduced = (f: Frac, text: string) =>
    text.includes(" ") ? `${text} = ${show(f)}` : "";
  const improperA = unreduced(a, first.text);
  const improperB = unreduced(b, second.text);
  if (improperA || improperB) {
    steps.push(
      `Write any mixed number as an improper fraction: ${[improperA && `${improperA}`, improperB && `${improperB}`].filter(Boolean).join(" and ")}.`,
    );
  }

  let out: Frac;
  let formula: string[];
  if (raw.op === "add" || raw.op === "subtract") {
    const lcd = (a.d / gcd(a.d, b.d)) * b.d;
    const na = a.n * (lcd / a.d);
    const nb = b.n * (lcd / b.d);
    const sign = raw.op === "add" ? 1n : -1n;
    out = { n: na + sign * nb, d: lcd };
    formula = [
      `a/b ${symbol} c/d = (a × (L ÷ b) ${symbol} c × (L ÷ d)) ÷ L`,
      "L is the lowest common denominator (the least common multiple of b and d)",
    ];
    steps.push(`Lowest common denominator of ${a.d} and ${b.d} is ${lcd}.`);
    steps.push(
      `Rewrite both fractions over ${lcd}: ${show(a)} = ${na}/${lcd} and ${show(b)} = ${nb}/${lcd}.`,
    );
    steps.push(
      `${raw.op === "add" ? "Add" : "Subtract"} the numerators: ${na} ${symbol} ${nb < 0n ? `(${nb})` : nb} = ${out.n}, so the result is ${out.n}/${out.d}.`,
    );
  } else if (raw.op === "multiply") {
    out = { n: a.n * b.n, d: a.d * b.d };
    formula = ["a/b × c/d = (a × c) ÷ (b × d)"];
    steps.push(`Multiply the numerators: ${a.n} × ${b.n} = ${out.n}.`);
    steps.push(`Multiply the denominators: ${a.d} × ${b.d} = ${out.d}.`);
  } else {
    // dividing by b is multiplying by its reciprocal; keep the sign on the numerator
    const flip = b.n < 0n ? -1n : 1n;
    const recip: Frac = { n: flip * b.d, d: abs(b.n) };
    out = { n: a.n * recip.n, d: a.d * recip.d };
    formula = ["a/b ÷ c/d = a/b × d/c = (a × d) ÷ (b × c)"];
    steps.push(
      `Dividing by ${show(b)} is multiplying by its reciprocal, ${show(recip)}.`,
    );
    steps.push(
      `Multiply the numerators: ${a.n} × ${recip.n} = ${out.n}, and the denominators: ${a.d} × ${recip.d} = ${out.d}.`,
    );
  }

  const reduced = reduce(out);
  const g = gcd(out.n, out.d);
  steps.push(
    g > 1n
      ? `Simplify by dividing the top and bottom by their greatest common divisor, ${g}: ${show(out)} = ${show(reduced)}.`
      : `${show(out)} cannot be simplified further, because the top and bottom share no common factor other than 1.`,
  );
  if (reduced.d !== 1n && abs(reduced.n) > reduced.d)
    steps.push(`As a mixed number: ${mixedText(reduced)}.`);
  steps.push(`As a decimal: ${show(reduced)} = ${decimalText(reduced)}.`);

  return {
    errors,
    result: {
      fraction:
        reduced.d === 1n
          ? `${reduced.n < 0n ? "−" : ""}${abs(reduced.n)}`
          : `${reduced.n < 0n ? "−" : ""}${abs(reduced.n)}/${reduced.d}`,
      mixed: mixedText(reduced),
      decimal: decimalText(reduced),
      workings: {
        formula,
        steps,
        note: `Calculated: ${first.text} ${symbol} ${second.text}. All the arithmetic is exact, with no rounding until the decimal at the end.`,
      },
    },
  };
}
