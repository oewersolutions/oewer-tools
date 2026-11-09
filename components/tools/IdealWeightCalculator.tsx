"use client";

import { useState } from "react";
import {
  type BodyRaw,
  evaluateIdealWeight,
  weightIn,
} from "../../lib/tools/health";
import { BodyFields, DEFAULT_BODY, MedicalNote } from "./healthShared";
import { Results, ToolLayout } from "./ui";

export default function IdealWeightCalculator() {
  const [raw, setRaw] = useState<BodyRaw>(DEFAULT_BODY);
  const set = <K extends keyof BodyRaw>(key: K, value: BodyRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateIdealWeight(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={<BodyFields raw={raw} set={set} errors={errors} show={{}} />}
      results={
        <>
          <Results
            emptyMessage="Enter your sex and height to see ideal body weight estimates."
            headline={
              result && {
                label: "Ideal weight (Devine formula)",
                value: weightIn(result.devineKg, raw.units),
              }
            }
            rows={
              result && [
                {
                  label: "Hamwi method",
                  value: weightIn(result.hamwiKg, raw.units),
                },
                {
                  label: "BMI 18.5 to 24.9 for your height",
                  value: `${weightIn(result.bmiMinKg, raw.units)} to ${weightIn(result.bmiMaxKg, raw.units)}`,
                },
              ]
            }
          />
          <MedicalNote>
            Ideal weight formulas are rough estimates for adults. They ignore
            muscle and body fat, so an athlete may weigh more and be perfectly
            healthy. General information, not medical advice.
          </MedicalNote>
        </>
      }
    />
  );
}
