/** Maths for the standard deviation calculator. Pure functions, no DOM. */
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type DeviationKind = "sample" | "population";

export interface StatsRaw extends Record<string, string> {
  values: string;
  kind: DeviationKind;
}

export interface StatsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  sumSquares: number;
  variance: number;
  deviation: number;
  /** The same figure for the other kind, when it exists. */
  otherDeviation?: number;
  workings: Workings;
}

export const MAX_VALUES = 5000;
const MAX_MAGNITUDE = 1e12;

/** Splits what a visitor pasted (commas, spaces, semicolons, new lines) into numbers. */
export function parseNumbers(text: string): {
  numbers: number[];
  error?: string;
} {
  const tokens = text.split(/[\s,;]+/).filter((t) => t !== "");
  const numbers: number[] = [];
  for (const token of tokens) {
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(token))
      return {
        numbers: [],
        error: `“${token.slice(0, 20)}” is not a number. Separate the numbers with commas, spaces or new lines.`,
      };
    const value = Number(token);
    if (!Number.isFinite(value) || Math.abs(value) > MAX_MAGNITUDE)
      return {
        numbers: [],
        error: `“${token.slice(0, 20)}” is too large. Use numbers up to 1,000,000,000,000.`,
      };
    numbers.push(value);
    if (numbers.length > MAX_VALUES)
      return {
        numbers: [],
        error: `That is more than ${MAX_VALUES.toLocaleString("en-IN")} numbers. Please use fewer.`,
      };
  }
  return { numbers };
}

/** A tidy decimal for a working step: 10 significant digits, so that 0.1 + 0.2 reads 0.3. */
const t = (n: number) => q(Number(n.toPrecision(10)));

export function evaluateStats(raw: StatsRaw): {
  errors: Partial<Record<string, string>>;
  result?: StatsResult;
} {
  const parsed = parseNumbers(raw.values);
  if (parsed.error) return { errors: { values: parsed.error } };
  const xs = parsed.numbers;
  if (xs.length === 0) return { errors: {} };
  const n = xs.length;
  const sample = raw.kind === "sample";
  if (sample && n < 2)
    return {
      errors: {
        values:
          "A sample needs at least two numbers. Add another number, or switch to population.",
      },
    };

  const sum = xs.reduce((s, x) => s + x, 0);
  const mean = sum / n;
  const sumSquares = xs.reduce((s, x) => s + (x - mean) ** 2, 0);
  const divisor = sample ? n - 1 : n;
  const variance = sumSquares / divisor;
  const deviation = Math.sqrt(variance);
  const sorted = [...xs].sort((a, b) => a - b);
  const median =
    n % 2 === 1
      ? sorted[(n - 1) / 2]!
      : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  const otherDeviation = sample
    ? Math.sqrt(sumSquares / n)
    : n >= 2
      ? Math.sqrt(sumSquares / (n - 1))
      : undefined;

  const shown = xs.slice(0, 6);
  const terms = shown.map(
    (x) => `(${t(x)} − ${t(mean)})² = ${t((x - mean) ** 2)}`,
  );
  const steps = [
    `Count the numbers: n = ${n}.`,
    `Add them up: sum = ${t(sum)}.`,
    `Find the mean: ${t(sum)} ÷ ${n} = ${t(mean)}.`,
    `Take each number's distance from the mean and square it: ${terms.join("; ")}${n > shown.length ? `; and ${n - shown.length} more` : ""}.`,
    `Add the squares: Σ(x − mean)² = ${t(sumSquares)}.`,
    sample
      ? `Divide by n − 1 = ${n - 1} because this is a sample: variance = ${t(sumSquares)} ÷ ${n - 1} = ${t(variance)}.`
      : `Divide by n = ${n} because these are the whole population: variance = ${t(sumSquares)} ÷ ${n} = ${t(variance)}.`,
    `Take the square root: standard deviation = √${t(variance)} = ${t(deviation)}.`,
  ];

  return {
    errors: {},
    result: {
      count: n,
      sum,
      mean,
      median,
      min: sorted[0]!,
      max: sorted[n - 1]!,
      sumSquares,
      variance,
      deviation,
      otherDeviation,
      workings: {
        formula: [
          sample
            ? "s = √( Σ(x − mean)² ÷ (n − 1) )"
            : "σ = √( Σ(x − mean)² ÷ n )",
          "mean = Σx ÷ n",
        ],
        steps,
        note: sample
          ? "Use the sample figure when your numbers are a sample taken from a larger group. Dividing by n − 1 corrects for the sample sitting closer to its own mean than to the true mean."
          : "Use the population figure when your numbers are the whole group you care about, not a sample from it.",
      },
    },
  };
}
