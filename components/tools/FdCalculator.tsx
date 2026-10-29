"use client";

import { useState } from "react";
import { COMPOUNDING_LABELS, evaluateFd, formatMoney, type Compounding, type FdRaw } from "../../lib/tools/finance";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function FdCalculator() {
  const [raw, setRaw] = useState<FdRaw>({ principal: "100000", rate: "7", tenure: "3", tenureUnit: "years", compounding: "4" });
  const set = <K extends keyof FdRaw>(key: K, value: FdRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateFd(raw);

  return (
    <ToolLayout
      inputs={
        <>
          <NumberField label="Deposit amount (₹)" value={raw.principal} onChange={(v) => set("principal", v)} error={errors.principal} />
          <NumberField label="Interest rate (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Tenure" value={raw.tenure} onChange={(v) => set("tenure", v)} error={errors.tenure} />
          <SelectField
            label="Tenure unit"
            value={raw.tenureUnit}
            onChange={(v) => set("tenureUnit", v)}
            options={[
              { value: "years", label: "Years" },
              { value: "months", label: "Months" },
            ]}
          />
          <SelectField
            label="Interest compounded"
            value={raw.compounding}
            onChange={(v: Compounding) => set("compounding", v)}
            options={(Object.keys(COMPOUNDING_LABELS) as Compounding[]).map((k) => ({ value: k, label: COMPOUNDING_LABELS[k] }))}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the deposit amount, interest rate and tenure to see the maturity amount."
          headline={result && { label: "Maturity amount", value: formatMoney(result.maturityAmount) }}
          rows={
            result && [
              { label: "Amount invested", value: formatMoney(result.principal) },
              { label: "Interest earned", value: formatMoney(result.interestEarned) },
            ]
          }
        />
      }
    />
  );
}
