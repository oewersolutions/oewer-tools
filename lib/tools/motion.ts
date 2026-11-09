/** Speed, distance and time: solve for whichever one is missing. Pure functions, no DOM, so they are unit tested directly. */

import { readNumber, type Evaluation } from "./finance";
import { formatQuantity } from "./units";

export type Solve = "speed" | "distance" | "time";
export type DistanceUnit = "km" | "m" | "mi";
export type SpeedUnit = "kmh" | "ms" | "mph" | "kn";

/** Metres in one of each unit. */
export const DISTANCE_UNITS: Record<DistanceUnit, { label: string; symbol: string; metres: number }> = {
  km: { label: "Kilometres", symbol: "km", metres: 1000 },
  m: { label: "Metres", symbol: "m", metres: 1 },
  mi: { label: "Miles", symbol: "mi", metres: 1609.344 },
};

/** Metres per second in one of each unit (a knot is one nautical mile, 1,852 m, per hour). */
export const SPEED_UNITS: Record<SpeedUnit, { label: string; symbol: string; mps: number }> = {
  kmh: { label: "Kilometres per hour", symbol: "km/h", mps: 1000 / 3600 },
  ms: { label: "Metres per second", symbol: "m/s", mps: 1 },
  mph: { label: "Miles per hour", symbol: "mph", mps: 1609.344 / 3600 },
  kn: { label: "Knots", symbol: "kn", mps: 1852 / 3600 },
};

export const SOLVE_LABELS: Record<Solve, string> = { speed: "Speed", distance: "Distance", time: "Time" };

