"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { idAllocator, planRows, planSeo, readSeo, type SeoForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import { slugify } from "../../../lib/posts";
import { schema, type WorkbookData } from "../../../lib/workbook";
import { Checkbox, FormShell, primaryButton, SeoFields, smallButton, TextAreaField, TextField } from "./parts";

type Kind = "tool" | "blog";
const SHEET: Record<Kind, "tool_categories" | "blog_categories"> = { tool: "tool_categories", blog: "blog_categories" };

export default function CategoriesEditor({ data, onApply }: { data: WorkbookData; onApply: (changes: Change[]) => void }) {
  const [kind, setKind] = useState<Kind>("tool");
  const [editing, setEditing] = useState<string | null>(null);
  const sheet = SHEET[kind];
  const rows = toRows(data, sheet, schema.sheets[sheet]!);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Kind of category" className="flex gap-2">
          {(["tool", "blog"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setEditing(null); }} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === k ? "bg-brand text-white" : "bg-brand-50 text-brand-800 hover:bg-brand-100"}`}>
              {k === "tool" ? "Tool categories" : "Article categories"}
            </button>
          ))}
        </div>
        <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
          Add category
        </button>
      </div>

      {editing && (
        <CategoryForm
          key={`${kind}-${editing}`}
          data={data}
          kind={kind}
          categoryId={editing === "new" ? "" : editing}
          onCancel={() => setEditing(null)}
          onSave={(changes) => {
            onApply(changes);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-100">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{kind === "tool" ? "Tool categories" : "Article categories"}</caption>
          <thead className="bg-brand-50 text-brand-900">
            <tr>
              {["Name", "Address", kind === "tool" ? "Shown" : "", ""].map((h, i) => (
                <th key={i} scope="col" className="px-3 py-2 font-semibold">
                  {h || <span className="sr-only">{i === 3 ? "Actions" : "Details"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-brand-100">
                <td className="px-3 py-2 font-medium">{cellString(r.values.name)}</td>
                <td className="px-3 py-2">/{cellString(r.values.slug)}</td>
                <td className="px-3 py-2">{kind === "tool" ? (r.values.enabled === true ? "Yes" : "Hidden") : ""}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className={smallButton} aria-label={`Edit category ${cellString(r.values.name)}`} onClick={() => setEditing(r.id)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryForm({ data, kind, categoryId, onSave, onCancel }: { data: WorkbookData; kind: Kind; categoryId: string; onSave: (c: Change[]) => void; onCancel: () => void }) {
  const sheet = SHEET[kind];
  const row = toRows(data, sheet, schema.sheets[sheet]!).find((r) => r.id === categoryId);
  const [name, setName] = useState(cellString(row?.values.name));
  const [slug, setSlug] = useState(cellString(row?.values.slug));
  const [slugTouched, setSlugTouched] = useState(Boolean(row));
  const [description, setDescription] = useState(cellString(row?.values.description));
  const [order, setOrder] = useState(cellString(row?.values.sort_order) || "1");
  const [enabled, setEnabled] = useState(row ? row.values.enabled === true : true);
  const entity = kind === "tool" ? "tool_category" : "blog_category";
  const [seo, setSeo] = useState<SeoForm>(() => readSeo(data, entity, categoryId));
  const [error, setError] = useState<string>();

  function save() {
    const finalSlug = slug || slugify(name);
    if (!name.trim()) return setError("Give the category a name.");
    if (!finalSlug) return setError("The address needs at least one letter or number.");
    if (kind === "tool" && !/^\d+$/.test(order)) return setError("Order must be a whole number.");
    const id = categoryId || idAllocator(data, sheet)();
    const values: Record<string, string> = { category_id: id, name: name.trim(), slug: finalSlug, description };
    if (kind === "tool") Object.assign(values, { sort_order: order, enabled: enabled ? "true" : "false" });
    onSave([...planRows(sheet, row ? [row] : [], [values], true), ...planSeo(data, entity, id, seo)]);
  }

  return (
    <FormShell title={row ? `Edit category ${cellString(row.values.name)}` : kind === "tool" ? "Add a tool category" : "Add an article category"} onSubmit={save} onCancel={onCancel} submitLabel="Update pending changes" error={error}>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Name" value={name} onChange={(v) => { setName(v); if (!slugTouched) setSlug(slugify(v)); }} />
        <TextField label="Page address (slug)" value={slug} onChange={(v) => { setSlugTouched(true); setSlug(v); }} hint="Lowercase letters, numbers and hyphens." />
        <div className="md:col-span-2">
          <TextAreaField label="Description" value={description} onChange={setDescription} rows={3} />
        </div>
        {kind === "tool" && (
          <>
            <TextField label="Order" value={order} onChange={setOrder} />
            <div className="self-end pb-2">
              <Checkbox label="Show this category on the site" checked={enabled} onChange={setEnabled} />
            </div>
          </>
        )}
      </div>
      <SeoFields value={seo} onChange={setSeo} defaults={{ title: name, description }} />
    </FormShell>
  );
}
