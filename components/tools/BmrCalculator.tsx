"use client";

import { useState } from "react";
import { formatQuantity } from "../../lib/tools/units";
import {
  type BmrFormula,
  type BmrRaw,
  evaluateBmr,
} from "../../lib/tools/health";
import { BodyFields, DEFAULT_BODY, MedicalNote } from "./healthShared";
import { Results, SelectField, ToolLayout } from "./ui";

export default function BmrCalculator() {
  const [raw, setRaw] = useState<BmrRaw>({
    ...DEFAULT_BODY,
    formula: "mifflin",
  });
  const set = <K extends keyof BmrRaw>(key: K, value: BmrRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateBmr(raw);

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
            label="Equation"
            value={raw.formula}
            onChange={(v: BmrFormula) => set("formula", v)}
            options={[
              { value: "mifflin", label: "Mifflin–St Jeor (1990)" },
              { value: "harris", label: "Revised Harris–Benedict (1984)" },
            ]}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter your age, height and weight to estimate your basal metabolic rate."
            headline={
              result && {
                label: "Basal metabolic rate",
                value: `${formatQuantity(Math.round(result.bmr))} kcal a day`,
              }
            }
            rows={
              result && [
                {
                  label: "In kilojoules",
                  value: `${formatQuantity(Math.round(result.kj))} kJ a day`,
                },
                {
                  label: `${result.other.name}, for comparison`,
                  value: `${formatQuantity(Math.round(result.other.value))} kcal a day`,
                },
              ]
            }
          />
          <MedicalNote>
            BMR is the energy the body uses at complete rest. It is an estimate
            from a population equation, so your own figure can differ. General
            information, not medical advice.
          </MedicalNote>
        </>
      }
    />
  );
}