export interface MotionRaw extends Record<string, string> {
  solve: Solve;
  distance: string;
  distanceUnit: DistanceUnit;
  speed: string;
  speedUnit: SpeedUnit;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface Workings {
  formula: string[];
  steps: string[];
  note?: string;
}

export interface MotionResult {
  solve: Solve;
  metres: number;
  seconds: number;
  /** Metres per second. */
  mps: number;
  workings: Workings;
}

const MAX = 1e9;

/** Seconds as "2 h 30 min 15 s", leaving out the parts that are zero. */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${formatQuantity(totalSeconds)} s`;
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return [h ? `${h.toLocaleString("en-IN")} h` : "", m ? `${m} min` : "", s ? `${s} s` : ""].filter(Boolean).join(" ");
}

const speedIn = (mps: number, unit: SpeedUnit) => mps / SPEED_UNITS[unit].mps;
const distanceIn = (metres: number, unit: DistanceUnit) => metres / DISTANCE_UNITS[unit].metres;

/** The time the visitor typed, in seconds, or the field that is wrong. Empty fields count as zero; all three empty is "empty". */
function readTime(raw: MotionRaw): { seconds: number } | { empty: true } | { errors: Partial<Record<keyof MotionRaw, string>> } {
  const parts = [
    ["hours", "Hours", 3600],
    ["minutes", "Minutes", 60],
    ["seconds", "Seconds", 1],
  ] as const;
  const errors: Partial<Record<keyof MotionRaw, string>> = {};
  let seconds = 0;
  let any = false;
  for (const [key, label, scale] of parts) {
    const state = readNumber(raw[key], label, { max: MAX });
    if ("error" in state) errors[key] = state.error;
    else if ("value" in state) {
      any = true;
      seconds += state.value * scale;
    }
  }
  if (Object.keys(errors).length > 0) return { errors };
  return any ? { seconds } : { empty: true };
}

export function evaluateMotion(raw: MotionRaw): Evaluation<MotionRaw, MotionResult> {
  const errors: Partial<Record<keyof MotionRaw, string>> = {};
  let ready = true;

  let metres = 0;
  if (raw.solve !== "distance") {
    const state = readNumber(raw.distance, "Distance", { positive: true, max: MAX });
    if ("error" in state) {
      errors.distance = state.error;
      ready = false;
    } else if ("empty" in state) ready = false;
    else metres = state.value * DISTANCE_UNITS[raw.distanceUnit].metres;
  }
  let mps = 0;
  if (raw.solve !== "speed") {
    const state = readNumber(raw.speed, "Speed", { positive: true, max: MAX });
    if ("error" in state) {
      errors.speed = state.error;
      ready = false;
    } else if ("empty" in state) ready = false;
    else mps = state.value * SPEED_UNITS[raw.speedUnit].mps;
  }
  let seconds = 0;
  if (raw.solve !== "time") {
    const time = readTime(raw);
    if ("errors" in time) {
      Object.assign(errors, time.errors);
      ready = false;
    } else if ("empty" in time) {
      ready = false;
    } else if (time.seconds <= 0) {
      errors.seconds = "Time must be greater than 0.";
      ready = false;
    } else {
      seconds = time.seconds;
    }
  }
  if (!ready) return { errors };

  const d = DISTANCE_UNITS[raw.distanceUnit];
  const s = SPEED_UNITS[raw.speedUnit];
  const q = formatQuantity;
  const typedTime = [raw.hours && `${q(Number(raw.hours.replace(/[,\s]/g, "")))} h`, raw.minutes && `${q(Number(raw.minutes.replace(/[,\s]/g, "")))} min`, raw.seconds && `${q(Number(raw.seconds.replace(/[,\s]/g, "")))} s`].filter(Boolean).join(" ");
  const distanceTyped = `${q(metres / d.metres)} ${d.symbol}`;
  const speedTyped = `${q(mps / s.mps)} ${s.symbol}`;

  if (raw.solve === "speed") {
    mps = metres / seconds;
    return {
      errors,
      result: {
        solve: "speed",
        metres,
        seconds,
        mps,
        workings: {
          formula: ["Speed = Distance ÷ Time"],
          steps: [
            `Distance in metres: ${distanceTyped} = ${q(metres)} m${raw.distanceUnit === "m" ? "" : ` (1 ${d.symbol} = ${q(d.metres)} m)`}`,
            `Time in seconds: ${typedTime} = ${q(seconds)} s`,
            `Speed = ${q(metres)} m ÷ ${q(seconds)} s = ${q(mps)} m/s`,
            `In ${s.symbol}: ${q(mps)} m/s ÷ ${q(s.mps)} = ${q(speedIn(mps, raw.speedUnit))} ${s.symbol} (1 ${s.symbol} = ${q(s.mps)} m/s)`,
          ],
        },
      },
    };
  }
  if (raw.solve === "distance") {
    metres = mps * seconds;
    return {
      errors,
      result: {
        solve: "distance",
        metres,
        seconds,
        mps,
        workings: {
          formula: ["Distance = Speed × Time"],
          steps: [
            `Speed in metres per second: ${speedTyped} = ${q(mps)} m/s (1 ${s.symbol} = ${q(s.mps)} m/s)`,
            `Time in seconds: ${typedTime} = ${q(seconds)} s`,
            `Distance = ${q(mps)} m/s × ${q(seconds)} s = ${q(metres)} m`,
            `In ${d.symbol}: ${q(metres)} m ÷ ${q(d.metres)} = ${q(distanceIn(metres, raw.distanceUnit))} ${d.symbol}`,
          ],
        },
      },
    };
  }
  seconds = metres / mps;
  return {
    errors,
    result: {
      solve: "time",
      metres,
      seconds,
      mps,
      workings: {
        formula: ["Time = Distance ÷ Speed"],
        steps: [
          `Distance in metres: ${distanceTyped} = ${q(metres)} m${raw.distanceUnit === "m" ? "" : ` (1 ${d.symbol} = ${q(d.metres)} m)`}`,
          `Speed in metres per second: ${speedTyped} = ${q(mps)} m/s (1 ${s.symbol} = ${q(s.mps)} m/s)`,
          `Time = ${q(metres)} m ÷ ${q(mps)} m/s = ${q(seconds)} s`,
          `As hours, minutes and seconds: ${formatDuration(seconds)}`,
        ],
        note: "Average speed only: the formula assumes the speed stays the same for the whole trip.",
      },
    },
  };
}
