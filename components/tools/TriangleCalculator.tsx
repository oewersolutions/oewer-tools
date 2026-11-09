"use client";

import { useState } from "react";
import {
  evaluateTriangle,
  fieldsFor,
  type TriangleMode,
  type TriangleRaw,
} from "../../lib/tools/triangle";
import { formatQuantity as q } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

const MODES: { value: TriangleMode; label: string }[] = [
  { value: "sss", label: "Three sides (a, b, c)" },
  { value: "sas", label: "Two sides and the angle between them" },
  { value: "aas", label: "Two angles and a side" },
];

const LABELS: Record<string, string> = {
  a: "Side a",
  b: "Side b",
  c: "Side c",
  angleA: "Angle A (degrees)",
  angleB: "Angle B (degrees)",
  angleC: "Angle C (degrees)",
};

const HINTS: Record<TriangleMode, string> = {
  sss: "Side a is opposite angle A, side b opposite B, and side c opposite C.",
  sas: "Angle C sits between sides a and b.",
  aas: "Side a is opposite angle A. Any triangle with two known angles and one known side can be labelled this way.",
};

export default function TriangleCalculator() {
  const [raw, setRaw] = useState<TriangleRaw>({
    mode: "sss",
    a: "3",
    b: "4",
    c: "5",
    angleA: "",
    angleB: "",
    angleC: "",
  });
  const set = (key: keyof TriangleRaw, value: string) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateTriangle(raw);
  const need = fieldsFor(raw.mode);
  const keys = [...need.sides, ...need.angles];

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="What you know"
            value={raw.mode}
            onChange={(v: TriangleMode) => set("mode", v)}
            options={MODES}
          />
          {keys.map((k) => (
            <NumberField
              key={`${raw.mode}-${k}`}
              label={LABELS[k]!}
              value={raw[k]}
              onChange={(v) => set(k, v)}
              error={errors[k]}
            />
          ))}
          <p className="text-sm text-muted">
            {HINTS[raw.mode]} Lengths can be in any unit, as long as you use the
            same one for every side.
          </p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter the values to solve the triangle."
          headline={
            result && {
              label: `Area · ${result.bySides}, ${result.byAngles.toLowerCase()}`,
              value: q(result.area),
            }
          }
          rows={
            result && [
              { label: "Perimeter", value: q(result.perimeter) },
              { label: "Side a", value: q(result.a) },
              { label: "Side b", value: q(result.b) },
              { label: "Side c", value: q(result.c) },
              { label: "Angle A", value: `${q(result.A)}°` },
              { label: "Angle B", value: `${q(result.B)}°` },
              { label: "Angle C", value: `${q(result.C)}°` },
            ]
          }
        />
      }
    />
  );
}
