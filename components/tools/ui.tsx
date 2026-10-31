"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { useReportResult } from "./ToolEvents";

const control =
  "mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition focus:border-brand-500 aria-[invalid=true]:border-red-700";

export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const describedBy =
    [error ? `${id}-error` : "", hint ? `${id}-hint` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={control}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

/** A calendar date picked with the browser's own date control. The value is "YYYY-MM-DD", or empty until a full date is chosen. */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const describedBy =
    [error ? `${id}-error` : "", hint ? `${id}-hint` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        min="1900-01-01"
        max="2200-12-31"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={control}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={control}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const ToneContext = createContext(false);

/**
 * The tool's two panels: the inputs, and the result. Calculators pass `dark` for a dark result panel with the answer
 * in large white type; tools that show images or text keep a light panel.
 */
export function ToolLayout({
  inputs,
  results,
  dark = false,
}: {
  inputs: ReactNode;
  results: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="panel space-y-5 p-6 sm:p-8"
      >
        {inputs}
      </form>
      <ToneContext.Provider value={dark}>
        <div
          role="status"
          aria-live="polite"
          className={
            dark
              ? "hero-bg on-dark rounded-[1.5rem] p-6 text-white sm:p-8"
              : "panel bg-surface p-6 sm:p-8"
          }
        >
          {results}
        </div>
      </ToneContext.Provider>
    </div>
  );
}

export function Results({
  headline,
  rows,
  emptyMessage,
}: {
  headline?: { label: string; value: string };
  rows?: { label: string; value: string }[];
  emptyMessage: string;
}) {
  const dark = useContext(ToneContext);
  useReportResult(Boolean(headline));
  if (!headline)
    return (
      <p className={dark ? "text-white/80" : "text-muted"}>{emptyMessage}</p>
    );
  return (
    <dl className="space-y-3">
      <div>
        <dt className={`t-eyebrow ${dark ? "!text-white/70" : ""}`}>
          {headline.label}
        </dt>
        <dd
          className={`mt-1 text-4xl font-semibold tracking-tight sm:text-5xl ${dark ? "text-white" : "text-brand"}`}
        >
          {headline.value}
        </dd>
      </div>
      {rows?.map((r) => (
        <div
          key={r.label}
          className={`flex justify-between gap-4 border-t pt-3 text-sm ${dark ? "border-white/15" : "border-line"}`}
        >
          <dt className={dark ? "text-white/75" : "text-muted"}>{r.label}</dt>
          <dd
            className={`shrink-0 whitespace-nowrap font-medium ${dark ? "text-white" : "text-ink"}`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 10,
  placeholder,
  readOnly,
  mono,
  describedBy,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
  describedBy?: string;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        aria-describedby={describedBy}
        spellCheck={false}
        className={`${control} ${mono ? "font-mono text-sm" : ""}`}
      />
    </div>
  );
}

/** Copies text to the clipboard and says so; stays quiet if the browser blocks clipboard access. */
export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <>
      <button
        type="button"
        disabled={text === ""}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("failed");
          }
          setTimeout(() => setState("idle"), 2000);
        }}
        className="rounded-lg border border-brand px-3.5 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50"
      >
        {label}
      </button>
      <span role="status" className="ml-2 text-sm text-slate-700">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Could not copy. Select the text and copy it yourself."
            : ""}
      </span>
    </>
  );
}
