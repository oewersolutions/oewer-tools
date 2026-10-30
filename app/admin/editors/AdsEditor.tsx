"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { planAds, readAds, type AdsForm } from "../../../lib/admin/forms";
import { schema, type WorkbookData } from "../../../lib/workbook";
import { Checkbox, primaryButton, SelectField, smallButton, TextField } from "./parts";

export default function AdsEditor({ data, onApply }: { data: WorkbookData; onApply: (changes: Change[]) => void }) {
  // Start again from the workbook whenever it changes underneath (for example after discarding pending changes).
  const current = readAds(data);
  return <AdsForm key={JSON.stringify(current)} data={data} initial={current} onApply={onApply} />;
}

function AdsForm({ data, initial, onApply }: { data: WorkbookData; initial: AdsForm; onApply: (changes: Change[]) => void }) {
  const [form, setForm] = useState<AdsForm>(initial);
  const [error, setError] = useState<string>();
  const pages = schema.enums.ad_page_type ?? [];
  const update = (i: number, patch: Partial<AdsForm["placements"][number]>) => setForm({ ...form, placements: form.placements.map((p, n) => (n === i ? { ...p, ...patch } : p)) });

  function apply() {
    const keys = form.placements.map((p) => p.placement_key.trim());
    if (keys.some((k) => !k)) return setError("Every placement needs a name, like top_banner.");
    setError(undefined);
    onApply(planAds(data, { ...form, placements: form.placements.map((p) => ({ ...p, placement_key: p.placement_key.trim(), ad_unit_id: p.ad_unit_id.trim() })) }));
  }

  return (
    <form
      aria-label="Ad placements"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="space-y-6"
    >
      <p className="max-w-2xl text-sm text-slate-700">Places on the site where an ad can appear. Nothing is shown until ads are switched on below, the placement is enabled, and it has its slot number. Use only the public numeric slot ID from your ad account, never a password or key.</p>
      <div className="rounded-xl bg-brand-50 p-4">
        <Checkbox label="Show ads on the site" checked={form.adsEnabled} onChange={(v) => setForm({ ...form, adsEnabled: v })} />
      </div>

      <ul className="space-y-4">
        {form.placements.map((p, i) => (
          <li key={i}>
            <fieldset className="grid gap-4 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <legend className="px-1 text-sm font-semibold text-brand-800">Placement {i + 1}</legend>
              <TextField label={`Placement ${i + 1} name`} value={p.placement_key} onChange={(v) => update(i, { placement_key: v })} hint="Lowercase letters, numbers and underscores." />
              <SelectField label={`Placement ${i + 1} page type`} value={p.page_type} onChange={(v) => update(i, { page_type: v })} options={pages.map((t) => ({ value: t, label: t }))} />
              <TextField label={`Placement ${i + 1} slot ID`} value={p.ad_unit_id} onChange={(v) => update(i, { ad_unit_id: v })} hint="Digits only, from your ad account." />
              <div className="flex flex-col justify-end gap-2 pb-1">
                <Checkbox label={`Enable placement ${i + 1}`} checked={p.enabled} onChange={(v) => update(i, { enabled: v })} />
                <button type="button" className={smallButton} onClick={() => setForm({ ...form, placements: form.placements.filter((_, n) => n !== i) })}>
                  Remove placement {i + 1}
                </button>
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <button type="button" className={smallButton} onClick={() => setForm({ ...form, placements: [...form.placements, { ad_id: "", placement_key: "", page_type: pages[0] ?? "home", enabled: false, ad_unit_id: "" }] })}>
        Add placement
      </button>

      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className={primaryButton}>
          Update pending changes
        </button>
      </div>
    </form>
  );
}
