"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checkRandom,
  drawNumbers,
  type NumberKind,
  type RandomDraw,
  type RandomRaw,
} from "../../lib/tools/random";
import {
  CopyButton,
  NumberField,
  Results,
  SelectField,
  ToolLayout,
} from "./ui";

const browserRandom = (buffer: Uint32Array) => {
  crypto.getRandomValues(buffer);
};

export default function RandomNumberGenerator() {
  const [raw, setRaw] = useState<RandomRaw>({
    min: "1",
    max: "100",
    count: "5",
    kind: "integer",
    places: "2",
    unique: "no",
  });
  const [draw, setDraw] = useState<RandomDraw | null>(null);
  const set = (key: keyof RandomRaw, value: string) =>
    setRaw((r) => ({ ...r, [key]: value }));
  const { errors, options } = checkRandom(raw);

  // The numbers are made in the browser after the page loads, and again when the choices change or "Generate" is pressed.
  const make = useCallback(() => {
    setDraw(options ? drawNumbers(options, browserRandom) : null);
  }, [
    options?.min,
    options?.max,
    options?.count,
    options?.kind,
    options?.places,
    options?.unique,
  ]);
  useEffect(make, [make]);

  const decimal = raw.kind === "decimal";
  const text = (n: number) =>
    decimal ? n.toFixed(options?.places ?? 2) : String(n);
  const list = draw && options ? draw.values.map(text) : [];

  return (
    <ToolLayout
      dark
      workings={draw?.workings}
      inputs={
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Lowest number"
              value={raw.min}
              onChange={(v) => set("min", v)}
              error={errors.min}
            />
            <NumberField
              label="Highest number"
              value={raw.max}
              onChange={(v) => set("max", v)}
              error={errors.max}
            />
          </div>
          <NumberField
            label="How many"
            value={raw.count}
            onChange={(v) => set("count", v)}
            error={errors.count}
            hint="Up to 1,000 at a time."
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Kind of number"
              value={raw.kind}
              onChange={(v: NumberKind) => set("kind", v)}
              options={[
                { value: "integer", label: "Whole numbers" },
                { value: "decimal", label: "Decimals" },
              ]}
            />
            <SelectField
              label="Repeats"
              value={raw.unique}
              onChange={(v: "yes" | "no") => set("unique", v)}
              options={[
                { value: "no", label: "Allowed" },
                { value: "yes", label: "Not allowed" },
              ]}
            />
          </div>
          {decimal && (
            <NumberField
              label="Decimal places"
              value={raw.places}
              onChange={(v) => set("places", v)}
              error={errors.places}
              hint="From 1 to 6."
            />
          )}
          <button
            type="button"
            onClick={make}
            disabled={!options}
            className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            Generate
          </button>
        </>
      }
      results={
        <>
          <Results
            emptyMessage="Choose a range and how many numbers you want."
            headline={
              draw
                ? {
                    label:
                      list.length === 1
                        ? "Your number"
                        : `Your ${list.length.toLocaleString("en-IN")} numbers`,
                    value:
                      list.length === 1
                        ? list[0]!
                        : list.slice(0, 3).join(", ") +
                          (list.length > 3 ? "…" : ""),
                  }
                : undefined
            }
          />
          {draw && list.length > 1 && (
            <>
              <p
                tabIndex={0}
                aria-label="All the numbers drawn"
                className="mt-4 max-h-48 overflow-auto break-words rounded-xl bg-white/10 px-4 py-3 text-sm text-white"
              >
                {list.join(", ")}
              </p>
              <div className="mt-3">
                <CopyButton
                  text={list.join(", ")}
                  label="Copy the numbers"
                  insideStatus
                />
              </div>
            </>
          )}
        </>
      }
    />
  );
}
