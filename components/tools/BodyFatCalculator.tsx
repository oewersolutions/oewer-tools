"use client";

import { useState } from "react";
import {
  type BodyRaw,
  evaluateBodyFat,
  weightIn,
} from "../../lib/tools/health";
import { BodyFields, DEFAULT_BODY, MedicalNote } from "./healthShared";
import { Results, ToolLayout } from "./ui";

export default function BodyFatCalculator() {
  const [raw, setRaw] = useState<BodyRaw>({
    ...DEFAULT_BODY,
    heightCm: "180",
    weight: "80",
  });
  const set = <K extends keyof BodyRaw>(key: K, value: BodyRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateBodyFat(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <BodyFields
          raw={raw}
          set={set}
          errors={errors}
          show={{ weight: true, neckWaist: true, hip: raw.sex === "female" }}
        />
      }
      results={
        <>
          <Results
            emptyMessage="Enter your height, weight, neck and waist (and hip for women) to estimate body fat."
            headline={
              result && {
                label: "Estimated body fat",
                value: `${Math.round(result.percent * 10) / 10}%`,
              }
            }
            rows={
              result && [
                { label: "Fat mass", value: weightIn(result.fatKg, raw.units) },
                {
                  label: "Lean mass",
                  value: weightIn(result.leanKg, raw.units),
                },
              ]
            }
          />
          <MedicalNote>
            The US Navy method estimates body fat from tape measurements and is
            less accurate than direct measurement. Healthy ranges depend on age,
            sex and activity. General information, not medical advice.
          </MedicalNote>
        </>
      }
    />
  );
}
