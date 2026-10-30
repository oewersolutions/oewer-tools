"use client";

import { useState } from "react";
import { evaluatePercentage, formatNumber, formatPercent, PERCENTAGE_MODES, type PercentageMode, type PercentageRaw } from "../../lib/tools/finance";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function PercentageCalculator() {
  const [raw, setRaw] = useState<PercentageRaw>({ a: "20", b: "150", mode: "of" });
  const set = <K extends keyof PercentageRaw>(key: K, value: PercentageRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluatePercentage(raw);
  const labels = PERCENTAGE_MODES[raw.mode];

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <SelectField
            label="Calculation"
            value={raw.mode}
            onChange={(v: PercentageMode) => set("mode", v)}
            options={(Object.keys(PERCENTAGE_MODES) as PercentageMode[]).map((k) => ({ value: k, label: PERCENTAGE_MODES[k].label }))}
          />
          <NumberField label={labels.aLabel} value={raw.a} onChange={(v) => set("a", v)} error={errors.a} />
          <NumberField label={labels.bLabel} value={raw.b} onChange={(v) => set("b", v)} error={errors.b} />
        </>
      }
      results={
        <Results
          emptyMessage="Enter both numbers to see the result."
          headline={result && { label: result.explanation, value: result.unit === "percent" ? formatPercent(result.value) : formatNumber(result.value) }}
        />
      }
    />
  );
}
