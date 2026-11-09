"use client";

import { useId, useState } from "react";
import {
  evaluateExpression,
  MAX_LENGTH,
  type AngleMode,
} from "../../lib/tools/expression";
import { CopyButton, Results, SelectField, ToolLayout } from "./ui";

/** [what the key shows, what it types, what a screen reader calls it] */
type Key = [label: string, insert: string, name?: string];

const FUNCTION_KEYS: Key[] = [
  ["sin", "sin("],
  ["cos", "cos("],
  ["tan", "tan("],
  ["ln", "ln("],
  ["log", "log("],
  ["√", "sqrt(", "square root"],
  ["x^y", "^"],
  ["x!", "!"],
  ["π", "pi", "pi"],
  ["e", "e", "Euler's number e"],
  ["(", "(", "open bracket"],
  [")", ")", "close bracket"],
];

const PAD_KEYS: Key[] = [
  ["7", "7"],
  ["8", "8"],
  ["9", "9"],
  ["÷", "÷", "divide"],
  ["4", "4"],
  ["5", "5"],
  ["6", "6"],
  ["×", "×", "multiply"],
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["−", "−", "minus"],
  ["0", "0"],
  [".", ".", "decimal point"],
  ["%", "%", "percent"],
  ["+", "+", "plus"],
];

const keyClass =
  "min-h-11 rounded-lg border border-slate-300 bg-white px-1 py-2 text-base font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-offset-2";

export default function ScientificCalculator() {
  const [expression, setExpression] = useState("2 + 3 × 4");
  const [mode, setMode] = useState<AngleMode>("deg");
  const id = useId();
  const { error, result } = evaluateExpression(expression, mode);
  const add = (text: string) =>
    setExpression((e) => (e.length + text.length <= MAX_LENGTH ? e + text : e));

  const key = ([label, insert, name]: Key) => (
    <button
      key={label}
      type="button"
      aria-label={name}
      onClick={() => add(insert)}
      className={keyClass}
    >
      {label}
    </button>
  );

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <div>
            <label
              htmlFor={id}
              className="block text-sm font-semibold text-slate-800"
            >
              Expression
            </label>
            <input
              id={id}
              type="text"
              value={expression}
              onChange={(e) =>
                setExpression(e.target.value.slice(0, MAX_LENGTH))
              }
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
              className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base text-slate-900 shadow-sm transition focus:border-brand-500 aria-[invalid=true]:border-red-700"
            />
            <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
              Type it, or use the keys. For example 2(3 + 4)^2, sin(30) or
              sqrt(16).
            </p>
            {error && (
              <p id={`${id}-error`} className="mt-1 text-sm text-red-800">
                {error}
              </p>
            )}
          </div>
          <SelectField
            label="Angles"
            value={mode}
            onChange={(v: AngleMode) => setMode(v)}
            options={[
              { value: "deg", label: "Degrees" },
              { value: "rad", label: "Radians" },
            ]}
          />
          <div
            role="group"
            aria-label="Function keys"
            className="grid grid-cols-4 gap-2"
          >
            {FUNCTION_KEYS.map(key)}
          </div>
          <div
            role="group"
            aria-label="Number keys"
            className="grid grid-cols-4 gap-2"
          >
            {PAD_KEYS.map(key)}
            <button
              type="button"
              onClick={() => setExpression("")}
              className={`${keyClass} col-span-2`}
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setExpression((e) => e.slice(0, -1))}
              aria-label="Backspace"
              className={keyClass}
            >
              ⌫
            </button>
            {key([",", ",", "comma"])}
          </div>
        </>
      }
      results={
        <>
          <Results
            emptyMessage={
              error
                ? "Fix the expression to see the answer."
                : "Type an expression to see the answer."
            }
            headline={result && { label: "Answer", value: result.text }}
          />
          {result && (
            <div className="mt-4">
              <CopyButton
                text={String(Number(result.value.toPrecision(12)))}
                label="Copy the answer"
                insideStatus
              />
            </div>
          )}
        </>
      }
    />
  );
}
