/** Shared helpers for the calculators that work with lengths of time (pace, time, hours). Pure functions, no DOM. */

import { readNumber } from "./finance";
import { formatQuantity } from "./units";

/** Seconds in one of each part. */
export const SECONDS = {
  days: 86_400,
  hours: 3600,
  minutes: 60,
  seconds: 1,
} as const;
export type Part = keyof typeof SECONDS;

const LABELS: Record<Part, string> = {
  days: "Days",
  hours: "Hours",
  minutes: "Minutes",
  seconds: "Seconds",
};

export type Duration =
  { seconds: number } | { empty: true } | { errors: Record<string, string> };

/**
 * A length of time typed as separate fields. `keys` maps each part to the field's name in `raw`. Empty fields count as zero and
 * all of them empty is "empty". Any part can be a decimal, so 1.5 hours and 90 minutes are the same.
 */
export function readDuration(
  raw: Record<string, string>,
  keys: Partial<Record<Part, string>>,
  max = 1e9,
): Duration {
  const errors: Record<string, string> = {};
  let seconds = 0;
  let any = false;
  for (const part of Object.keys(keys) as Part[]) {
    const key = keys[part]!;
    const state = readNumber(raw[key] ?? "", LABELS[part], { max });
    if ("error" in state) errors[key] = state.error;
    else if ("value" in state) {
      any = true;
      seconds += state.value * SECONDS[part];
    }
  }
  if (Object.keys(errors).length > 0) return { errors };
  return any ? { seconds } : { empty: true };
}

/** "1:25:30" for 5,130 seconds; the hours are not padded. Seconds are rounded to the nearest whole second. */
export function formatClock(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Like formatClock, but "27:30" when there are no hours. */
export function formatClockShort(totalSeconds: number): string {
  const full = formatClock(totalSeconds);
  return full.startsWith("0:") ? full.slice(2) : full;
}

/** "5:30" for 330 seconds. */
export function formatMinSec(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

/** "2 days 3 h 4 min 5 s", leaving out parts that are zero. Seconds keep up to three decimals. */
export function formatSpan(totalSeconds: number): string {
  const total = Math.round(totalSeconds * 1000) / 1000;
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.round((total % 60) * 1000) / 1000;
  const parts = [
    days && `${days.toLocaleString("en-IN")} day${days === 1 ? "" : "s"}`,
    hours && `${hours} h`,
    minutes && `${minutes} min`,
    seconds && `${formatQuantity(seconds)} s`,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 s";
}
