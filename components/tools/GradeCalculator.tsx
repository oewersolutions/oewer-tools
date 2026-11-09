"use client";

import { useState } from "react";
import {
  ASSESSMENT_ROWS,
  evaluateWeighted,
  type GradeMode,
  type WeightedRaw,
} from "../../lib/tools/grades";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function GradeCalculator() {
  const [raw, setRaw] = useState<WeightedRaw>({
    mode: "average",
    scores: ["90", "80", "70", "", "", ""],
    weights: ["20", "30", "50", "", "", ""],
    finalWeight: "40",
    target: "85",
  });
  const { errors, result } = evaluateWeighted(raw);
  const setAt = (key: "scores" | "weights", i: number, value: string) =>
    setRaw((r) => ({
      ...r,
      [key]: r[key].map((x, n) => (n === i ? value : x)),
    }));
  const final = raw.mode === "final";

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Work out"
            value={raw.mode}
            onChange={(v: GradeMode) => setRaw((r) => ({ ...r, mode: v }))}
            options={[
              { value: "average", label: "My weighted grade" },
              { value: "final", label: "The score I need on the final" },
            ]}
          />
          {Array.from({ length: ASSESSMENT_ROWS }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <NumberField
                label={`Score ${i + 1} (%)`}
                value={raw.scores[i]!}
                onChange={(v) => setAt("scores", i, v)}
                error={errors[`score${i}`]}
              />
              <NumberField
                label={`Weight ${i + 1} (%)`}
                value={raw.weights[i]!}
                onChange={(v) => setAt("weights", i, v)}
                error={errors[`weight${i}`]}
              />
            </div>
          ))}
          {final && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Final exam weight (%)"
                value={raw.finalWeight}
                onChange={(v) => setRaw((r) => ({ ...r, finalWeight: v }))}
                error={errors.finalWeight}
              />
              <NumberField
                label="Grade you want (%)"
                value={raw.target}
                onChange={(v) => setRaw((r) => ({ ...r, target: v }))}
                error={errors.target}
              />
            </div>
          )}
          <p className="text-sm text-muted">
            Weights are each item’s share of the whole course. Leave unused rows
            empty.
          </p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter at least one score and its weight."
          headline={
            result && { label: result.headlineLabel, value: result.headline }
          }
          rows={result?.rows}
        />
      }
    />
  );
}
