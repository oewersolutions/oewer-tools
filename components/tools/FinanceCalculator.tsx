"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import {
  evaluateFinance,
  FINANCE_SOLVE,
  type FinanceRaw,
  type FinanceSolve,
} from "../../lib/tools/planning";
import { formatQuantity } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function FinanceCalculator() {
  const [raw, setRaw] = useState<FinanceRaw>({
    solve: "fv",
    pv: "100000",
    pmt: "5000",
    fv: "",
    rate: "12",
    years: "10",
    perYear: "12",
    timing: "end",
  });
  const set = <K extends keyof FinanceRaw>(key: K, value: FinanceRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateFinance(raw);

  const headline =
    result &&
    (result.solve === "rate"
      ? {
          label: "Interest rate",
          value: `${formatQuantity(Math.round(result.value * 10000) / 10000)}% per year`,
        }
      : result.solve === "years"
        ? {
            label: "Time",
            value: `${formatQuantity(Math.round(result.value * 100) / 100)} years`,
          }
        : {
            label: FINANCE_SOLVE[result.solve],
            value: formatMoney(result.value),
          });

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Find"
            value={raw.solve}
            onChange={(v: FinanceSolve) => set("solve", v)}
            options={(Object.keys(FINANCE_SOLVE) as FinanceSolve[]).map(
              (k) => ({ value: k, label: FINANCE_SOLVE[k] }),
            )}
          />
          {raw.solve !== "pv" && (
            <NumberField
              label="Starting amount (₹)"
              value={raw.pv}
              onChange={(v) => set("pv", v)}
              error={errors.pv}
            />
          )}
          {raw.solve !== "pmt" && (
            <NumberField
              label="Regular deposit each period (₹)"
              value={raw.pmt}
              onChange={(v) => set("pmt", v)}
              error={errors.pmt}
            />
          )}
          {raw.solve !== "fv" && (
            <NumberField
              label="Final amount (₹)"
              value={raw.fv}
              onChange={(v) => set("fv", v)}
              error={errors.fv}
            />
          )}
          {raw.solve !== "rate" && (
            <NumberField
              label="Interest rate (% per year)"
              value={raw.rate}
              onChange={(v) => set("rate", v)}
              error={errors.rate}
            />
          )}
          {raw.solve !== "years" && (
            <NumberField
              label="Time (years)"
              value={raw.years}
              onChange={(v) => set("years", v)}
              error={errors.years}
            />
          )}
          <SelectField
            label="Deposits and interest are added"
            value={raw.perYear}
            onChange={(v: FinanceRaw["perYear"]) => set("perYear", v)}
            options={[
              { value: "12", label: "Monthly" },
              { value: "4", label: "Quarterly" },
              { value: "2", label: "Half-yearly" },
              { value: "1", label: "Yearly" },
            ]}
          />
          <SelectField
            label="Deposits are made"
            value={raw.timing}
            onChange={(v: "end" | "start") => set("timing", v)}
            options={[
              { value: "end", label: "At the end of each period" },
              { value: "start", label: "At the start of each period" },
            ]}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Choose what to find and fill in the other values."
          headline={headline}
        />
      }
    />
  );
}
