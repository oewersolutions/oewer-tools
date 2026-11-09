"use client";

import { useState } from "react";
import { formatLong, weekdayOf } from "../../lib/tools/dates";
import {
  type ConceptionMethod,
  type ConceptionRaw,
  evaluateConception,
} from "../../lib/tools/pregnancy";
import { MedicalNote } from "./healthShared";
import { DateField, NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function ConceptionCalculator() {
  const [raw, setRaw] = useState<ConceptionRaw>({
    method: "due",
    date: "",
    cycle: "28",
  });
  const set = <K extends keyof ConceptionRaw>(
    key: K,
    value: ConceptionRaw[K],
  ) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateConception(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Work it out from"
            value={raw.method}
            onChange={(v: ConceptionMethod) => set("method", v)}
            options={[
              { value: "due", label: "Estimated due date" },
              { value: "lmp", label: "First day of the last period" },
            ]}
          />
          <DateField
            label={
              raw.method === "lmp"
                ? "First day of your last period"
                : "Estimated due date"
            }
            value={raw.date}
            onChange={(v) => set("date", v)}
            error={errors.date}
          />
          {raw.method === "lmp" && (
            <NumberField
              label="Cycle length (days)"
              value={raw.cycle}
              onChange={(v) => set("cycle", v)}
              error={errors.cycle}
              hint="28 days unless you know yours is longer or shorter."
            />
          )}
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Choose a date to see the estimated date of conception."
            headline={
              result && {
                label: "Estimated conception",
                value: formatLong(result.conception),
              }
            }
            rows={
              result && [
                {
                  label: "Day of the week",
                  value: weekdayOf(result.conception),
                },
                {
                  label: "First day of the last period",
                  value: formatLong(result.lmp),
                },
                { label: "Estimated due date", value: formatLong(result.due) },
              ]
            }
          />
          <MedicalNote>
            Conception dates are estimates and could be several days either
            side. General information, not medical advice: speak to a midwife or
            doctor.
          </MedicalNote>
        </>
      }
    />
  );
}
