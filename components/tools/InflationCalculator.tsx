"use client";

import { useState } from "react";
import { formatMoney, formatPercent } from "../../lib/tools/finance";
import {
  evaluateInflation,
  INFLATION_MODES,
  type InflationMode,
  type InflationRaw,
} from "../../lib/tools/planning";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function InflationCalculator() {
  const [raw, setRaw] = useState<InflationRaw>({
    mode: "future",
    amount: "100000",
    newAmount: "",
    rate: "6",
    years: "10",
  });
  const set = <K extends keyof InflationRaw>(key: K, value: InflationRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateInflation(raw);

  const headline =
    result &&
    (result.mode === "future"
      ? {
          label: `What costs ${formatMoney(Number(raw.amount.replace(/[,\s]/g, "")))} today could cost`,
          value: formatMoney(result.value),
        }
      : result.mode === "value"
        ? { label: "Worth in today's money", value: formatMoney(result.value) }
        : {
            label: "Average inflation per year",
            value: formatPercent(Math.round(result.value * 10000) / 10000),
          });

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Find"
            value={raw.mode}
            onChange={(v: InflationMode) => set("mode", v)}
            options={(Object.keys(INFLATION_MODES) as InflationMode[]).map(
              (k) => ({ value: k, label: INFLATION_MODES[k] }),
            )}
          />
          <NumberField
            label={
              raw.mode === "rate"
                ? "Old price (₹)"
                : raw.mode === "future"
                  ? "Cost today (₹)"
                  : "Future amount (₹)"
            }
            value={raw.amount}
            onChange={(v) => set("amount", v)}
            error={errors.amount}
          />
          {raw.mode === "rate" ? (
            <NumberField
              label="New price (₹)"
              value={raw.newAmount}
              onChange={(v) => set("newAmount", v)}
              error={errors.newAmount}
            />
          ) : (
            <NumberField
              label="Inflation rate (% per year)"
              value={raw.rate}
              onChange={(v) => set("rate", v)}
              error={errors.rate}
            />
          )}
          <NumberField
            label="Number of years"
            value={raw.years}
            onChange={(v) => set("years", v)}
            error={errors.years}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Fill in the values to see the result."
          headline={headline}
          rows={
            result && [
              result.mode === "future"
                ? {
                    label: "Increase in cost",
                    value: formatMoney(result.change),
                  }
                : result.mode === "value"
                  ? {
                      label: "Buying power lost",
                      value: formatMoney(result.change),
                    }
                  : {
                      label: "Total price rise",
                      value: formatPercent(
                        Math.round(result.change * 100) / 100,
                      ),
                    },
            ]
          }
        />
      }
    />
  );
}
