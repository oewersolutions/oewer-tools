"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateSip, type SipRaw } from "../../lib/tools/growth";
import { NumberField, Results, ToolLayout } from "./ui";

export default function SipCalculator() {
  const [raw, setRaw] = useState<SipRaw>({ monthly: "5000", rate: "12", years: "10" });
  const set = <K extends keyof SipRaw>(key: K, value: SipRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateSip(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Monthly investment (₹)" value={raw.monthly} onChange={(v) => set("monthly", v)} error={errors.monthly} />
          <NumberField label="Expected return (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Time period (years)" value={raw.years} onChange={(v) => set("years", v)} error={errors.years} />
          <p className="text-sm text-muted">An estimate, not a promise. Real returns go up and down, and the amount is assumed to be invested at the start of each month.</p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the monthly amount, the return you expect and the number of years to see the estimated value."
          headline={result && { label: "Estimated value at the end", value: formatMoney(result.maturity) }}
          rows={
            result && [
              { label: "Amount you invest", value: formatMoney(result.invested) },
              { label: "Estimated returns", value: formatMoney(result.returns) },
            ]
          }
        />
      }
    />
  );
}
