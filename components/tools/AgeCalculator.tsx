"use client";

import { useEffect, useState } from "react";
import { describeSpan, evaluateAge, formatLong, todayIso, weekdayOf, type AgeRaw } from "../../lib/tools/dates";
import { DateField, Results, ToolLayout } from "./ui";

const n = (x: number) => x.toLocaleString("en-IN");

export default function AgeCalculator() {
  const [raw, setRaw] = useState<AgeRaw>({ born: "", asOf: "" });
  // Today is filled in after the page loads, so the static page is the same for everyone and the date is the visitor's own.
  useEffect(() => setRaw((r) => (r.asOf ? r : { ...r, asOf: todayIso() })), []);
  const set = <K extends keyof AgeRaw>(key: K, value: AgeRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateAge(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <DateField label="Date of birth" value={raw.born} onChange={(v) => set("born", v)} error={errors.born} />
          <DateField label="Age on" value={raw.asOf} onChange={(v) => set("asOf", v)} error={errors.asOf} hint="Today, unless you change it." />
          <p className="text-sm text-muted">If you were born on 29 February, your birthday is counted as 28 February in years that are not leap years.</p>
        </>
      }
      results={
        <Results
          emptyMessage="Choose a date of birth to see the age in years, months and days."
          headline={result && { label: "Age", value: describeSpan(result.span) }}
          rows={
            result && [
              { label: "Total months", value: n(result.totalMonths) },
              { label: "Total weeks", value: n(result.totalWeeks) },
              { label: "Total days", value: n(result.totalDays) },
              { label: "Born on a", value: result.bornOn },
              { label: `Turns ${result.turning} on`, value: `${formatLong(result.nextBirthday)} (${weekdayOf(result.nextBirthday)})` },
              { label: "Days to the next birthday", value: result.daysToBirthday === 0 ? "Today" : n(result.daysToBirthday) },
            ]
          }
        />
      }
    />
  );
}
