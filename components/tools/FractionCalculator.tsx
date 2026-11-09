"use client";

import { useState } from "react";
import {
  evaluateFractions,
  type FractionOp,
  type FractionRaw,
} from "../../lib/tools/fractions";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

const OPERATIONS: { value: FractionOp; label: string }[] = [
  { value: "add", label: "Add (+)" },
  { value: "subtract", label: "Subtract (−)" },
  { value: "multiply", label: "Multiply (×)" },
  { value: "divide", label: "Divide (÷)" },
];

export default function FractionCalculator() {
  const [raw, setRaw] = useState<FractionRaw>({
    op: "add",
    whole1: "",
    num1: "1",
    den1: "2",
    whole2: "",
    num2: "1",
    den2: "3",
  });
  const set = (key: keyof FractionRaw, value: string) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateFractions(raw);

  const operand = (n: "1" | "2", title: string, error?: string) => (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">{title}</legend>
      <div className="mt-1 grid grid-cols-3 gap-3">
        <NumberField
          label="Whole"
          value={raw[`whole${n}`]}
          onChange={(v) => set(`whole${n}`, v)}
          placeholder="optional"
        />
        <NumberField
          label="Top"
          value={raw[`num${n}`]}
          onChange={(v) => set(`num${n}`, v)}
        />
        <NumberField
          label="Bottom"
          value={raw[`den${n}`]}
          onChange={(v) => set(`den${n}`, v)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          {operand("1", "First fraction", errors.first)}
          <SelectField
            label="Operation"
            value={raw.op}
            onChange={(v: FractionOp) => set("op", v)}
            options={OPERATIONS}
          />
          {operand("2", "Second fraction", errors.second)}
          <p className="text-sm text-muted">
            Leave <strong>Whole</strong> empty for a plain fraction, or fill
            only <strong>Whole</strong> for a whole number. Put a minus sign at
            the start of Whole, or of Top when Whole is empty.
          </p>
        </>
      }
      results={
        <Results
          emptyMessage="Enter both fractions to see the answer."
          headline={result && { label: "Answer", value: result.fraction }}
          rows={
            result && [
              { label: "As a mixed number", value: result.mixed },
              { label: "As a decimal", value: result.decimal },
            ]
          }
        />
      }
    />
  );
}
