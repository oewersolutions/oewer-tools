"use client";

import { useState } from "react";
import { formatClock } from "../../lib/tools/duration";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateHours, type HoursRaw } from "../../lib/tools/hours";
import { formatQuantity } from "../../lib/tools/units";
import { NumberField, Results, TimeField, ToolLayout } from "./ui";

export default function HoursCalculator() {
  const [raw, setRaw] = useState<HoursRaw>({
    start: "09:00",
    end: "17:30",
    breakMinutes: "30",
    days: "5",
    rate: "",
  });
  const set = <K extends keyof HoursRaw>(key: K, value: HoursRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateHours(raw);
  const hm = (seconds: number) => formatClock(seconds).replace(/:\d\d$/, "");

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <TimeField
            label="Start time"
            value={raw.start}
            onChange={(v) => set("start", v)}
            error={errors.start}
          />
          <TimeField
            label="End time"
            value={raw.end}
            onChange={(v) => set("end", v)}
            error={errors.end}
          />
          <NumberField
            label="Break (minutes)"
            value={raw.breakMinutes}
            onChange={(v) => set("breakMinutes", v)}
            error={errors.breakMinutes}
          />
          <NumberField
            label="Days worked"
            value={raw.days}
            onChange={(v) => set("days", v)}
            error={errors.days}
          />
          <NumberField
            label="Hourly rate (optional)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
            hint="Leave empty to see hours only."
          />
        </>
      }
      results={
        <Results
          emptyMessage="Choose a start and an end time to see the hours worked."
          headline={
            result && {
              label: "Hours worked each day",
              value: hm(result.perDaySeconds),
            }
          }
          rows={
            result && [
              {
                label: "As decimal hours",
                value: formatQuantity(result.perDaySeconds / 3600),
              },
              {
                label: "Total hours",
                value: `${hm(result.totalSeconds)} (${formatQuantity(result.totalHours)})`,
              },
              ...(result.pay === undefined
                ? []
                : [{ label: "Total pay", value: formatMoney(result.pay) }]),
              ...(result.overnight
                ? [{ label: "Shift", value: "Ends after midnight" }]
                : []),
            ]
          }
        />
      }
    />
  );
}
