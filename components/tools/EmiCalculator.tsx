"use client";

import { useState } from "react";
import { evaluateEmi, formatMoney, type EmiRaw } from "../../lib/tools/finance";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function EmiCalculator() {
  const [raw, setRaw] = useState<EmiRaw>({ principal: "1000000", rate: "9", tenure: "5", tenureUnit: "years" });
  const set = <K extends keyof EmiRaw>(key: K, value: EmiRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateEmi(raw);

  return (
    <ToolLayout
      inputs={
        <>
          <NumberField label="Loan amount (₹)" value={raw.principal} onChange={(v) => set("principal", v)} error={errors.principal} />
          <NumberField label="Interest rate (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Loan tenure" value={raw.tenure} onChange={(v) => set("tenure", v)} error={errors.tenure} />
          <SelectField
            label="Tenure unit"
            value={raw.tenureUnit}
            onChange={(v) => set("tenureUnit", v)}
            options={[
              { value: "years", label: "Years" },
              { value: "months", label: "Months" },
            ]}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the loan amount, interest rate and tenure to see your EMI."
          headline={result && { label: "Monthly EMI", value: formatMoney(result.emi) }}
          rows={
            result && [
              { label: "Principal amount", value: formatMoney(result.principal) },
              { label: "Total interest", value: formatMoney(result.totalInterest) },
              { label: `Total payment (${result.months} months)`, value: formatMoney(result.totalPayment) },
            ]
          }
        />
      }
    />
  );
}
