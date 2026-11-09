"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateRate, type RateRaw } from "../../lib/tools/loans";
import { formatQuantity } from "../../lib/tools/units";
import { TenureFields } from "./loanShared";
import { NumberField, Results, ToolLayout } from "./ui";

export default function InterestRateCalculator() {
  const [raw, setRaw] = useState<RateRaw>({
    principal: "1000000",
    payment: "20758.36",
    tenure: "5",
    tenureUnit: "years",
  });
  const set = <K extends keyof RateRaw>(key: K, value: RateRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateRate(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Loan amount (₹)"
            value={raw.principal}
            onChange={(v) => set("principal", v)}
            error={errors.principal}
          />
          <NumberField
            label="Monthly payment, EMI (₹)"
            value={raw.payment}
            onChange={(v) => set("payment", v)}
            error={errors.payment}
          />
          <TenureFields
            value={raw.tenure}
            unit={raw.tenureUnit}
            onValue={(v) => set("tenure", v)}
            onUnit={(u) => set("tenureUnit", u)}
            error={errors.tenure}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the loan amount, the monthly payment and the tenure to find the interest rate."
          headline={
            result && {
              label: "Interest rate",
              value: `${formatQuantity(Math.round(result.rate * 10000) / 10000)}% per year`,
            }
          }
          rows={
            result && [
              {
                label: "Total interest",
                value: formatMoney(result.totalInterest),
              },
              {
                label: `Total of the payments (${result.months} months)`,
                value: formatMoney(result.totalPayment),
              },
            ]
          }
        />
      }
    />
  );
}
