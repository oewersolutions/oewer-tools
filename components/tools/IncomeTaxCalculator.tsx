"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateTax, SLAB_ROWS, type TaxRaw } from "../../lib/tools/pay";
import { formatQuantity } from "../../lib/tools/units";
import { DataTable, NumberField, Results, ToolLayout } from "./ui";

// Example slabs only, to show how the calculator works. They are not current law: replace them with the slabs for your year and regime.
const EXAMPLE: TaxRaw = {
  income: "1200000",
  deduction: "75000",
  cess: "4",
  from1: "0",
  rate1: "0",
  from2: "300000",
  rate2: "5",
  from3: "700000",
  rate3: "10",
  from4: "1000000",
  rate4: "15",
  from5: "1200000",
  rate5: "20",
  from6: "1500000",
  rate6: "30",
  from7: "",
  rate7: "",
};

export default function IncomeTaxCalculator() {
  const [raw, setRaw] = useState<TaxRaw>(EXAMPLE);
  const set = (key: string, value: string) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateTax(raw);
  const rows = Array.from({ length: SLAB_ROWS }, (_, i) => i + 1);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="Yearly income (₹)"
            value={raw.income}
            onChange={(v) => set("income", v)}
            error={errors.income}
          />
          <NumberField
            label="Deductions (₹, optional)"
            value={raw.deduction}
            onChange={(v) => set("deduction", v)}
            error={errors.deduction}
            hint="Amounts taken off before the slabs are applied."
          />
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">
              Tax slabs
            </legend>
            <p className="text-xs text-slate-600">
              The slabs shown are an example, not current law. Replace them with
              the slabs for your year and regime. Leave unused rows empty.
            </p>
            {rows.map((i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <NumberField
                  label={`Slab ${i} starts at (₹)`}
                  value={i === 1 ? "0" : raw[`from${i}`]!}
                  onChange={(v) => set(`from${i}`, v)}
                  error={errors[`from${i}`]}
                  readOnly={i === 1}
                />
                <NumberField
                  label={`Slab ${i} rate (%)`}
                  value={raw[`rate${i}`]!}
                  onChange={(v) => set(`rate${i}`, v)}
                  error={errors[`rate${i}`]}
                />
              </div>
            ))}
          </fieldset>
          <NumberField
            label="Cess (% of the tax, optional)"
            value={raw.cess}
            onChange={(v) => set("cess", v)}
            error={errors.cess}
          />
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Enter your income and the tax slabs to see the tax."
            headline={
              result && {
                label: "Total tax",
                value: formatMoney(result.totalTax),
              }
            }
            rows={
              result && [
                { label: "Taxable income", value: formatMoney(result.taxable) },
                {
                  label: "Tax before cess",
                  value: formatMoney(result.taxBeforeCess),
                },
                ...(result.cess > 0
                  ? [{ label: "Cess", value: formatMoney(result.cess) }]
                  : []),
                {
                  label: "Effective tax rate",
                  value: `${formatQuantity(Math.round(result.effectiveRate * 100) / 100)}%`,
                },
                {
                  label: "Highest slab reached",
                  value: `${formatQuantity(result.marginalRate)}%`,
                },
                {
                  label: "Left after tax, per year",
                  value: formatMoney(result.takeHome),
                },
                {
                  label: "Left after tax, per month",
                  value: formatMoney(result.takeHome / 12),
                },
              ]
            }
          />
          {result && (
            <DataTable
              caption="Tax in each slab"
              label="Tax by slab"
              columns={["Slab", "Rate", "Income in slab", "Tax"]}
              rows={result.slabs.map((s, i) => [
                `${i + 1}: ${s.to === undefined ? `above ${formatMoney(s.from)}` : `${formatMoney(s.from)} to ${formatMoney(s.to)}`}`,
                `${formatQuantity(s.rate)}%`,
                formatMoney(s.income),
                formatMoney(s.tax),
              ])}
            />
          )}
        </>
      }
    />
  );
}
