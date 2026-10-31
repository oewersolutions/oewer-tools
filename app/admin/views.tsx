"use client";

import type { ReactNode } from "react";

/**
 * Building blocks for the admin's list views and form views, laid out like a business app: a header with the breadcrumb,
 * a pager and the main buttons, a plain table with one row per record, and a form with labels on the left and values on the
 * right inside white cards.
 */

export const PRIMARY_BUTTON = "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50";
export const TOOLBAR_BUTTON = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50";
export const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

const TONE = { good: "bg-brand-100 text-brand-900", warn: "bg-gold-300/50 text-ink", bad: "bg-red-100 text-red-900", muted: "bg-slate-100 text-slate-700", info: "bg-sky-100 text-sky-900" } as const;
export function StatusPill({ tone = "muted", children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>;
}
/** The pill colour for the common status words in the workbook. */
export function toneFor(value: string): keyof typeof TONE {
  if (/^(published|active|true|live|enabled)$/i.test(value)) return "good";
  if (/^(draft|pending|scheduled)$/i.test(value)) return "warn";
  if (/^(archived|false|disabled|hidden)$/i.test(value)) return "muted";
  return "info";
}

export function TH({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`whitespace-nowrap border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>
      {children}
    </th>
  );
}
export function TR({ children, marked }: { children: ReactNode; marked?: boolean }) {
  return <tr className={`border-b border-slate-100 transition hover:bg-slate-50 ${marked ? "bg-gold-300/20" : ""}`}>{children}</tr>;
}
export function TD({ children, colSpan, title, className = "" }: { children?: ReactNode; colSpan?: number; title?: string; className?: string }) {
  return (
    <td colSpan={colSpan} title={title} className={`max-w-xs px-4 py-3 align-middle text-slate-800 ${className}`}>
      {children}
    </td>
  );
}

/** A list view: a white panel with a title bar (title, search, main button) above the table. */
export function ListShell({ title, subtitle, action, toolbar, footer, children }: { title: string; subtitle?: string; action?: ReactNode; toolbar?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="max-w-2xl text-sm text-slate-600">{subtitle}</p>}
        </div>
        {action}
      </div>
      {toolbar && <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">{toolbar}</div>}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${title} rows`}>
        {children}
      </div>
      {footer && <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-sm text-slate-700">{footer}</div>}
    </section>
  );
}

/** The top of a form view: breadcrumb, record title, and the buttons for what to do with the record. */
export function FormHeader({ trail, title, actions, status }: { trail: { label: string; onClick?: () => void }[]; title: string; actions?: ReactNode; status?: ReactNode }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
        {trail.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {t.onClick ? (
              <button type="button" onClick={t.onClick} className="font-medium text-brand-700 hover:underline">
                {t.label}
              </button>
            ) : (
              <span aria-current="page" className="font-medium text-slate-900">
                {t.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
        <div className="ml-auto">{status}</div>
        <h2 className="sr-only">{title}</h2>
      </div>
    </div>
  );
}

/** One block of a form: a small heading and rows of label + value. */
export function FormGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      {title && <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>}
      {children}
    </fieldset>
  );
}
export function FormRow({ id, label, hint, children, wide }: { id: string; label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`grid gap-1.5 text-sm sm:items-start ${wide ? "" : "sm:grid-cols-[11rem_1fr] sm:gap-4"}`}>
      <label htmlFor={id} className="pt-2 font-medium text-slate-700">
        {label}
      </label>
      <div className="block">
        {children}
        {hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** "3 / 34" with previous and next, as on a record. */
export function RecordPager({ index, total, onPrev, onNext }: { index: number; total: number; onPrev?: () => void; onNext?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700" role="group" aria-label="Record">
      <span aria-live="polite">
        {index} / {total}
      </span>
      <button type="button" className={TOOLBAR_BUTTON} onClick={onPrev} disabled={!onPrev} aria-label="Previous record">
        ‹
      </button>
      <button type="button" className={TOOLBAR_BUTTON} onClick={onNext} disabled={!onNext} aria-label="Next record">
        ›
      </button>
    </div>
  );
}
