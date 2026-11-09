"use client";

import { useState } from "react";
import { formatLong, weekdayOf } from "../../lib/tools/dates";
import {
  type DueMethod,
  type DueRaw,
  evaluateDue,
} from "../../lib/tools/pregnancy";
import { MedicalNote } from "./healthShared";
import { DateField, NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function DueDateCalculator() {
  const [raw, setRaw] = useState<DueRaw>({
    method: "lmp",
    date: "",
    cycle: "28",
  });
  const set = <K extends keyof DueRaw>(key: K, value: DueRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateDue(raw);
  const full = (d: Parameters<typeof formatLong>[0]) =>
    `${formatLong(d)}, ${weekdayOf(d)}`;

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Work it out from"
            value={raw.method}
            onChange={(v: DueMethod) => set("method", v)}
            options={[
              { value: "lmp", label: "First day of the last period" },
              { value: "conception", label: "Date of conception" },
            ]}
          />
          <DateField
            label={
              raw.method === "lmp"
                ? "First day of your last period"
                : "Date of conception"
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
            emptyMessage="Choose a date to see the estimated due date."
            headline={
              result && {
                label: "Estimated due date",
                value: formatLong(result.due),
              }
            }
            rows={
              result && [
                { label: "Day of the week", value: result.weekday },
                {
                  label: "Estimated conception",
                  value: full(result.conception),
                },
                ...result.milestones.map((m) => ({
                  label: m.label,
                  value: formatLong(m.date),
                })),
              ]
            }
          />
          <MedicalNote>
            A due date is an estimate. Only a small share of babies arrive on
            it, and pregnancy normally lasts 37 to 42 weeks from the first day
            of the last period. General information, not medical advice: speak
            to a midwife or doctor.
          </MedicalNote>
        </>
      }
    />
  );
}
