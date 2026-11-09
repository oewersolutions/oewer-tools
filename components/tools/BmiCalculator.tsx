"use client";

import { useState } from "react";
import {
  type BmiRaw,
  type BmiScale,
  evaluateBmi,
  weightIn,
} from "../../lib/tools/health";
import { BodyFields, DEFAULT_BODY, MedicalNote } from "./healthShared";
import { Results, SelectField, ToolLayout } from "./ui";

export default function BmiCalculator() {
  const [raw, setRaw] = useState<BmiRaw>({ ...DEFAULT_BODY, scale: "who" });
  const set = <K extends keyof BmiRaw>(key: K, value: BmiRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateBmi(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <BodyFields
            raw={raw}
            set={set}
            errors={errors}
            show={{ age: true, weight: true }}
          />
          <SelectField
            label="Categories"
            value={raw.scale}
            onChange={(v: BmiScale) => set("scale", v)}
            options={[
              { value: "who", label: "Standard adult cut-offs (18.5, 25, 30)" },
              {
                value: "asian",
                label: "South Asian and other at-risk backgrounds (23, 27.5)",
              },
            ]}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter your height and weight to see your BMI."
            headline={
              result && {
                label: result.category ? `BMI · ${result.category}` : "BMI",
                value: String(Math.round(result.bmi * 10) / 10),
              }
            }
            rows={
              result && [
                {
                  label: "Weight range for your height",
                  value: `${weightIn(result.healthyMinKg, raw.units)} to ${weightIn(result.healthyMaxKg, raw.units)}`,
                },
                ...(result.change !== 0 && result.category
                  ? [
                      {
                        label:
                          result.change < 0
                            ? "To reach that range, lose about"
                            : "To reach that range, gain about",
                        value: weightIn(Math.abs(result.change), raw.units),
                      },
                    ]
                  : []),
              ]
            }
          />
          <MedicalNote>
            BMI compares weight with height. It cannot tell muscle from fat, and
            the adult categories do not apply to children. General information,
            not medical advice: speak to a doctor about your own health.
          </MedicalNote>
        </>
      }
    />
  );
}
