/**
 * Dates for the due date, pregnancy and conception calculators. Whole calendar dates only, so time zones cannot move a result.
 * Gestational age counts from the first day of the last menstrual period (LMP): about 280 days (40 weeks) to childbirth. Conception is
 * about 14 days after the start of the LMP in a 28-day cycle. Every date here is an estimate and only a small share of babies
 * arrive on the estimated date. This is general information, not medical advice.
 */
import {
  addDays,
  daysBetween,
  formatLong,
  MAX_YEAR,
  MIN_YEAR,
  parseDate,
  weekdayOf,
  type YMD,
} from "./dates";
import { readNumber, type Evaluation } from "./finance";
import type { Workings } from "./workings";

const MEDICAL_NOTE =
  "These dates are estimates. Only a small share of babies arrive on the estimated due date, and a pregnancy normally lasts from 37 to 42 weeks from the first day of the last period. General information, not medical advice: speak to a midwife or doctor about your own pregnancy.";

export const PREGNANCY_DAYS = 280;
/** Days from conception to childbirth: 280 less the 14 days from the start of the last period to conception. */
export const FROM_CONCEPTION_DAYS = 266;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const weeksDays = (days: number): string =>
  `${plural(Math.floor(days / 7), "week")} ${plural(days % 7, "day")}`;

/** The cycle length, defaulting to 28 days when empty. */
function readCycle(raw: string): { value: number } | { error: string } {
  const s = readNumber(raw, "Cycle length", {
    positive: true,
    integer: true,
    max: 60,
  });
  if ("error" in s) return { error: s.error };
  if (!("value" in s)) return { value: 28 };
  return s.value < 20
    ? { error: "Cycle length must be at least 20 days." }
    : { value: s.value };
}

function readDate(
  text: string,
  label: string,
): { date: YMD } | { error: string } | { empty: true } {
  if (text.trim() === "") return { empty: true };
  const d = parseDate(text);
  return d
    ? { date: d }
    : { error: `Enter a real ${label} between ${MIN_YEAR} and ${MAX_YEAR}.` };
}

const fmt = (d: YMD) => `${formatLong(d)} (${weekdayOf(d)})`;

// Due date

export type DueMethod = "lmp" | "conception";
export interface DueRaw extends Record<string, string> {
  method: DueMethod;
  date: string;
  cycle: string;
}
export interface DueResult {
  due: YMD;
  weekday: string;
  /** The first day of the last period this works from, or the one implied by the conception date. */
  start: YMD;
  conception: YMD;
  milestones: { label: string; date: YMD }[];
  workings: Workings;
}

export function milestones(start: YMD): { label: string; date: YMD }[] {
  return [
    {
      label: "Second trimester begins (14 weeks)",
      date: addDays(start, 14 * 7),
    },
    { label: "Halfway (20 weeks)", date: addDays(start, 20 * 7) },
    {
      label: "Third trimester begins (28 weeks)",
      date: addDays(start, 28 * 7),
    },
    {
      label: "Full term range begins (37 weeks)",
      date: addDays(start, 37 * 7),
    },
    { label: "Full term range ends (42 weeks)", date: addDays(start, 42 * 7) },
  ];
}

