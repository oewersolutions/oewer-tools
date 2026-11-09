/** Adding and subtracting lengths of time in days, hours, minutes and seconds. Pure functions, no DOM. */

import { formatSpan, readDuration, SECONDS } from "./duration";
import type { Evaluation } from "./finance";
import { formatQuantity as q } from "./units";
import type { Workings } from "./workings";

export type TimeOp = "add" | "subtract";

export interface TimeRaw extends Record<string, string> {
  op: TimeOp;
  aDays: string;
  aHours: string;
  aMinutes: string;
  aSeconds: string;
  bDays: string;
  bHours: string;
  bMinutes: string;
  bSeconds: string;
}

export interface TimeResult {
  /** Negative when a longer time is taken from a shorter one. */
  seconds: number;
  negative: boolean;
  workings: Workings;
}

const MAX = 1e7;

const typed = (raw: TimeRaw, side: "a" | "b"): string => {
  const parts: [string, string][] = [
    [raw[`${side}Days`], "d"],
    [raw[`${side}Hours`], "h"],
    [raw[`${side}Minutes`], "min"],
    [raw[`${side}Seconds`], "s"],
  ];
  return (
    parts
      .filter(([v]) => v.trim() !== "")
      .map(([v, u]) => `${q(Number(v.replace(/[,\s]/g, "")))} ${u}`)
      .join(" ") || "0 s"
  );
};

export function evaluateTime(raw: TimeRaw): Evaluation<TimeRaw, TimeResult> {
  const errors: Partial<Record<keyof TimeRaw, string>> = {};
  const read = (side: "a" | "b") =>
    readDuration(
      raw,
      {
        days: `${side}Days`,
        hours: `${side}Hours`,
        minutes: `${side}Minutes`,
        seconds: `${side}Seconds`,
      },
      MAX,
    );
  const a = read("a");
  const b = read("b");
  if ("errors" in a) Object.assign(errors, a.errors);
  if ("errors" in b) Object.assign(errors, b.errors);
  if ("errors" in a || "errors" in b) return { errors };
  if ("empty" in a || "empty" in b) return { errors };

  const signed =
    raw.op === "add" ? a.seconds + b.seconds : a.seconds - b.seconds;
  const seconds = Math.abs(signed);
  const sign = raw.op === "add" ? "+" : "−";
  return {
    errors,
    result: {
      seconds,
      negative: signed < 0,
      workings: {
        formula: [
          raw.op === "add"
            ? "Total = First time + Second time"
            : "Difference = First time − Second time",
          `1 day = ${SECONDS.days.toLocaleString("en-IN")} s, 1 hour = ${SECONDS.hours} s, 1 minute = ${SECONDS.minutes} s`,
        ],
        steps: [
          `First time in seconds: ${typed(raw, "a")} = ${q(a.seconds)} s`,
          `Second time in seconds: ${typed(raw, "b")} = ${q(b.seconds)} s`,
          `${raw.op === "add" ? "Total" : "Difference"} = ${q(a.seconds)} ${sign} ${q(b.seconds)} = ${q(signed)} s`,
          `Back to days, hours, minutes and seconds: ${signed < 0 ? "−" : ""}${formatSpan(seconds)}`,
        ],
        note:
          signed < 0
            ? "The second time is longer than the first, so the result is negative: it is that much time short."
            : undefined,
      },
    },
  };
}
