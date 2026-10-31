"use client";

import { useState } from "react";
import { evaluateDiscount, type DiscountRaw } from "../../lib/tools/deposits";
import { formatMoney } from "../../lib/tools/finance";
import { NumberField, Results, ToolLayout } from "./ui";

const percent = (n: number) => `${Number(n.toFixed(2))}%`;

export default function DiscountCalculator() {
  const [raw, setRaw] = useState<DiscountRaw>({ price: "2000", first: "20", second: "10" });
  const set = <K extends keyof DiscountRaw>(key: K, value: DiscountRaw[K]) => setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateDiscount(raw);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <NumberField label="Original price (₹)" value={raw.price} onChange={(v) => set("price", v)} error={errors.price} />
          <NumberField label="Discount (%)" value={raw.first} onChange={(v) => set("first", v)} error={errors.first} />
          <NumberField label="Second discount (%), optional" value={raw.second} onChange={(v) => set("second", v)} error={errors.second} hint="Applied to the price after the first discount. Leave empty for one discount." />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the original price and the discount to see the sale price."
          headline={result && { label: "Price you pay", value: formatMoney(result.finalPrice) }}
          rows={
            result && [
              { label: "Original price", value: formatMoney(result.original) },
              ...(result.afterFirst !== undefined ? [{ label: "After the first discount", value: formatMoney(result.afterFirst) }] : []),
              { label: "You save", value: formatMoney(result.saved) },
              { label: "Effective discount", value: percent(result.effectivePercent) },
            ]
          }
        />
      }
    />
  );
}
