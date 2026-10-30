"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { idAllocator, planRows, planSeo, planToolContent, readSeo, readToolContent, type SeoForm, type ToolContentForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import { slugify } from "../../../lib/posts";
import { TOOL_COMPONENT_KEYS } from "../../../lib/tools/keys";
import { schema, type WorkbookData } from "../../../lib/workbook";
import { Checkbox, CheckGroup, FormShell, primaryButton, Section, SelectField, SeoFields, smallButton, TextAreaField, TextField } from "./parts";

interface ToolFields {
  name: string;
  slug: string;
  category_id: string;
  component_key: string;
  status: string;
  featured: boolean;
  sort_order: string;
  description: string;
}

export default function ToolsEditor({ data, onApply }: { data: WorkbookData; onApply: (changes: Change[]) => void }) {
  const tools = toRows(data, "tools", schema.sheets.tools!);
  const categories = toRows(data, "tool_categories", schema.sheets.tool_categories!);
  const [editing, setEditing] = useState<string | null>(null); // a tool ID, or "new"
  const categoryName = (id: string) => cellString(categories.find((c) => c.id === id)?.values.name) || id;
  const usedKeys = new Set(tools.map((t) => cellString(t.values.component_key)));
  const freeKeys = TOOL_COMPONENT_KEYS.filter((k) => !usedKeys.has(k));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-700">The tools on the site. Each has a page with the tool, a how-to, examples, questions and links to related tools and guides.</p>
        <button type="button" className={primaryButton} onClick={() => setEditing("new")} disabled={freeKeys.length === 0} title={freeKeys.length === 0 ? "Every tool component that exists is already in use" : undefined}>
          Add tool
        </button>
      </div>
      {freeKeys.length === 0 && <p className="text-sm text-slate-700">Every tool component built so far is in use. A developer adds a new component in code first; then it can be added here.</p>}

      {editing && (
        <ToolForm
          key={editing}
          data={data}
          toolId={editing === "new" ? "" : editing}
          freeKeys={freeKeys}
          onCancel={() => setEditing(null)}
          onSave={(changes) => {
            onApply(changes);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-100">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tools</caption>
          <thead className="bg-brand-50 text-brand-900">
            <tr>
              {["Tool", "Category", "Status", ""].map((h, i) => (
                <th key={i} scope="col" className="px-3 py-2 font-semibold">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.id} className="border-t border-brand-100">
                <td className="px-3 py-2 font-medium">{cellString(t.values.name)}</td>
                <td className="px-3 py-2">{categoryName(cellString(t.values.category_id))}</td>
                <td className="px-3 py-2">{cellString(t.values.status)}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className={smallButton} aria-label={`Edit tool ${cellString(t.values.name)}`} onClick={() => setEditing(t.id)}>
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

function ToolForm({ data, toolId, freeKeys, onSave, onCancel }: { data: WorkbookData; toolId: string; freeKeys: string[]; onSave: (c: Change[]) => void; onCancel: () => void }) {
  const row = toRows(data, "tools", schema.sheets.tools!).find((r) => r.id === toolId);
  const categories = toRows(data, "tool_categories", schema.sheets.tool_categories!);
  const otherTools = toRows(data, "tools", schema.sheets.tools!).filter((r) => r.id !== toolId);
  const posts = toRows(data, "posts", schema.sheets.posts!);
  const [f, setF] = useState<ToolFields>({
    name: cellString(row?.values.name),
    slug: cellString(row?.values.slug),
    category_id: cellString(row?.values.category_id) || categories[0]?.id || "",
    component_key: cellString(row?.values.component_key) || freeKeys[0] || "",
    status: cellString(row?.values.status) || "draft",
    featured: row?.values.featured === true,
    sort_order: cellString(row?.values.sort_order) || "1",
    description: cellString(row?.values.description),
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(row));
  const [content, setContent] = useState<ToolContentForm>(() => readToolContent(data, toolId));
  const [seo, setSeo] = useState<SeoForm>(() => readSeo(data, "tool", toolId));
  const [error, setError] = useState<string>();
  const set = (patch: Partial<ToolFields>) => setF((s) => ({ ...s, ...patch }));
  const keys = [...new Set([...(row ? [f.component_key] : []), ...freeKeys])];

  function save() {
    const slug = f.slug || slugify(f.name);
    if (!f.name.trim()) return setError("Give the tool a name.");
    if (!slug) return setError("The address needs at least one letter or number.");
    if (!f.category_id) return setError("Choose a category.");
    if (!f.component_key) return setError("Choose the tool component.");
    if (!/^\d+$/.test(f.sort_order)) return setError("Order must be a whole number.");
    const id = toolId || idAllocator(data, "tools")();
    const values = {
      tool_id: id,
      category_id: f.category_id,
      name: f.name.trim(),
      slug,
      description: f.description,
      component_key: f.component_key,
      status: f.status,
      featured: f.featured ? "true" : "false",
      sort_order: f.sort_order,
    };
    onSave([...planRows("tools", row ? [row] : [], [values], true), ...planToolContent(data, id, content), ...planSeo(data, "tool", id, seo)]);
  }

  return (
    <FormShell title={row ? `Edit tool ${cellString(row.values.name)}` : "Add a tool"} onSubmit={save} onCancel={onCancel} submitLabel="Update pending changes" error={error}>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Name" value={f.name} onChange={(v) => set({ name: v, ...(slugTouched ? {} : { slug: slugify(v) }) })} />
        <TextField label="Page address (slug)" value={f.slug} onChange={(v) => { setSlugTouched(true); set({ slug: v }); }} hint="Lowercase letters, numbers and hyphens. Changing it breaks old links." />
        <SelectField label="Category" value={f.category_id} onChange={(v) => set({ category_id: v })} options={categories.map((c) => ({ value: c.id, label: cellString(c.values.name) }))} />
        <SelectField label="Tool component" value={f.component_key} onChange={(v) => set({ component_key: v })} options={keys.map((k) => ({ value: k, label: k }))} />
        <SelectField label="Status" value={f.status} onChange={(v) => set({ status: v })} options={(schema.enums.status ?? []).map((s) => ({ value: s, label: s }))} />
        <TextField label="Order within its category" value={f.sort_order} onChange={(v) => set({ sort_order: v })} />
        <div className="md:col-span-2">
          <TextAreaField label="Short description" value={f.description} onChange={(v) => set({ description: v })} rows={2} />
        </div>
        <Checkbox label="Feature on the home page" checked={f.featured} onChange={(v) => set({ featured: v })} />
      </div>

      <Section title="How to use (shown under the tool)">
        <TextAreaField label="How-to text" value={content.help} onChange={(v) => setContent({ ...content, help: v })} rows={6} />
        <p className="text-xs text-slate-600">Use a sentence first, then a list with “- ” at the start of each line. A heading line starts with “# ”.</p>
      </Section>

      <Section title="Examples">
        {content.examples.map((e, i) => (
          <fieldset key={i} className="grid gap-3 rounded-lg bg-white p-3 md:grid-cols-[1fr_2fr_auto]">
            <legend className="sr-only">Example {i + 1}</legend>
            <TextField label={`Example ${i + 1} title`} value={e.title} onChange={(v) => setContent({ ...content, examples: content.examples.map((x, n) => (n === i ? { ...x, title: v } : x)) })} />
            <TextField label={`Example ${i + 1} text`} value={e.text} onChange={(v) => setContent({ ...content, examples: content.examples.map((x, n) => (n === i ? { ...x, text: v } : x)) })} />
            <button type="button" className={`${smallButton} self-end`} onClick={() => setContent({ ...content, examples: content.examples.filter((_, n) => n !== i) })}>
              Remove example {i + 1}
            </button>
          </fieldset>
        ))}
        <button type="button" className={smallButton} onClick={() => setContent({ ...content, examples: [...content.examples, { title: "", text: "" }] })} disabled={content.examples.length >= 10}>
          Add example
        </button>
      </Section>

      <Section title="Questions and answers">
        {content.faq.map((q, i) => (
          <fieldset key={i} className="grid gap-3 rounded-lg bg-white p-3 md:grid-cols-[1fr_2fr_auto]">
            <legend className="sr-only">Question {i + 1}</legend>
            <TextField label={`Question ${i + 1}`} value={q.q} onChange={(v) => setContent({ ...content, faq: content.faq.map((x, n) => (n === i ? { ...x, q: v } : x)) })} />
            <TextField label={`Answer ${i + 1}`} value={q.a} onChange={(v) => setContent({ ...content, faq: content.faq.map((x, n) => (n === i ? { ...x, a: v } : x)) })} />
            <button type="button" className={`${smallButton} self-end`} onClick={() => setContent({ ...content, faq: content.faq.filter((_, n) => n !== i) })}>
              Remove question {i + 1}
            </button>
          </fieldset>
        ))}
        <button type="button" className={smallButton} onClick={() => setContent({ ...content, faq: [...content.faq, { q: "", a: "" }] })} disabled={content.faq.length >= 10}>
          Add question
        </button>
      </Section>

      <Section title="Links">
        <CheckGroup legend="Related tools" options={otherTools.map((t) => ({ value: t.id, label: cellString(t.values.name) }))} selected={content.related} onChange={(v) => setContent({ ...content, related: v })} />
        <CheckGroup legend="Guides about this tool" options={posts.map((p) => ({ value: p.id, label: cellString(p.values.title) }))} selected={content.guides} onChange={(v) => setContent({ ...content, guides: v })} empty="There are no articles yet." />
      </Section>

      <SeoFields value={seo} onChange={setSeo} defaults={{ title: f.name, description: f.description }} />
    </FormShell>
  );
}
