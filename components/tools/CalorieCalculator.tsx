"use client";

import { useState } from "react";
import {
  ACTIVITY,
  type CalorieRaw,
  evaluateCalories,
} from "../../lib/tools/health";
import { formatQuantity } from "../../lib/tools/units";
import { BodyFields, DEFAULT_BODY, MedicalNote } from "./healthShared";
import { Results, SelectField, ToolLayout } from "./ui";

const ADJUST = [
  { value: "-750", label: "750 fewer calories a day" },
  { value: "-500", label: "500 fewer calories a day" },
  { value: "-250", label: "250 fewer calories a day" },
  { value: "0", label: "No change (maintain weight)" },
  { value: "250", label: "250 more calories a day" },
  { value: "500", label: "500 more calories a day" },
];

export default function CalorieCalculator() {
  const [raw, setRaw] = useState<CalorieRaw>({
    ...DEFAULT_BODY,
    activity: "sedentary",
    adjust: "0",
  });
  const set = <K extends keyof CalorieRaw>(key: K, value: CalorieRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateCalories(raw);
  const kcal = (n: number) => `${formatQuantity(Math.round(n))} kcal`;

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
            label="Activity level"
            value={raw.activity}
            onChange={(v: string) => set("activity", v)}
            options={Object.entries(ACTIVITY).map(([value, a]) => ({
              value,
              label: a.label,
            }))}
          />
          <SelectField
            label="Change from maintenance"
            value={raw.adjust}
            onChange={(v: string) => set("adjust", v)}
            options={ADJUST}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter your details to estimate the calories you use in a day."
            headline={
              result && {
                label:
                  raw.adjust === "0"
                    ? "Calories to maintain weight"
                    : "Calorie target",
                value: `${kcal(result.target)} a day`,
              }
            }
            rows={
              result && [
                {
                  label: "Maintenance",
                  value: `${kcal(result.maintenance)} a day`,
                },
                {
                  label: "Basal metabolic rate",
                  value: `${kcal(result.bmr)} a day`,
                },
                ...(result.weeklyChangeKg !== 0
                  ? [
                      {
                        label: "Rough weight change",
                        value: `${formatQuantity(Math.round(Math.abs(result.weeklyChangeKg) * 100) / 100)} kg a week ${result.weeklyChangeKg < 0 ? "lost" : "gained"}`,
                      },
                    ]
                  : []),
                ...(result.belowBmr
                  ? [{ label: "Note", value: "Below your BMR" }]
                  : []),
              ]
            }
          />
          <MedicalNote>
            {result?.belowBmr
              ? "This target is below your basal metabolic rate, which is not usually advised without medical supervision. General information, not medical advice."
              : "Energy needs vary from person to person, and weight change from a calorie change is only a rough estimate. General information, not medical advice: speak to a doctor or a registered dietitian."}
          </MedicalNote>
        </>
      }
    />
  );
}
