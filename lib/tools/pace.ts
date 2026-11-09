/** Running pace, distance and time: solve for whichever one is missing. Pure functions, no DOM, so they are unit tested directly. */

import { formatClockShort, formatMinSec, readDuration } from "./duration";
import { readNumber, type Evaluation } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type PaceSolve = "pace" | "time" | "distance";
export type PaceUnit = "km" | "mi";

export const PACE_SOLVE_LABELS: Record<PaceSolve, string> = {
  pace: "Pace",
  time: "Finish time",
  distance: "Distance",
};

/** Metres in one of each unit (the mile is exactly 1,609.344 m). */
export const UNIT_METRES: Record<PaceUnit, number> = { km: 1000, mi: 1609.344 };
export const UNIT_LABELS: Record<PaceUnit, string> = {
  km: "Kilometres",
  mi: "Miles",
};

/** Standard race distances, in metres. */
export const RACES: { label: string; metres: number }[] = [
  { label: "5K", metres: 5000 },
  { label: "10K", metres: 10_000 },
  { label: "Half marathon", metres: 21_097.5 },
  { label: "Marathon", metres: 42_195 },
];

export interface PaceRaw extends Record<string, string> {
  solve: PaceSolve;
  distance: string;
  distanceUnit: PaceUnit;
  hours: string;
  minutes: string;
  seconds: string;
  paceMinutes: string;
  paceSeconds: string;
  paceUnit: PaceUnit;
}

export interface PaceResult {
  solve: PaceSolve;
  metres: number;
  seconds: number;
  /** Seconds to cover one metre. */
  secPerMetre: number;
  races: { label: string; time: string }[];
  workings: Workings;
}

const MAX = 1e6;

export function evaluatePace(raw: PaceRaw): Evaluation<PaceRaw, PaceResult> {
  const errors: Partial<Record<keyof PaceRaw, string>> = {};
  let ready = true;
  const du = UNIT_METRES[raw.distanceUnit];
  const pu = UNIT_METRES[raw.paceUnit];

  let metres = 0;
  if (raw.solve !== "distance") {
    const state = readNumber(raw.distance, "Distance", {
      positive: true,
      max: MAX,
    });
    if ("error" in state) {
      errors.distance = state.error;
      ready = false;
    } else if ("empty" in state) ready = false;
    else metres = state.value * du;
  }

  let seconds = 0;
  if (raw.solve !== "time") {
    const time = readDuration(
      raw,
      { hours: "hours", minutes: "minutes", seconds: "seconds" },
      MAX,
    );
    if ("errors" in time) {
      Object.assign(errors, time.errors);
      ready = false;
    } else if ("empty" in time) ready = false;
    else if (time.seconds <= 0) {
      errors.seconds = "Time must be greater than 0.";
      ready = false;
    } else seconds = time.seconds;
  }

  let secPerMetre = 0;
  if (raw.solve !== "pace") {
    const pace = readDuration(
      raw,
      { minutes: "paceMinutes", seconds: "paceSeconds" },
      MAX,
    );
    if ("errors" in pace) {
      Object.assign(errors, pace.errors);
      ready = false;
    } else if ("empty" in pace) ready = false;
    else if (pace.seconds <= 0) {
      errors.paceSeconds = "Pace must be greater than 0.";
      ready = false;
    } else secPerMetre = pace.seconds / pu;
  }
  if (!ready) return { errors };

  const dUnit = raw.distanceUnit;
  const pUnit = raw.paceUnit;
  const timeTyped = [
    raw.hours && `${q(Number(raw.hours.replace(/[,\s]/g, "")))} h`,
    raw.minutes && `${q(Number(raw.minutes.replace(/[,\s]/g, "")))} min`,
    raw.seconds && `${q(Number(raw.seconds.replace(/[,\s]/g, "")))} s`,
  ]
    .filter(Boolean)
    .join(" ");
  const paceTyped = `${[raw.paceMinutes && `${q(Number(raw.paceMinutes.replace(/[,\s]/g, "")))} min`, raw.paceSeconds && `${q(Number(raw.paceSeconds.replace(/[,\s]/g, "")))} s`].filter(Boolean).join(" ")} per ${pUnit}`;

  let workings: Workings;
  if (raw.solve === "pace") {
    secPerMetre = seconds / metres;
    const perUnit = secPerMetre * pu;
    workings = {
      formula: ["Pace = Time ÷ Distance"],
      steps: [
        `Time in seconds: ${timeTyped} = ${q(seconds)} s`,
        `Distance in ${pUnit}: ${q(metres / du)} ${dUnit}${dUnit === pUnit ? "" : ` × ${q(du / pu)}`} = ${q(metres / pu)} ${pUnit}`,
        `Pace = ${q(seconds)} s ÷ ${q(metres / pu)} ${pUnit} = ${q(perUnit)} s per ${pUnit}`,
        `As minutes and seconds: ${q(perUnit)} s = ${formatMinSec(perUnit)} per ${pUnit}`,
      ],
    };
  } else if (raw.solve === "time") {
    seconds = secPerMetre * metres;
    workings = {
      formula: ["Finish time = Pace × Distance"],
      steps: [
        `Pace in seconds per ${pUnit}: ${paceTyped} = ${q(secPerMetre * pu)} s per ${pUnit}`,
        `Distance in ${pUnit}: ${q(metres / pu)} ${pUnit}`,
        `Finish time = ${q(secPerMetre * pu)} s × ${q(metres / pu)} = ${q(seconds)} s`,
        `As hours, minutes and seconds: ${formatClockShort(seconds)}`,
      ],
    };
  } else {
    metres = seconds / secPerMetre;
    workings = {
      formula: ["Distance = Time ÷ Pace"],
      steps: [
        `Time in seconds: ${timeTyped} = ${q(seconds)} s`,
        `Pace in seconds per ${pUnit}: ${paceTyped} = ${q(secPerMetre * pu)} s per ${pUnit}`,
        `Distance = ${q(seconds)} s ÷ ${q(secPerMetre * pu)} s per ${pUnit} = ${q(metres / pu)} ${pUnit}`,
        ...(dUnit === pUnit
          ? []
          : [
              `In ${dUnit}: ${q(metres / pu)} ${pUnit} × ${q(pu / du)} = ${q(metres / du)} ${dUnit}`,
            ]),
      ],
    };
  }
  workings.note =
    "Average pace for the whole run. The finish times assume the same pace from start to finish, which real races rarely have.";

  return {
    errors,
    result: {
      solve: raw.solve,
      metres,
      seconds,
      secPerMetre,
      races: RACES.map((r) => ({
        label: r.label,
        time: formatClockShort(secPerMetre * r.metres),
      })),
      workings,
    },
  };
}

/** "5:30" per kilometre or per mile. */
export const pacePer = (secPerMetre: number, unit: PaceUnit): string =>
  formatMinSec(secPerMetre * UNIT_METRES[unit]);
/** Speed in km/h or mph. */
export const speedIn = (secPerMetre: number, unit: PaceUnit): number =>
  3600 / (secPerMetre * UNIT_METRES[unit]);
