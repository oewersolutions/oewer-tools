"use client";

import { useState } from "react";
import { formatSpan } from "../../lib/tools/duration";
import {
  evaluateTime,
  type TimeOp,
  type TimeRaw,
} from "../../lib/tools/timecalc";
import { formatQuantity } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function TimeCalculator() {
  const [raw, setRaw] = useState<TimeRaw>({
    op: "add",
    aDays: "",
    aHours: "2",
    aMinutes: "45",
    aSeconds: "30",
    bDays: "",
    bHours: "1",
    bMinutes: "30",
    bSeconds: "50",
  });
  const set = <K extends keyof TimeRaw>(key: K, value: TimeRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateTime(raw);

  const group = (side: "a" | "b", title: string) => (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800">{title}</legend>
      <div className="grid grid-cols-4 gap-2">
        <NumberField
          label="Days"
          value={raw[`${side}Days`]}
          onChange={(v) => set(`${side}Days`, v)}
          error={errors[`${side}Days`]}
        />
        <NumberField
          label="Hours"
          value={raw[`${side}Hours`]}
          onChange={(v) => set(`${side}Hours`, v)}
          error={errors[`${side}Hours`]}
        />
        <NumberField
          label="Minutes"
          value={raw[`${side}Minutes`]}
          onChange={(v) => set(`${side}Minutes`, v)}
          error={errors[`${side}Minutes`]}
        />
        <NumberField
          label="Seconds"
          value={raw[`${side}Seconds`]}
          onChange={(v) => set(`${side}Seconds`, v)}
          error={errors[`${side}Seconds`]}
        />
      </div>
    </fieldset>
  );

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          {group("a", "First time")}
          <SelectField
            label="Operation"
            value={raw.op}
            onChange={(v: TimeOp) => set("op", v)}
            options={[
              { value: "add", label: "Add (+)" },
              { value: "subtract", label: "Subtract (−)" },
            ]}
          />
          {group("b", "Second time")}
        </>
      }
      results={
        <Results
          emptyMessage="Enter both times to see the total."
          headline={
            result && {
              label: raw.op === "add" ? "Total" : "Difference",
              value: `${result.negative ? "−" : ""}${formatSpan(result.seconds)}`,
            }
          }
          rows={
            result && [
              {
                label: "In hours",
                value: `${result.negative ? "−" : ""}${formatQuantity(result.seconds / 3600)}`,
              },
              {
                label: "In minutes",
                value: `${result.negative ? "−" : ""}${formatQuantity(result.seconds / 60)}`,
              },
              {
                label: "In seconds",
                value: `${result.negative ? "−" : ""}${formatQuantity(result.seconds)}`,
              },
            ]
          }
        />
      }
    />
  );
}
