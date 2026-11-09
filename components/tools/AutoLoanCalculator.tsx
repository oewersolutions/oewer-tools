"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateAuto, type AutoRaw } from "../../lib/tools/loans";
import { TenureFields } from "./loanShared";
import { NumberField, Results, ToolLayout } from "./ui";

export default function AutoLoanCalculator() {
  const [raw, setRaw] = useState<AutoRaw>({
    price: "1000000",
    down: "200000",
    rate: "9",
    tenure: "5",
    tenureUnit: "years",
    fee: "",
  });
  const set = <K extends keyof AutoRaw>(key: K, value: AutoRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateAuto(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Vehicle price (₹)"
            value={raw.price}
            onChange={(v) => set("price", v)}
            error={errors.price}
          />
          <NumberField
            label="Down payment (₹)"
            value={raw.down}
            onChange={(v) => set("down", v)}
            error={errors.down}
          />
          <NumberField
            label="Interest rate (% per year)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          <TenureFields
            value={raw.tenure}
            unit={raw.tenureUnit}
            onValue={(v) => set("tenure", v)}
            onUnit={(u) => set("tenureUnit", u)}
            error={errors.tenure}
          />
          <NumberField
            label="Processing fee (% of the loan, optional)"
            value={raw.fee}
            onChange={(v) => set("fee", v)}
            error={errors.fee}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the vehicle price, down payment, interest rate and tenure to see the monthly EMI."
          headline={
            result && { label: "Monthly EMI", value: formatMoney(result.emi) }
          }
          rows={
            result && [
              { label: "Loan amount", value: formatMoney(result.loan) },
              {
                label: "Total interest",
                value: formatMoney(result.totalInterest),
              },
              ...(result.feeAmount > 0
                ? [
                    {
                      label: "Processing fee",
                      value: formatMoney(result.feeAmount),
                    },
                  ]
                : []),
              {
                label: "Total cost of the vehicle",
                value: formatMoney(result.totalCost),
              },
            ]
          }
        />
      }
    />
  );
}
