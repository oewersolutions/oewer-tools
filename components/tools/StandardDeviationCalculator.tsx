"use client";

import { useState } from "react";
import {
  evaluateStats,
  type DeviationKind,
  type StatsRaw,
} from "../../lib/tools/statistics";
import { formatQuantity as q } from "../../lib/tools/units";
import { Results, SelectField, TextAreaField, ToolLayout } from "./ui";

export default function StandardDeviationCalculator() {
  const [raw, setRaw] = useState<StatsRaw>({
    values: "2, 4, 4, 4, 5, 5, 7, 9",
    kind: "sample",
  });
  const { errors, result } = evaluateStats(raw);
  const sample = raw.kind === "sample";

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <div>
            <TextAreaField
              label="Numbers"
              value={raw.values}
              onChange={(v) => setRaw((r) => ({ ...r, values: v }))}
              rows={6}
              mono
              describedBy="stats-hint"
            />
            <p id="stats-hint" className="mt-1 text-xs text-slate-600">
              Separate the numbers with commas, spaces or new lines. You can
              paste a column from a spreadsheet.
            </p>
            {errors.values && (
              <p role="alert" className="mt-1 text-sm text-red-800">
                {errors.values}
              </p>
            )}
          </div>
          <SelectField
            label="These numbers are"
            value={raw.kind}
            onChange={(v: DeviationKind) => setRaw((r) => ({ ...r, kind: v }))}
            options={[
              { value: "sample", label: "A sample (divide by n − 1)" },
              {
                value: "population",
                label: "The whole population (divide by n)",
              },
            ]}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter some numbers to see the standard deviation."
          headline={
            result && {
              label: sample
                ? "Sample standard deviation (s)"
                : "Population standard deviation (σ)",
              value: q(result.deviation),
            }
          }
          rows={
            result && [
              {
                label: sample ? "Sample variance" : "Population variance",
                value: q(result.variance),
              },
              ...(result.otherDeviation !== undefined
                ? [
                    {
                      label: sample
                        ? "Population deviation (σ)"
                        : "Sample deviation (s)",
                      value: q(result.otherDeviation),
                    },
                  ]
                : []),
              { label: "Mean", value: q(result.mean) },
              { label: "Count", value: result.count.toLocaleString("en-IN") },
              { label: "Sum", value: q(result.sum) },
              { label: "Median", value: q(result.median) },
              { label: "Smallest", value: q(result.min) },
              { label: "Largest", value: q(result.max) },
            ]
          }
        />
      }
    />
  );
}
