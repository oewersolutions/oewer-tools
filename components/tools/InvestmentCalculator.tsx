"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateInvestment,
  type InvestmentRaw,
} from "../../lib/tools/planning";
import { DataTable, NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function InvestmentCalculator() {
  const [raw, setRaw] = useState<InvestmentRaw>({
    start: "100000",
    monthly: "5000",
    rate: "12",
    years: "10",
    timing: "end",
  });
  const set = <K extends keyof InvestmentRaw>(
    key: K,
    value: InvestmentRaw[K],
  ) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateInvestment(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Starting amount (₹)"
            value={raw.start}
            onChange={(v) => set("start", v)}
            error={errors.start}
          />
          <NumberField
            label="Monthly addition (₹)"
            value={raw.monthly}
            onChange={(v) => set("monthly", v)}
            error={errors.monthly}
          />
          <NumberField
            label="Expected return (% per year)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          <NumberField
            label="Time period (years)"
            value={raw.years}
            onChange={(v) => set("years", v)}
            error={errors.years}
          />
          <SelectField
            label="Monthly additions are made"
            value={raw.timing}
            onChange={(v: "end" | "start") => set("timing", v)}
            options={[
              { value: "end", label: "At the end of each month" },
              { value: "start", label: "At the start of each month" },
            ]}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter a starting amount or a monthly addition, a return and a time period to see the estimated balance."
            headline={
              result && {
                label: "Estimated balance",
                value: formatMoney(result.balance),
              }
            }
            rows={
              result && [
                { label: "Money put in", value: formatMoney(result.invested) },
                {
                  label: "Estimated returns",
                  value: formatMoney(result.returns),
                },
              ]
            }
          />
          {result && (
            <DataTable
              caption="Money put in and the estimated balance at the end of each year"
              label="Year by year"
              columns={["Year", "Put in", "Balance"]}
              rows={result.rows.map((r) => [
                r.year,
                formatMoney(r.invested),
                formatMoney(r.balance),
              ])}
            />
          )}
        </>
      }
    />
  );
}
