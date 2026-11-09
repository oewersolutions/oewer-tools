"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  COMPOUNDING_CHOICES,
  TIME_UNITS,
  type CompoundingPerYear,
  type TimeUnit,
} from "../../lib/tools/interest";
import { evaluateInterest, type InterestRaw } from "../../lib/tools/planning";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function InterestCalculator() {
  const [raw, setRaw] = useState<InterestRaw>({
    principal: "100000",
    rate: "8",
    time: "10",
    unit: "years",
    compounding: "1",
  });
  const set = <K extends keyof InterestRaw>(key: K, value: InterestRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateInterest(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Principal (₹)"
            value={raw.principal}
            onChange={(v) => set("principal", v)}
            error={errors.principal}
          />
          <NumberField
            label="Interest rate (% per year)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          <NumberField
            label="Time period"
            value={raw.time}
            onChange={(v) => set("time", v)}
            error={errors.time}
          />
          <SelectField
            label="Time unit"
            value={raw.unit}
            onChange={(v: TimeUnit) => set("unit", v)}
            options={(Object.keys(TIME_UNITS) as TimeUnit[]).map((k) => ({
              value: k,
              label: TIME_UNITS[k],
            }))}
          />
          <SelectField
            label="Compound interest is added"
            value={raw.compounding}
            onChange={(v: CompoundingPerYear) => set("compounding", v)}
            options={(
              Object.keys(COMPOUNDING_CHOICES) as CompoundingPerYear[]
            ).map((k) => ({ value: k, label: COMPOUNDING_CHOICES[k] }))}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the principal, the rate and the time to compare simple and compound interest."
          headline={
            result && {
              label: "Compound interest earns this much more",
              value: formatMoney(result.difference),
            }
          }
          rows={
            result && [
              {
                label: "Simple interest",
                value: formatMoney(result.simpleInterest),
              },
              {
                label: "Total with simple interest",
                value: formatMoney(result.simpleTotal),
              },
              {
                label: "Compound interest",
                value: formatMoney(result.compoundInterest),
              },
              {
                label: "Total with compound interest",
                value: formatMoney(result.compoundTotal),
              },
            ]
          }
        />
      }
    />
  );
}
