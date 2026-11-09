"use client";

import { useState } from "react";
import {
  COURSE_ROWS,
  evaluateCgpa,
  evaluateGpa,
  GRADE_POINTS,
  show2,
  type CgpaDirection,
  type CgpaRaw,
  type GpaRaw,
} from "../../lib/tools/grades";
import { formatQuantity as q } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

const GRADE_OPTIONS = [
  { value: "", label: "—" },
  ...Object.keys(GRADE_POINTS).map((g) => ({
    value: g,
    label: `${g} (${GRADE_POINTS[g]!.toFixed(1)})`,
  })),
];

export default function GpaCalculator() {
  const [mode, setMode] = useState<"gpa" | "cgpa">("gpa");
  const [raw, setRaw] = useState<GpaRaw>({
    grades: ["A", "B+", "A-", "", "", "", "", ""],
    credits: ["3", "4", "3", "", "", "", "", ""],
  });
  const [cgpa, setCgpa] = useState<CgpaRaw>({
    direction: "toPercent",
    value: "8.2",
  });
  const gpa = evaluateGpa(raw);
  const conv = evaluateCgpa(cgpa);
  const setAt = (key: keyof GpaRaw, i: number, value: string) =>
    setRaw((r) => ({
      ...r,
      [key]: r[key].map((x, n) => (n === i ? value : x)),
    }));

  return (
    <ToolLayout
      dark
      workings={mode === "gpa" ? gpa.result?.workings : conv.result?.workings}
      inputs={
        <>
          <SelectField
            label="Calculate"
            value={mode}
            onChange={(v: "gpa" | "cgpa") => setMode(v)}
            options={[
              { value: "gpa", label: "GPA on the 4.0 scale" },
              { value: "cgpa", label: "CGPA (10-point) and percentage" },
            ]}
          />
          {mode === "gpa" ? (
            <>
              {Array.from({ length: COURSE_ROWS }, (_, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <SelectField
                    label={`Course ${i + 1} grade`}
                    value={raw.grades[i]!}
                    onChange={(v) => setAt("grades", i, v)}
                    options={GRADE_OPTIONS}
                  />
                  <NumberField
                    label={`Course ${i + 1} credits`}
                    value={raw.credits[i]!}
                    onChange={(v) => setAt("credits", i, v)}
                    error={gpa.errors[i]}
                  />
                </div>
              ))}
              <p className="text-sm text-muted">
                Leave a course’s grade as “—” to skip it.
              </p>
            </>
          ) : (
            <>
              <SelectField
                label="Convert"
                value={cgpa.direction}
                onChange={(v: CgpaDirection) =>
                  setCgpa((c) => ({ ...c, direction: v }))
                }
                options={[
                  { value: "toPercent", label: "CGPA to percentage" },
                  { value: "toCgpa", label: "Percentage to CGPA" },
                ]}
              />
              <NumberField
                label={
                  cgpa.direction === "toPercent"
                    ? "CGPA (out of 10)"
                    : "Percentage"
                }
                value={cgpa.value}
                onChange={(v) => setCgpa((c) => ({ ...c, value: v }))}
                error={conv.errors.value}
              />
            </>
          )}
        </>
      }
      results={
        mode === "gpa" ? (
          <Results
            emptyMessage="Choose a grade and enter the credits for at least one course."
            headline={
              gpa.result && {
                label: "GPA (4.0 scale)",
                value: show2(gpa.result.gpa),
              }
            }
            rows={
              gpa.result && [
                { label: "Total credits", value: q(gpa.result.credits) },
                {
                  label: "Quality points",
                  value: q(Number(gpa.result.qualityPoints.toPrecision(10))),
                },
                { label: "Courses counted", value: String(gpa.result.courses) },
              ]
            }
          />
        ) : (
          <Results
            emptyMessage="Enter a value to convert."
            headline={
              conv.result && {
                label: conv.result.label,
                value:
                  cgpa.direction === "toPercent"
                    ? `${q(Number(conv.result.value.toFixed(2)))}%`
                    : q(Number(conv.result.value.toFixed(2))),
              }
            }
          />
        )
      }
    />
  );
}
