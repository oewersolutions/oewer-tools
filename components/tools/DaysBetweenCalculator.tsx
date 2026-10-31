"use client";

import { useState } from "react";
import { describeSpan, evaluateDays, formatLong, type DaysRaw } from "../../lib/tools/dates";
import { DateField, Results, ToolLayout } from "./ui";

const n = (x: number) => x.toLocaleString("en-IN");

export default function DaysBetweenCalculator() {
  const [raw, setRaw] = useState<DaysRaw>({ start: "", end: "" });
  const [includeEnd, setIncludeEnd] = useState(false);
  const set = <K extends keyof DaysRaw>(key: K, value: DaysRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateDays(raw, includeEnd);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <DateField label="Start date" value={raw.start} onChange={(v) => set("start", v)} error={errors.start} />
          <DateField label="End date" value={raw.end} onChange={(v) => set("end", v)} error={errors.end} />
          <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" checked={includeEnd} onChange={(e) => setIncludeEnd(e.target.checked)} className="mt-1" />
            <span>
              Count the end date too
              <span className="block text-xs font-normal text-slate-600">Adds one day. Use it when both the first and the last day count, like a booking from the 1st to the 10th inclusive.</span>
            </span>
          </label>
        </>
      }
      results={
        <Results
          emptyMessage="Choose a start date and an end date to see the number of days between them."
          headline={result && { label: includeEnd ? "Days, including the end date" : "Days between", value: n(result.totalDays) }}
          rows={
            result && [
              ...(result.swapped ? [{ label: "Counted from", value: `${formatLong(result.from)} to ${formatLong(result.to)}` }] : []),
              { label: "Weeks and days", value: `${n(result.weeks)} weeks, ${result.extraDays} day${result.extraDays === 1 ? "" : "s"}` },
              { label: "Years, months and days", value: describeSpan(result.span) },
            ]
          }
        />
      }
    />
  );
}
