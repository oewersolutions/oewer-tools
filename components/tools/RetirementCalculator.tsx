"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateRetirement,
  type RetirementRaw,
} from "../../lib/tools/planning";
import { NumberField, Results, ToolLayout } from "./ui";

export default function RetirementCalculator() {
  const [raw, setRaw] = useState<RetirementRaw>({
    age: "30",
    retireAge: "60",
    lifeAge: "85",
    savings: "500000",
    monthly: "20000",
    expense: "40000",
    returnBefore: "10",
    returnAfter: "7",
    inflation: "6",
  });
  const set = <K extends keyof RetirementRaw>(
    key: K,
    value: RetirementRaw[K],
  ) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateRetirement(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Your age"
              value={raw.age}
              onChange={(v) => set("age", v)}
              error={errors.age}
            />
            <NumberField
              label="Retire at"
              value={raw.retireAge}
              onChange={(v) => set("retireAge", v)}
              error={errors.retireAge}
            />
            <NumberField
              label="Plan to age"
              value={raw.lifeAge}
              onChange={(v) => set("lifeAge", v)}
              error={errors.lifeAge}
            />
          </div>
          <NumberField
            label="Current savings (₹)"
            value={raw.savings}
            onChange={(v) => set("savings", v)}
            error={errors.savings}
          />
          <NumberField
            label="Monthly saving (₹)"
            value={raw.monthly}
            onChange={(v) => set("monthly", v)}
            error={errors.monthly}
          />
          <NumberField
            label="Monthly expenses after retiring, in today's money (₹)"
            value={raw.expense}
            onChange={(v) => set("expense", v)}
            error={errors.expense}
          />
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="Return before (%)"
              value={raw.returnBefore}
              onChange={(v) => set("returnBefore", v)}
              error={errors.returnBefore}
            />
            <NumberField
              label="Return after (%)"
              value={raw.returnAfter}
              onChange={(v) => set("returnAfter", v)}
              error={errors.returnAfter}
            />
            <NumberField
              label="Inflation (%)"
              value={raw.inflation}
              onChange={(v) => set("inflation", v)}
              error={errors.inflation}
            />
          </div>
        </>
      }
      results={
        <Results
          emptyMessage="Fill in your ages, savings and expenses to see whether your savings are likely to last."
          headline={
            result &&
            (result.gap >= 0
              ? {
                  label: "Estimated surplus at retirement",
                  value: formatMoney(result.gap),
                }
              : {
                  label: "Estimated shortfall at retirement",
                  value: formatMoney(-result.gap),
                })
          }
          rows={
            result && [
              {
                label: `Savings at ${raw.retireAge} (${result.yearsToRetire} years)`,
                value: formatMoney(result.corpus),
              },
              { label: "Corpus needed", value: formatMoney(result.required) },
              {
                label: "Monthly expenses at retirement",
                value: formatMoney(result.expenseAtRetirement),
              },
              ...(result.extraMonthly > 0
                ? [
                    {
                      label: "Extra to save each month to close the gap",
                      value: formatMoney(result.extraMonthly),
                    },
                  ]
                : []),
            ]
          }
        />
      }
    />
  );
}
