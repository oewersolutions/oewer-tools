"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateSimple, TIME_UNITS, type SimpleRaw, type TimeUnit } from "../../lib/tools/interest";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function SimpleInterestCalculator() {
  const [raw, setRaw] = useState<SimpleRaw>({ principal: "100000", rate: "8", time: "3", unit: "years" });
  const set = <K extends keyof SimpleRaw>(key: K, value: SimpleRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateSimple(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Principal (₹)" value={raw.principal} onChange={(v) => set("principal", v)} error={errors.principal} />
          <NumberField label="Interest rate (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Time period" value={raw.time} onChange={(v) => set("time", v)} error={errors.time} />
          <SelectField
            label="Time unit"
            value={raw.unit}
            onChange={(v: TimeUnit) => set("unit", v)}
            options={(Object.keys(TIME_UNITS) as TimeUnit[]).map((k) => ({ value: k, label: TIME_UNITS[k] }))}
          />
          <p className="text-sm text-muted">Months count as 1/12 of a year and days as 1/365.</p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the principal, the interest rate and the time period to see the interest."
          headline={result && { label: "Simple interest", value: formatMoney(result.interest) }}
          rows={
            result && [
              { label: "Principal", value: formatMoney(result.principal) },
              { label: "Total amount", value: formatMoney(result.amount) },
            ]
          }
        />
      }
    />
  );
}