export function evaluateDue(raw: DueRaw): Evaluation<DueRaw, DueResult> {
  const errors: Partial<Record<string, string>> = {};
  const date = readDate(raw.date, raw.method === "lmp" ? "date" : "date");
  if ("error" in date) errors.date = date.error;
  const cycle = readCycle(raw.method === "lmp" ? raw.cycle : "");
  if ("error" in cycle) errors.cycle = cycle.error;
  if (Object.keys(errors).length > 0 || !("date" in date) || "error" in cycle)
    return { errors };

  let due: YMD;
  let start: YMD;
  let conception: YMD;
  const steps: string[] = [];
  if (raw.method === "lmp") {
    const adjust = cycle.value - 28;
    start = date.date;
    due = addDays(start, PREGNANCY_DAYS + adjust);
    conception = addDays(start, cycle.value - 14);
    steps.push(
      `First day of the last period: ${fmt(start)}`,
      `Due date = ${formatLong(start)} + 280 days${adjust === 0 ? "" : ` ${adjust > 0 ? "+" : "−"} ${Math.abs(adjust)} days for a ${cycle.value}-day cycle`} = ${fmt(due)}`,
      `Estimated conception: about ${cycle.value - 14} days after the period started (ovulation is about 14 days before the next period) = ${fmt(conception)}`,
    );
  } else {
    conception = date.date;
    start = addDays(conception, -14);
    due = addDays(conception, FROM_CONCEPTION_DAYS);
    steps.push(
      `Conception date: ${fmt(conception)}`,
      `Due date = ${formatLong(conception)} + 266 days = ${fmt(due)}`,
      `Counting from the start of the last period (14 days before conception): ${fmt(start)}`,
    );
  }
  return {
    errors,
    result: {
      due,
      weekday: weekdayOf(due),
      start,
      conception,
      milestones: milestones(start),
      workings: {
        formula:
          raw.method === "lmp"
            ? [
                "Due date = First day of last period + 280 days (40 weeks)",
                "For a cycle longer or shorter than 28 days, add or take off the difference",
              ]
            : [
                "Due date = Conception date + 266 days",
                "266 = 280 days less the 14 days from the start of the last period to conception",
              ],
        steps,
        note: MEDICAL_NOTE,
      },
    },
  };
}

// Pregnancy calculator: how far along, today

export type PregnancyMethod = "lmp" | "due";
export interface PregnancyRaw extends Record<string, string> {
  method: PregnancyMethod;
  date: string;
  asOf: string;
  cycle: string;
}
export interface PregnancyResult {
  days: number;
  weeks: number;
  extraDays: number;
  trimester: 1 | 2 | 3 | undefined;
  due: YMD;
  daysToDue: number;
  percent: number;
  milestones: { label: string; date: YMD }[];
  workings: Workings;
}

export function trimesterOf(days: number): 1 | 2 | 3 {
  return days < 14 * 7 ? 1 : days < 28 * 7 ? 2 : 3;
}

export function evaluatePregnancy(
  raw: PregnancyRaw,
): Evaluation<PregnancyRaw, PregnancyResult> {
  const errors: Partial<Record<string, string>> = {};
  const date = readDate(raw.date, "date");
  const asOf = readDate(raw.asOf, "date");
  const cycle = readCycle(raw.method === "lmp" ? raw.cycle : "");
  if ("error" in date) errors.date = date.error;
  if ("error" in asOf) errors.asOf = asOf.error;
  if ("error" in cycle) errors.cycle = cycle.error;
  if (
    Object.keys(errors).length > 0 ||
    !("date" in date) ||
    !("date" in asOf) ||
    "error" in cycle
  )
    return { errors };

  const adjust = raw.method === "lmp" ? cycle.value - 28 : 0;
  const start =
    raw.method === "lmp" ? date.date : addDays(date.date, -PREGNANCY_DAYS);
  const due =
    raw.method === "lmp" ? addDays(start, PREGNANCY_DAYS + adjust) : date.date;
  // A longer or shorter cycle moves the due date, so count the days from the equivalent 28-day start.
  const countFrom = raw.method === "lmp" ? addDays(start, adjust) : start;
  const days = daysBetween(countFrom, asOf.date);
  if (days < 0)
    return {
      errors: {
        asOf: "That date is before the pregnancy started. Choose a later date.",
      },
    };
  if (days > 301)
    return {
      errors: {
        asOf: "That date is more than 43 weeks after the pregnancy started, so check the dates you entered.",
      },
    };
  const weeks = Math.floor(days / 7);
  const daysToDue = daysBetween(asOf.date, due);
  const steps =
    raw.method === "lmp"
      ? [
          `First day of the last period: ${fmt(start)}${adjust === 0 ? "" : `, counted from ${formatLong(countFrom)} for a ${cycle.value}-day cycle`}`,
          `Days so far = ${formatLong(asOf.date)} − ${formatLong(countFrom)} = ${days} days`,
        ]
      : [
          `Due date: ${fmt(due)}, which puts the start of the pregnancy 280 days earlier, on ${fmt(start)}`,
          `Days so far = ${formatLong(asOf.date)} − ${formatLong(start)} = ${days} days`,
        ];
  steps.push(
    `In weeks: ${days} ÷ 7 = ${weeks} weeks and ${days % 7} days`,
    `Trimester ${trimesterOf(days)} (the first runs to 13 weeks 6 days, the second to 27 weeks 6 days)`,
    daysToDue >= 0
      ? `Days to the due date: ${daysToDue}`
      : `${Math.abs(daysToDue)} days past the estimated due date`,
  );
  return {
    errors,
    result: {
      days,
      weeks,
      extraDays: days % 7,
      trimester: trimesterOf(days),
      due,
      daysToDue,
      percent: Math.min(100, (days / PREGNANCY_DAYS) * 100),
      milestones: milestones(countFrom),
      workings: {
        formula: [
          "Days so far = Today − Start of the pregnancy",
          "Weeks = Days ÷ 7, with the remainder as days",
          "Due date = Start + 280 days",
        ],
        steps,
        note: `Trimester boundaries vary between sources: this uses 14 and 28 weeks. ${MEDICAL_NOTE}`,
      },
    },
  };
}

