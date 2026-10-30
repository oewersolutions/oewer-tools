"use client";

import { useId, type ReactNode } from "react";
import { NumberField as TextField } from "../../../components/tools/ui";
import type { SeoForm } from "../../../lib/admin/forms";

export { TextField };
export { SelectField, TextAreaField } from "../../../components/tools/ui";

export const primaryButton = "rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-50";
export const secondaryButton = "rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50";
export const smallButton = "rounded-lg border border-brand-200 px-2.5 py-1 text-sm font-medium text-brand-800 transition hover:bg-brand-50 disabled:opacity-40";

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Pick several of a list: used for related tools, guides and tags. */
export function CheckGroup({ legend, options, selected, onChange, empty }: { legend: string; options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void; empty?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      {options.length === 0 && <p className="text-sm text-slate-700">{empty ?? "Nothing to choose from yet."}</p>}
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {options.map((o) => (
          <Checkbox key={o.value} label={o.label} checked={selected.includes(o.value)} onChange={(on) => onChange(on ? [...selected, o.value] : selected.filter((v) => v !== o.value))} />
        ))}
      </div>
    </fieldset>
  );
}

export function FormShell({ title, onSubmit, onCancel, submitLabel, error, children }: { title: string; onSubmit: () => void; onCancel: () => void; submitLabel: string; error?: string; children: ReactNode }) {
  const id = useId();
  return (
    <form
      aria-labelledby={`${id}-t`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6 rounded-xl border border-gold-500/40 bg-cream p-5"
    >
      <h3 id={`${id}-t`} className="font-display text-xl font-semibold text-ink">
        {title}
      </h3>
      {children}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={primaryButton}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-brand-100 pt-5">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-600">{title}</h4>
      {children}
    </section>
  );
}

/** The search-result fields, with counters for the length limits. */
export function SeoFields({ value, onChange, defaults }: { value: SeoForm; onChange: (v: SeoForm) => void; defaults?: { title: string; description: string } }) {
  const set = (patch: Partial<SeoForm>) => onChange({ ...value, ...patch });
  return (
    <Section title="Search results (SEO)">
      <p className="text-sm text-slate-700">Leave all of this empty to use the page&rsquo;s own title and description{defaults ? `: “${defaults.title}”` : ""}.</p>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Search title" value={value.meta_title} onChange={(v) => set({ meta_title: v })} hint={`${value.meta_title.length} of 70 characters`} />
        <TextField label="Canonical address (optional)" value={value.canonical_url} onChange={(v) => set({ canonical_url: v })} hint="Only when this page is a copy of another address." />
        <div className="md:col-span-2">
          <TextField label="Search description" value={value.meta_description} onChange={(v) => set({ meta_description: v })} hint={`${value.meta_description.length} of 170 characters`} />
        </div>
      </div>
      <Checkbox label="Keep this page out of search engines (noindex)" checked={value.noindex} onChange={(v) => set({ noindex: v })} />
    </Section>
  );
}
