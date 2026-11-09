"use client";

import { useState } from "react";
import {
  evaluateConcrete,
  MIXES,
  type ConcreteRaw,
  type LengthUnit,
  type MixKey,
  type Shape,
} from "../../lib/tools/concrete";
import { formatQuantity as q } from "../../lib/tools/units";
import { NumberField, Results, SelectField, ToolLayout } from "./ui";

export default function ConcreteCalculator() {
  const [raw, setRaw] = useState<ConcreteRaw>({
    shape: "box",
    unit: "m",
    length: "5",
    width: "4",
    depth: "0.15",
    diameter: "0.4",
    height: "3",
    count: "1",
    waste: "5",
    mix: "m20",
  });
  const set = (key: keyof ConcreteRaw, value: string) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, result } = evaluateConcrete(raw);
  const u = raw.unit === "m" ? "m" : "ft";

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Shape"
              value={raw.shape}
              onChange={(v: Shape) => set("shape", v)}
              options={[
                { value: "box", label: "Slab, beam or footing" },
                { value: "round", label: "Round column" },
              ]}
            />
            <SelectField
              label="Measured in"
              value={raw.unit}
              onChange={(v: LengthUnit) => set("unit", v)}
              options={[
                { value: "m", label: "Metres" },
                { value: "ft", label: "Feet" },
              ]}
            />
          </div>
          {raw.shape === "box" ? (
            <>
              <NumberField
                label={`Length (${u})`}
                value={raw.length}
                onChange={(v) => set("length", v)}
                error={errors.length}
              />
              <NumberField
                label={`Width (${u})`}
                value={raw.width}
                onChange={(v) => set("width", v)}
                error={errors.width}
              />
              <NumberField
                label={`Depth or thickness (${u})`}
                value={raw.depth}
                onChange={(v) => set("depth", v)}
                error={errors.depth}
                hint="A 6 inch slab is 0.5 ft; a 150 mm slab is 0.15 m."
              />
            </>
          ) : (
            <>
              <NumberField
                label={`Diameter (${u})`}
                value={raw.diameter}
                onChange={(v) => set("diameter", v)}
                error={errors.diameter}
              />
              <NumberField
                label={`Height (${u})`}
                value={raw.height}
                onChange={(v) => set("height", v)}
                error={errors.height}
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Number of pieces"
              value={raw.count}
              onChange={(v) => set("count", v)}
              error={errors.count}
            />
            <NumberField
              label="Wastage (%)"
              value={raw.waste}
              onChange={(v) => set("waste", v)}
              error={errors.waste}
            />
          </div>
          <SelectField
            label="Mix"
            value={raw.mix}
            onChange={(v: MixKey) => set("mix", v)}
            options={(Object.keys(MIXES) as MixKey[]).map((k) => ({
              value: k,
              label: MIXES[k].label,
            }))}
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter the size of the concrete work."
          headline={
            result && {
              label: "Cement needed",
              value: `${q(Number(result.bags.toFixed(1)))} bags`,
            }
          }
          rows={
            result && [
              {
                label: "Concrete volume",
                value: `${q(Number(result.wetM3.toPrecision(5)))} m³`,
              },
              {
                label: "With wastage",
                value: `${q(Number(result.withWasteM3.toPrecision(5)))} m³`,
              },
              {
                label: "Cement (50 kg bags)",
                value: `${q(Math.round(result.cementKg))} kg`,
              },
              {
                label: "Sand",
                value: `${q(Number(result.sandM3.toPrecision(4)))} m³`,
              },
              {
                label: "Coarse aggregate",
                value: `${q(Number(result.aggregateM3.toPrecision(4)))} m³`,
              },
            ]
          }
        />
      }
    />
  );
}
