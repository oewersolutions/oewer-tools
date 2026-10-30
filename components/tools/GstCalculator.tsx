"use client";

import { useState } from "react";
import { evaluateGst, formatMoney, type GstRaw } from "../../lib/tools/finance";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

const COMMON_RATES = ["0", "5", "12", "18", "28"];

export default function GstCalculator() {
  const [raw, setRaw] = useState<GstRaw>({ amount: "1000", rate: "18", mode: "add" });
  const set = <K extends keyof GstRaw>(key: K, value: GstRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateGst(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <SelectField
            label="What do you want to do?"
            value={raw.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "add", label: "Add GST to an amount" },
              { value: "remove", label: "Remove GST from an amount" },
            ]}
          />
          <NumberField
            label={raw.mode === "add" ? "Amount without GST (₹)" : "Amount including GST (₹)"}
            value={raw.amount}
            onChange={(v) => set("amount", v)}
            error={errors.amount}
          />
          <NumberField label="GST rate (%)" value={raw.rate} onChange={(v) => set("rate", v)} error={errors.rate} hint={`Common rates: ${COMMON_RATES.join(", ")}`} />
        </>
      }
      results={
        <Results
          emptyMessage="Enter an amount and a GST rate to see the breakdown."
          headline={result && { label: raw.mode === "add" ? "Total including GST" : "Amount without GST", value: formatMoney(raw.mode === "add" ? result.grossAmount : result.netAmount) }}
          rows={
            result && [
              { label: "Amount without GST", value: formatMoney(result.netAmount) },
              { label: "GST amount", value: formatMoney(result.gstAmount) },
              { label: "CGST (half)", value: formatMoney(result.halfGst) },
              { label: "SGST (half)", value: formatMoney(result.halfGst) },
              { label: "Total including GST", value: formatMoney(result.grossAmount) },
            ]
          }
        />
      }
    />
  );
}
