"use client";

import { useState } from "react";
import { formatMoney, formatPercent } from "../../lib/tools/finance";
import { evaluateMortgage, type MortgageRaw } from "../../lib/tools/loans";
import { TenureFields } from "./loanShared";
import { NumberField, Results, ToolLayout } from "./ui";

export default function MortgageCalculator() {
  const [raw, setRaw] = useState<MortgageRaw>({
    price: "5000000",
    downPercent: "20",
    rate: "8.5",
    tenure: "20",
    tenureUnit: "years",
  });
  const set = <K extends keyof MortgageRaw>(key: K, value: MortgageRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateMortgage(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Home price (₹)"
            value={raw.price}
            onChange={(v) => set("price", v)}
            error={errors.price}
          />
          <NumberField
            label="Down payment (% of the price)"
            value={raw.downPercent}
            onChange={(v) => set("downPercent", v)}
            error={errors.downPercent}
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
        </>
      }
      results={
        <Results
          emptyMessage="Enter the home price, down payment, interest rate and tenure to see the monthly EMI."
          headline={
            result && { label: "Monthly EMI", value: formatMoney(result.emi) }
          }
          rows={
            result && [
              { label: "Down payment", value: formatMoney(result.downPayment) },
              { label: "Loan amount", value: formatMoney(result.loan) },
              {
                label: "Loan-to-value",
                value: formatPercent(result.loanToValue),
              },
              {
                label: "Total interest",
                value: formatMoney(result.totalInterest),
              },
              {
                label: "Total paid, with the down payment",
                value: formatMoney(result.totalCost),
              },
            ]
          }
        />
      }
    />
  );
}
