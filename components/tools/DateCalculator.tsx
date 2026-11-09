"use client";

import { useState } from "react";
import {
  evaluateDateCalc,
  type DateCalcRaw,
  type DateOp,
} from "../../lib/tools/datecalc";
import { formatLong } from "../../lib/tools/dates";
import { DateField, NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function DateCalculator() {
  const [raw, setRaw] = useState<DateCalcRaw>({
    start: "",
    op: "add",
    years: "",
    months: "1",
    weeks: "",
    days: "15",
  });
  const set = <K extends keyof DateCalcRaw>(key: K, value: DateCalcRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateDateCalc(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <DateField
            label="Start date"
            value={raw.start}
            onChange={(v) => set("start", v)}
            error={errors.start}
          />
          <SelectField
            label="Operation"
            value={raw.op}
            onChange={(v: DateOp) => set("op", v)}
            options={[
              { value: "add", label: "Add to the date" },
              { value: "subtract", label: "Subtract from the date" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Years"
              value={raw.years}
              onChange={(v) => set("years", v)}
              error={errors.years}
            />
            <NumberField
              label="Months"
              value={raw.months}
              onChange={(v) => set("months", v)}
              error={errors.months}
            />
            <NumberField
              label="Weeks"
              value={raw.weeks}
              onChange={(v) => set("weeks", v)}
              error={errors.weeks}
            />
            <NumberField
              label="Days"
              value={raw.days}
              onChange={(v) => set("days", v)}
              error={errors.days}
            />
          </div>
        </>
      }
      results={
        <Results
          emptyMessage="Choose a start date and enter how much to add or subtract."
          headline={
            result && { label: "Result", value: formatLong(result.date) }
          }
          rows={
            result && [
              { label: "Day of the week", value: result.weekday },
              {
                label: "Days from the start date",
                value: result.daysApart.toLocaleString("en-IN"),
              },
            ]
          }
        />
      }
    />
  );
}
