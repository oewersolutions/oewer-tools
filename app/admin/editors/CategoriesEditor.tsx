"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { idAllocator, planRows, planSeo, readSeo, type SeoForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import { slugify } from "../../../lib/posts";
import { schema, type WorkbookData } from "../../../lib/workbook";
import { RecordList } from "../views";
import { Checkbox, FormShell, primaryButton, SeoFields, TextAreaField, TextField } from "./parts";

type Kind = "tool" | "blog";
const SHEET: Record<Kind, "tool_categories" | "blog_categories"> = { tool: "tool_categories", blog: "blog_categories" };

export default function CategoriesEditor({ data, onApply }: { data: WorkbookData; onApply: (changes: Change[]) => void }) {
  const [kind, setKind] = useState<Kind>("tool");
  const [editing, setEditing] = useState<string | null>(null);
  const sheet = SHEET[kind];
  const rows = toRows(data, sheet, schema.sheets[sheet]!);

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Kind of category" className="flex gap-2">
        {(["tool", "blog"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setEditing(null); }} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === k ? "bg-brand text-white" : "bg-brand-50 text-brand-800 hover:bg-brand-100"}`}>
            {k === "tool" ? "Tool categories" : "Article categories"}
          </button>
        ))}
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

      {!editing && (
        <RecordList
          title={kind === "tool" ? "Tool categories" : "Article categories"}
          action={
            <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
              Add category
            </button>
          }
          columns={kind === "tool" ? ["Name", "Address", "Shown"] : ["Name", "Address"]}
          rows={rows.map((r) => ({
            key: r.id,
            label: `Edit category ${cellString(r.values.name)}`,
            search: `${cellString(r.values.name)} ${cellString(r.values.slug)}`,
            cells: [cellString(r.values.name), `/${cellString(r.values.slug)}`, ...(kind === "tool" ? [r.values.enabled === true ? "Yes" : "Hidden"] : [])],
            onOpen: () => setEditing(r.id),
          }))}
        />
      )}
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
    <FormShell title={row ? `Edit category ${cellString(row.values.name)}` : kind === "tool" ? "Add a tool category" : "Add an article category"} onSubmit={save} onCancel={onCancel} listLabel={kind === "tool" ? "Tool categories" : "Article categories"} error={error}>
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