// Conception calculator

export type ConceptionMethod = "lmp" | "due";
export interface ConceptionRaw extends Record<string, string> {
  method: ConceptionMethod;
  date: string;
  cycle: string;
}
export interface ConceptionResult {
  conception: YMD;
  /** The first day of the last period, worked out from the due date, or the one entered. */
  lmp: YMD;
  due: YMD;
  workings: Workings;
}

export function evaluateConception(
  raw: ConceptionRaw,
): Evaluation<ConceptionRaw, ConceptionResult> {
  const errors: Partial<Record<string, string>> = {};
  const date = readDate(raw.date, "date");
  const cycle = readCycle(raw.method === "lmp" ? raw.cycle : "");
  if ("error" in date) errors.date = date.error;
  if ("error" in cycle) errors.cycle = cycle.error;
  if (Object.keys(errors).length > 0 || !("date" in date) || "error" in cycle)
    return { errors };
  if (raw.method === "lmp") {
    const conception = addDays(date.date, cycle.value - 14);
    const due = addDays(date.date, PREGNANCY_DAYS + cycle.value - 28);
    return {
      errors,
      result: {
        conception,
        lmp: date.date,
        due,
        workings: {
          formula: [
            "Conception date ≈ First day of last period + (cycle length − 14) days",
            "Ovulation, and so conception, is about 14 days before the next period would start",
          ],
          steps: [
            `First day of the last period: ${fmt(date.date)}`,
            `Conception ≈ ${formatLong(date.date)} + (${cycle.value} − 14) = ${formatLong(date.date)} + ${cycle.value - 14} days = ${fmt(conception)}`,
            `Due date for comparison = ${formatLong(date.date)} + 280${cycle.value === 28 ? "" : ` ${cycle.value > 28 ? "+" : "−"} ${Math.abs(cycle.value - 28)}`} days = ${fmt(due)}`,
          ],
          note: `Ovulation can vary by several days from cycle to cycle, so conception could have been a few days either side. ${MEDICAL_NOTE}`,
        },
      },
    };
  }
  const conception = addDays(date.date, -FROM_CONCEPTION_DAYS);
  const lmp = addDays(date.date, -PREGNANCY_DAYS);
  return {
    errors,
    result: {
      conception,
      lmp,
      due: date.date,
      workings: {
        formula: [
          "Conception date ≈ Due date − 266 days",
          "First day of the last period ≈ Due date − 280 days",
        ],
        steps: [
          `Due date: ${fmt(date.date)}`,
          `Conception ≈ ${formatLong(date.date)} − 266 days = ${fmt(conception)}`,
          `Start of the last period ≈ ${formatLong(date.date)} − 280 days = ${fmt(lmp)}`,
        ],
        note: `A due date is itself an estimate, so the conception date is too: it could be a week or more either side. ${MEDICAL_NOTE}`,
      },
    },
  };
}
