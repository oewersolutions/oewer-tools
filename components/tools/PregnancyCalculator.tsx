"use client";

import { useEffect, useState } from "react";
import { formatLong, todayIso } from "../../lib/tools/dates";
import {
  evaluatePregnancy,
  type PregnancyMethod,
  type PregnancyRaw,
} from "../../lib/tools/pregnancy";
import { MedicalNote } from "./healthShared";
import { DateField, NumberField, Results, SelectField, ToolLayout } from "./ui";

const ORDINAL = ["", "first", "second", "third"];

export default function PregnancyCalculator() {
  const [raw, setRaw] = useState<PregnancyRaw>({
    method: "lmp",
    date: "",
    asOf: "",
    cycle: "28",
  });
  // Today is filled in after the page loads, so the static page is the same for everyone and the date is the visitor's own.
  useEffect(() => setRaw((r) => (r.asOf ? r : { ...r, asOf: todayIso() })), []);
  const set = <K extends keyof PregnancyRaw>(key: K, value: PregnancyRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluatePregnancy(raw);
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Work it out from"
            value={raw.method}
            onChange={(v: PregnancyMethod) => set("method", v)}
            options={[
              { value: "lmp", label: "First day of the last period" },
              { value: "due", label: "Estimated due date" },
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
          <DateField
            label="How far along on"
            value={raw.asOf}
            onChange={(v) => set("asOf", v)}
            error={errors.asOf}
            hint="Today, unless you change it."
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Choose a date to see how many weeks pregnant you are."
            headline={
              result && {
                label: "Weeks pregnant",
                value: `${plural(result.weeks, "week")} ${plural(result.extraDays, "day")}`,
              }
            }
            rows={
              result && [
                {
                  label: "Trimester",
                  value: result.trimester
                    ? `${ORDINAL[result.trimester]} trimester`
                    : "",
                },
                { label: "Estimated due date", value: formatLong(result.due) },
                {
                  label:
                    result.daysToDue >= 0
                      ? "Days to the due date"
                      : "Days past the due date",
                  value: String(Math.abs(result.daysToDue)),
                },
                {
                  label: "Progress",
                  value: `${Math.round(result.percent)}% of 40 weeks`,
                },
                ...result.milestones.map((m) => ({
                  label: m.label,
                  value: formatLong(m.date),
                })),
              ]
            }
          />
          <MedicalNote>
            Dates are estimates counted from the first day of the last period.
            Trimester boundaries vary between sources: this uses 14 and 28
            weeks. General information, not medical advice: speak to a midwife
            or doctor about your own pregnancy.
          </MedicalNote>
        </>
      }
    />
  );
}
