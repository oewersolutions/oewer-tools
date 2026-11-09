/** Maths for the random number generator. The random source is passed in, so tests are repeatable and the page uses the browser's secure generator. */
import { readNumber } from "./finance";
import type { Workings } from "./workings";

export type NumberKind = "integer" | "decimal";

export interface RandomRaw extends Record<string, string> {
  min: string;
  max: string;
  count: string;
  kind: NumberKind;
  places: string;
  unique: "yes" | "no";
}

export interface RandomOptions {
  min: number;
  max: number;
  count: number;
  kind: NumberKind;
  places: number;
  unique: boolean;
}

/** Fills the buffer with 32-bit random values, like `crypto.getRandomValues`. */
export type RandomSource = (buffer: Uint32Array) => void;

export const MAX_COUNT = 1000;
const MAX_ABS = 1e9;
const TWO_53 = 2 ** 53;

export function checkRandom(raw: RandomRaw): {
  errors: Partial<Record<string, string>>;
  options?: RandomOptions;
} {
  const errors: Partial<Record<string, string>> = {};
  const integer = raw.kind === "integer";
  const get = (
    key: string,
    label: string,
    rules: Parameters<typeof readNumber>[2],
  ) => {
    const s = readNumber(raw[key] ?? "", label, rules);
    if ("error" in s) errors[key] = s.error;
    return "value" in s ? s.value : undefined;
  };
  // readNumber allows negative values only down to its default minimum of 0, so read the range fields with their own minimum.
  const min = get("min", "Lowest number", {
    min: -MAX_ABS,
    max: MAX_ABS,
    integer,
  });
  const max = get("max", "Highest number", {
    min: -MAX_ABS,
    max: MAX_ABS,
    integer,
  });
  const count = get("count", "How many", {
    positive: true,
    integer: true,
    max: MAX_COUNT,
  });
  const places = integer
    ? 0
    : get("places", "Decimal places", { integer: true, min: 1, max: 6 });
  if (min !== undefined && max !== undefined && min > max)
    errors.max = "The highest number must not be lower than the lowest.";
  if (
    Object.keys(errors).length > 0 ||
    min === undefined ||
    max === undefined ||
    count === undefined ||
    places === undefined
  )
    return { errors };

  const unique = raw.unique === "yes";
  const size = integer
    ? max - min + 1
    : Math.round((max - min) * 10 ** places) + 1;
  if (unique && count > size) {
    errors.count = `There are only ${size.toLocaleString("en-IN")} different values between ${min} and ${max}, so ${count.toLocaleString("en-IN")} different numbers are not possible. Lower “How many”, widen the range, or allow repeats.`;
    return { errors };
  }
  return {
    errors,
    options: { min, max, count, kind: raw.kind, places, unique },
  };
}

/** A fair random whole number from 0 to n − 1 (n up to 2^53). Values that would favour the low numbers are thrown away and drawn again. */
export function randomBelow(n: number, source: RandomSource): number {
  const limit = Math.floor(TWO_53 / n) * n;
  const buffer = new Uint32Array(2);
  for (;;) {
    source(buffer);
    const value = (buffer[0]! & 0x1fffff) * 2 ** 32 + buffer[1]!;
    if (value < limit) return value % n;
  }
}

export interface RandomDraw {
  /** The offsets above the lowest value, in the order drawn. */
  offsets: number[];
  values: number[];
  size: number;
  workings: Workings;
}

export function drawNumbers(
  options: RandomOptions,
  source: RandomSource,
): RandomDraw {
  const scale = 10 ** options.places;
  const low = Math.round(options.min * scale);
  const size = Math.round(options.max * scale) - low + 1;
  const offsets: number[] = [];
  if (!options.unique) {
    for (let i = 0; i < options.count; i++)
      offsets.push(randomBelow(size, source));
  } else if (options.count * 2 > size) {
    // most of the range is wanted, so shuffle the whole range and take the first few
    const all = Array.from({ length: size }, (_, i) => i);
    for (let i = 0; i < options.count; i++) {
      const j = i + randomBelow(size - i, source);
      [all[i], all[j]] = [all[j]!, all[i]!];
      offsets.push(all[i]!);
    }
  } else {
    const seen = new Set<number>();
    while (seen.size < options.count) {
      const x = randomBelow(size, source);
      if (!seen.has(x)) {
        seen.add(x);
        offsets.push(x);
      }
    }
  }
  const values = offsets.map((o) => (low + o) / scale);
  const text = (n: number) =>
    options.kind === "decimal" ? n.toFixed(options.places) : String(n);
  const lowText = text(options.min);
  const highText = text(options.max);
  const shown = offsets.slice(0, 3);
  const decimal = options.kind === "decimal";
  return {
    offsets,
    values,
    size,
    workings: {
      formula: [
        decimal
          ? `number = (lowest × ${scale} + random whole number from 0 to ${(size - 1).toLocaleString("en-IN")}) ÷ ${scale}`
          : "number = lowest + random whole number from 0 to (highest − lowest)",
      ],
      steps: [
        `The range ${lowText} to ${highText} holds ${size.toLocaleString("en-IN")} possible values${decimal ? ` (steps of ${(1 / scale).toFixed(options.places)})` : ""}, each equally likely.`,
        "Each draw asks your browser's secure random number generator for 53 random bits. A draw that would make some values slightly more likely than others is thrown away and drawn again, so every value has exactly the same chance.",
        `The remainder after dividing the draw by ${size.toLocaleString("en-IN")} is the offset from the lowest value: ${shown.map((o, i) => `draw ${i + 1} gave offset ${o.toLocaleString("en-IN")}`).join(", ")}.`,
        ...shown.map(
          (o, i) =>
            `Number ${i + 1} = ${decimal ? `(${Math.round(options.min * scale)} + ${o}) ÷ ${scale}` : `${options.min} + ${o}`} = ${text(values[i]!)}.`,
        ),
        options.unique
          ? "Numbers already picked are skipped, so none repeats."
          : "Each draw is independent, so the same number can come up more than once.",
      ],
      note: "Nothing is sent anywhere: the numbers are made on this page. The generator suits games, raffles and sampling. It is not meant for passwords; use the password generator for those.",
    },
  };
}
