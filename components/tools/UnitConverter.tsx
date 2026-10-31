"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_UNITS, evaluateConverter, formatQuantity, unitsOf, type ConverterRaw, type UnitCategory } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function UnitConverter() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [fromId, setFromId] = useState("m");
  const [toId, setToId] = useState("ft");
  const [raw, setRaw] = useState<ConverterRaw>({ value: "" });
  const units = unitsOf(category);
  const options = units.map((u) => ({ value: u.id, label: `${u.label} (${u.symbol})` }));

  function changeCategory(next: UnitCategory) {
    setCategory(next);
    setFromId(DEFAULT_UNITS[next][0]);
    setToId(DEFAULT_UNITS[next][1]);
  }

  const { errors, result } = evaluateConverter(category, fromId, raw);
  const fromSymbol = units.find((u) => u.id === fromId)?.symbol ?? "";
  const to = result?.all.find((r) => r.unit.id === toId);

  return (
    <ToolLayout
      dark
      inputs={
        <>
          <SelectField label="Measure" value={category} onChange={changeCategory} options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} />
          <NumberField label="Value" value={raw.value} onChange={(v) => setRaw({ value: v })} error={errors.value} placeholder="1" />
          <SelectField label="From" value={fromId} onChange={setFromId} options={options} />
          <SelectField label="To" value={toId} onChange={setToId} options={options} />
        </>
      }
      results={
        <Results
          emptyMessage="Enter a value to see it in every unit."
          headline={result && to && { label: `${formatQuantity(Number(raw.value.replace(/[,\s]/g, "")))} ${fromSymbol} equals`, value: `${formatQuantity(to.value)} ${to.unit.symbol}` }}
          rows={result?.all.filter((r) => r.unit.id !== toId).map((r) => ({ label: r.unit.label, value: `${formatQuantity(r.value)} ${r.unit.symbol}` }))}
        />
      }
    />
  );
}
