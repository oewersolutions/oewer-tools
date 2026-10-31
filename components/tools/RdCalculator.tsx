"use client";

import { useState } from "react";
import { evaluateRd, type RdRaw } from "../../lib/tools/deposits";
import { formatMoney } from "../../lib/tools/finance";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function RdCalculator() {
  const [raw, setRaw] = useState<RdRaw>({ monthly: "5000", rate: "6.5", tenure: "5", tenureUnit: "years" });
  const set = <K extends keyof RdRaw>(key: K, value: RdRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateRd(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Monthly deposit (₹)" value={raw.monthly} onChange={(v) => set("monthly", v)} error={errors.monthly} />
          <NumberField label="Interest rate (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Tenure" value={raw.tenure} onChange={(v) => set("tenure", v)} error={errors.tenure} />
          <SelectField
            label="Tenure unit"
            value={raw.tenureUnit}
            onChange={(v: RdRaw["tenureUnit"]) => set("tenureUnit", v)}
            options={[
              { value: "years", label: "Years" },
              { value: "months", label: "Months" },
            ]}
          />
          <p className="text-sm text-muted">Interest is compounded quarterly, the usual convention in Indian banks. Your bank&rsquo;s own figure can differ by a small amount.</p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the monthly deposit, the interest rate and the tenure to see the maturity amount."
          headline={result && { label: "Maturity amount", value: formatMoney(result.maturity) }}
          rows={
            result && [
              { label: "Total deposited", value: formatMoney(result.deposited) },
              { label: "Interest earned", value: formatMoney(result.interest) },
            ]
          }
        />
      }
    />
  );
}

