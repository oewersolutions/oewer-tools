/** Hours worked between a start and an end time, less a break, with optional pay. Pure functions, no DOM. */

import { formatClock } from "./duration";
import {
  MAX_AMOUNT,
  readNumber,
  formatMoney,
  type Evaluation,
} from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export interface HoursRaw extends Record<string, string> {
  start: string;
  end: string;
  breakMinutes: string;
  days: string;
  rate: string;
}

export interface HoursResult {
  perDaySeconds: number;
  totalSeconds: number;
  /** Decimal hours for the whole period, which is what a pay sum needs. */
  totalHours: number;
  pay?: number;
  overnight: boolean;
  workings: Workings;
}

/** "09:30" to minutes after midnight, or undefined. */
export function parseClock(text: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return undefined;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : undefined;
}

const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function evaluateHours(
  raw: HoursRaw,
): Evaluation<HoursRaw, HoursResult> {
  const errors: Partial<Record<keyof HoursRaw, string>> = {};
  const start = raw.start.trim() === "" ? undefined : parseClock(raw.start);
  const end = raw.end.trim() === "" ? undefined : parseClock(raw.end);
  if (raw.start.trim() !== "" && start === undefined)
    errors.start = "Enter a time like 09:30.";
  if (raw.end.trim() !== "" && end === undefined)
    errors.end = "Enter a time like 17:45.";

  const brk = readNumber(raw.breakMinutes, "Break", { max: 1440 });
  if ("error" in brk) errors.breakMinutes = brk.error;
  const days = readNumber(raw.days, "Days worked", {
    positive: true,
    integer: true,
    max: 3660,
  });
  if ("error" in days) errors.days = days.error;
  const rate = readNumber(raw.rate, "Hourly rate", { max: MAX_AMOUNT });
  if ("error" in rate) errors.rate = rate.error;
  if (
    start === undefined ||
    end === undefined ||
    Object.keys(errors).length > 0
  )
    return { errors };
  if (start === end)
    return {
      errors: {
        end: "The end time is the same as the start time. Choose a different one.",
      },
    };

  const overnight = end < start;
  const spanMinutes = overnight ? end + 1440 - start : end - start;
  const breakMinutes = "value" in brk ? brk.value : 0;
  const workedMinutes = spanMinutes - breakMinutes;
  if (workedMinutes <= 0)
    return {
      errors: { breakMinutes: "The break is as long as the whole shift." },
    };
  const numberOfDays = "value" in days ? days.value : 1;
  const perDaySeconds = workedMinutes * 60;
  const totalSeconds = perDaySeconds * numberOfDays;
  const totalHours = totalSeconds / 3600;
  const hourly = "value" in rate ? rate.value : undefined;
  const pay = hourly === undefined ? undefined : totalHours * hourly;

  const steps = [
    `Time from ${clock(start)} to ${clock(end)}${overnight ? " (the end is after midnight, so 24 hours are added to it)" : ""}: ${overnight ? `(${end} + 1,440) − ${start}` : `${end} − ${start}`} = ${q(spanMinutes)} minutes`,
    `Less the break: ${q(spanMinutes)} − ${q(breakMinutes)} = ${q(workedMinutes)} minutes = ${formatClock(perDaySeconds).replace(/:\d\d$/, "")} (${q(workedMinutes / 60)} hours)`,
  ];
  if (numberOfDays > 1)
    steps.push(
      `For ${numberOfDays} days: ${q(workedMinutes / 60)} × ${numberOfDays} = ${q(totalHours)} hours`,
    );
  if (pay !== undefined && hourly !== undefined)
    steps.push(
      `Pay = ${q(totalHours)} hours × ${formatMoney(hourly)} = ${formatMoney(pay)}`,
    );
  return {
    errors,
    result: {
      perDaySeconds,
      totalSeconds,
      totalHours,
      ...(pay === undefined ? {} : { pay }),
      overnight,
      workings: {
        formula: [
          "Hours worked = End time − Start time − Break",
          "Decimal hours = Minutes ÷ 60",
          ...(pay === undefined ? [] : ["Pay = Hours worked × Hourly rate"]),
        ],
        steps,
        note: "Times are on a 24-hour clock. This counts clock time only and does not include overtime rules, rounding rules or any deductions.",
      },
    },
  };
}
