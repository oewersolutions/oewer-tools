"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateLumpsum, type LumpsumRaw } from "../../lib/tools/growth";
import { NumberField, Results, ToolLayout } from "./ui";

export default function LumpsumCalculator() {
  const [raw, setRaw] = useState<LumpsumRaw>({ amount: "100000", rate: "12", years: "10" });
  const set = <K extends keyof LumpsumRaw>(key: K, value: LumpsumRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateLumpsum(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Investment amount (₹)" value={raw.amount} onChange={(v) => set("amount", v)} error={errors.amount} />
          <NumberField label="Expected return (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Time period (years)" value={raw.years} onChange={(v) => set("years", v)} error={errors.years} />
          <p className="text-sm text-muted">An estimate, not a promise. Real returns go up and down, and this assumes the same return every year.</p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the amount, the return you expect and the number of years to see the estimated value."
          headline={result && { label: "Estimated value at the end", value: formatMoney(result.maturity) }}
          rows={
            result && [
              { label: "Amount you invest", value: formatMoney(result.invested) },
              { label: "Estimated gain", value: formatMoney(result.returns) },
            ]
          }
        />
      }
    />
  );
}
