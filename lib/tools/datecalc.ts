/** Adding and subtracting years, months, weeks and days to a date. Whole calendar dates only, so time zones cannot move a result. */

import {
  addDays,
  addMonths,
  dayNumber,
  daysBetween,
  formatLong,
  MAX_YEAR,
  MIN_YEAR,
  parseDate,
  weekdayOf,
  type YMD,
} from "./dates";
import { readNumber, type Evaluation } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type DateOp = "add" | "subtract";

export interface DateCalcRaw extends Record<string, string> {
  start: string;
  op: DateOp;
  years: string;
  months: string;
  weeks: string;
  days: string;
}

export interface DateCalcResult {
  date: YMD;
  weekday: string;
  /** Days between the start and the result. */
  daysApart: number;
  workings: Workings;
}

const plural = (n: number, word: string) =>
  `${q(n)} ${word}${n === 1 ? "" : "s"}`;

export function evaluateDateCalc(
  raw: DateCalcRaw,
): Evaluation<DateCalcRaw, DateCalcResult> {
  const errors: Partial<Record<keyof DateCalcRaw, string>> = {};
  const start = raw.start.trim() === "" ? undefined : parseDate(raw.start);
  if (raw.start.trim() !== "" && !start)
    errors.start = `Enter a real date between ${MIN_YEAR} and ${MAX_YEAR}.`;

  const amounts = { years: 0, months: 0, weeks: 0, days: 0 };
  let any = false;
  for (const [key, label, max] of [
    ["years", "Years", 300],
    ["months", "Months", 3600],
    ["weeks", "Weeks", 15_000],
    ["days", "Days", 110_000],
  ] as const) {
    const state = readNumber(raw[key], label, { integer: true, max });
    if ("error" in state) errors[key] = state.error;
    else if ("value" in state) {
      amounts[key] = state.value;
      any = true;
    }
  }
  if (!start || !any || Object.keys(errors).length > 0) return { errors };

  const sign = raw.op === "add" ? 1 : -1;
  const totalMonths = (amounts.years * 12 + amounts.months) * sign;
  const afterMonths = addMonths(start, totalMonths);
  const totalDays = (amounts.weeks * 7 + amounts.days) * sign;
  const date = addDays(afterMonths, totalDays);
  if (date.y < MIN_YEAR || date.y > MAX_YEAR)
    return {
      errors: {
        start: `The result would be outside ${MIN_YEAR} to ${MAX_YEAR}.`,
      },
    };

  const verb = raw.op === "add" ? "Add" : "Subtract";
  const steps = [`Start date: ${formatLong(start)} (a ${weekdayOf(start)})`];
  if (totalMonths !== 0) {
    const clamped = afterMonths.d !== start.d;
    steps.push(
      `${verb} ${plural(amounts.years, "year")} and ${plural(amounts.months, "month")} (${q(Math.abs(totalMonths))} months): ${formatLong(start)} ${raw.op === "add" ? "+" : "−"} ${q(Math.abs(totalMonths))} months = ${formatLong(afterMonths)}${clamped ? `, because ${start.d} ${formatLong(afterMonths).split(" ").slice(1).join(" ")} does not exist, so the last day of that month is used` : ""}`,
    );
  }
  if (totalDays !== 0) {
    steps.push(
      `${verb} ${plural(amounts.weeks, "week")} and ${plural(amounts.days, "day")} (${amounts.weeks} × 7 + ${amounts.days} = ${q(Math.abs(totalDays))} days): ${formatLong(afterMonths)} ${raw.op === "add" ? "+" : "−"} ${q(Math.abs(totalDays))} days = ${formatLong(date)}`,
    );
  }
  steps.push(
    `The result is a ${weekdayOf(date)}, ${q(Math.abs(daysBetween(start, date)))} days ${raw.op === "add" ? "after" : "before"} the start (day numbers ${q(dayNumber(start))} and ${q(dayNumber(date))})`,
  );
  return {
    errors,
    result: {
      date,
      weekday: weekdayOf(date),
      daysApart: Math.abs(daysBetween(start, date)),
      workings: {
        formula: [
          "Result = Start date ± (years and months) ± (weeks × 7 + days)",
          "Years and months are counted first, then days",
        ],
        steps,
        note: "When a month is shorter than the start day (31 January plus 1 month), the last day of that month is used. Leap years are handled: February has 29 days when the year is divisible by 4, except century years not divisible by 400.",
      },
    },
  };
}
