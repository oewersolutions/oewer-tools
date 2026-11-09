"use client";

import { useState } from "react";
import { formatMoney } from "../../lib/tools/finance";
import { evaluateSalesTax, type SalesTaxRaw } from "../../lib/tools/pay";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function SalesTaxCalculator() {
  const [raw, setRaw] = useState<SalesTaxRaw>({
    mode: "add",
    price: "1000",
    quantity: "1",
    discount: "",
    rate: "18",
    rate2: "",
  });
  const set = <K extends keyof SalesTaxRaw>(key: K, value: SalesTaxRaw[K]) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateSalesTax(raw);
  const add = raw.mode === "add";

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <SelectField
            label="Calculation"
            value={raw.mode}
            onChange={(v: "add" | "remove") => set("mode", v)}
            options={[
              { value: "add", label: "Add tax to a price" },
              { value: "remove", label: "Find the price before tax" },
            ]}
          />
          <NumberField
            label={add ? "Price of one item (₹)" : "Price including tax (₹)"}
            value={raw.price}
            onChange={(v) => set("price", v)}
            error={errors.price}
          />
          {add && (
            <NumberField
              label="Quantity"
              value={raw.quantity}
              onChange={(v) => set("quantity", v)}
              error={errors.quantity}
            />
          )}
          {add && (
            <NumberField
              label="Discount before tax (%, optional)"
              value={raw.discount}
              onChange={(v) => set("discount", v)}
              error={errors.discount}
            />
          )}
          <NumberField
            label="Tax rate (%)"
            value={raw.rate}
            onChange={(v) => set("rate", v)}
            error={errors.rate}
          />
          <NumberField
            label="Second tax rate (%, optional)"
            value={raw.rate2}
            onChange={(v) => set("rate2", v)}
            error={errors.rate2}
            hint="For a tax charged as well, such as a local or state tax. It is applied to the same price."
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the price and the tax rate to see the tax and the total."
          headline={
            result &&
            (add
              ? { label: "Total with tax", value: formatMoney(result.total) }
              : {
                  label: "Price before tax",
                  value: formatMoney(result.beforeTax),
                })
          }
          rows={
            result && [
              ...(add && result.discountAmount > 0
                ? [
                    {
                      label: "Discount",
                      value: formatMoney(result.discountAmount),
                    },
                  ]
                : []),
              ...(add
                ? [
                    {
                      label: "Price before tax",
                      value: formatMoney(result.beforeTax),
                    },
                  ]
                : []),
              { label: "Tax", value: formatMoney(result.tax) },
              ...(result.tax2 > 0
                ? [{ label: "Second tax", value: formatMoney(result.tax2) }]
                : []),
              ...(add
                ? []
                : [
                    {
                      label: "Price including tax",
                      value: formatMoney(result.total),
                    },
                  ]),
            ]
          }
        />
      }
    />
  );
}
