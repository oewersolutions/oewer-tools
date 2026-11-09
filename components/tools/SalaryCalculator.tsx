"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateSalary,
  PAY_PERIODS,
  type PayPeriod,
  type SalaryRaw,
} from "../../lib/tools/pay";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function SalaryCalculator() {
  const [raw, setRaw] = useState<SalaryRaw>({
    amount: "600000",
    period: "annual",
    hoursPerWeek: "40",
    daysPerWeek: "5",
    weeksPerYear: "52",
  });
  const set = <K extends keyof SalaryRaw>(key: K, value: SalaryRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateSalary(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Pay (₹)"
            value={raw.amount}
            onChange={(v) => set("amount", v)}
            error={errors.amount}
          />
          <SelectField
            label="Pay is"
            value={raw.period}
            onChange={(v: PayPeriod) => set("period", v)}
            options={(Object.keys(PAY_PERIODS) as PayPeriod[]).map((k) => ({
              value: k,
              label: PAY_PERIODS[k],
            }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Hours a week"
              value={raw.hoursPerWeek}
              onChange={(v) => set("hoursPerWeek", v)}
              error={errors.hoursPerWeek}
            />
            <NumberField
              label="Days a week"
              value={raw.daysPerWeek}
              onChange={(v) => set("daysPerWeek", v)}
              error={errors.daysPerWeek}
            />
            <NumberField
              label="Weeks a year"
              value={raw.weeksPerYear}
              onChange={(v) => set("weeksPerYear", v)}
              error={errors.weeksPerYear}
            />
          </div>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the pay and how many hours, days and weeks you work to see it per year, month, week, day and hour."
          headline={
            result && { label: "Per year", value: formatMoney(result.annual) }
          }
          rows={
            result && [
              { label: "Per month", value: formatMoney(result.monthly) },
              { label: "Per week", value: formatMoney(result.weekly) },
              { label: "Per day", value: formatMoney(result.daily) },
              { label: "Per hour", value: formatMoney(result.hourly) },
            ]
          }
        />
      }
    />
  );
}
