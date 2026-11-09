"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateLoan,
  formatMonths,
  type LoanRaw,
} from "../../lib/tools/loans";
import { TenureFields } from "./loanShared";
import { NumberField, Results, ToolLayout } from "./ui";

export default function LoanCalculator() {
  const [raw, setRaw] = useState<LoanRaw>({
    principal: "1000000",
    rate: "9",
    tenure: "5",
    tenureUnit: "years",
    extra: "",
  });
  const set = <K extends keyof LoanRaw>(key: K, value: LoanRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateLoan(raw);

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
            label="Extra payment each month (₹, optional)"
            value={raw.extra}
            onChange={(v) => set("extra", v)}
            error={errors.extra}
            hint="Paid on top of the EMI to clear the loan sooner."
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the loan amount, interest rate and tenure to see the monthly payment."
          headline={
            result && { label: "Monthly EMI", value: formatMoney(result.emi) }
          }
          rows={
            result && [
              {
                label: "Total interest",
                value: formatMoney(result.totalInterest),
              },
              {
                label: `Total payment (${result.months} months)`,
                value: formatMoney(result.totalPayment),
              },
              ...(result.extra
                ? [
                    {
                      label: "With the extra payment, paid off in",
                      value: formatMonths(result.extra.months),
                    },
                    {
                      label: "Time saved",
                      value: formatMonths(result.extra.monthsSaved),
                    },
                    {
                      label: "Interest saved",
                      value: formatMoney(result.extra.interestSaved),
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
