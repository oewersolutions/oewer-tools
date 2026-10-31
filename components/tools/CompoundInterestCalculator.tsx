"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { COMPOUNDING_CHOICES, evaluateCompound, type CompoundingPerYear, type CompoundRaw } from "../../lib/tools/interest";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function CompoundInterestCalculator() {
  const [raw, setRaw] = useState<CompoundRaw>({ principal: "100000", rate: "8", years: "10", compounding: "1" });
  const set = <K extends keyof CompoundRaw>(key: K, value: CompoundRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateCompound(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Principal (₹)" value={raw.principal} onChange={(v) => set("principal", v)} error={errors.principal} />
          <NumberField label="Interest rate (% per year)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} />
          <NumberField label="Time period (years)" value={raw.years} onChange={(v) => set("years", v)} error={errors.years} />
          <SelectField
            label="Interest added"
            value={raw.compounding}
            onChange={(v: CompoundingPerYear) => set("compounding", v)}
            options={(Object.keys(COMPOUNDING_CHOICES) as CompoundingPerYear[]).map((k) => ({ value: k, label: COMPOUNDING_CHOICES[k] }))}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter the principal, the interest rate and the time period to see the final amount."
            headline={result && { label: "Amount at the end", value: formatMoney(result.amount) }}
            rows={
              result && [
                { label: "Principal", value: formatMoney(result.principal) },
                { label: "Interest earned", value: formatMoney(result.interest) },
              ]
            }
          />
          {result && (
            <div className="mt-6 max-h-64 overflow-auto rounded-xl border border-white/15" tabIndex={0} role="region" aria-label="Year by year">
              <table className="w-full text-left text-sm text-white">
                <caption className="sr-only">Balance at the end of each year</caption>
                <thead className="sticky top-0 bg-black/40 text-xs uppercase tracking-wide text-white/75">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Year</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Interest</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.year} className="border-t border-white/10">
                      <td className="px-3 py-2">{r.year}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(r.interestThisYear)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      }
    />
  );
}
