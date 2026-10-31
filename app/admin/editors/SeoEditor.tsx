"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { planSeo, readSeo, type SeoEntity, type SeoForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import type { WorkbookData } from "../../../lib/workbook";
import { schema } from "../../../lib/workbook";
import { FormShell, SeoFields, smallButton } from "./parts";

const KINDS: { type: SeoEntity; sheet: string; label: string; name: string }[] = [
  { type: "page", sheet: "pages", label: "Pages", name: "title" },
  { type: "tool", sheet: "tools", label: "Tools", name: "name" },
  { type: "tool_category", sheet: "tool_categories", label: "Tool categories", name: "name" },
  { type: "post", sheet: "posts", label: "Articles", name: "title" },
  { type: "blog_category", sheet: "blog_categories", label: "Article categories", name: "name" },
];

export default function SeoEditor({ data, onApply }: { data: WorkbookData; onApply: (changes: Change[]) => void }) {
  const [editing, setEditing] = useState<{ type: SeoEntity; id: string; name: string } | null>(null);
  const entries = KINDS.flatMap((k) => toRows(data, k.sheet, schema.sheets[k.sheet]!).map((r) => ({ ...k, id: r.id, title: cellString(r.values[k.name]) })));

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-slate-700">How each page appears in search results. Pages without custom text use their own title and description. Custom text must have both a title (up to 70 characters) and a description (up to 170).</p>
      {editing && <SeoForm key={`${editing.type}:${editing.id}`} data={data} {...editing} onCancel={() => setEditing(null)} onSave={(c) => { onApply(c); setEditing(null); }} />}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Search settings for every page</caption>
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Kind", "Page", "Search settings", ""].map((h, i) => (
                <th key={i} scope="col" className="border-b border-slate-200 px-4 py-3 font-semibold">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const seo = readSeo(data, e.type, e.id);
              const custom = seo.meta_title !== "" || seo.meta_description !== "";
              return (
                <tr key={`${e.type}:${e.id}`} className="border-t border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3">{e.label.replace(/s$/, "")}</td>
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3">{seo.noindex ? "Hidden from search" : custom ? "Custom" : "Default"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className={smallButton} aria-label={`Edit search settings for ${e.title}`} onClick={() => setEditing({ type: e.type, id: e.id, name: e.title })}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeoForm({ data, type, id, name, onSave, onCancel }: { data: WorkbookData; type: SeoEntity; id: string; name: string; onSave: (c: Change[]) => void; onCancel: () => void }) {
  const [seo, setSeo] = useState<SeoForm>(() => readSeo(data, type, id));
  return (
    <FormShell title={`Search settings for ${name}`} onSubmit={() => onSave(planSeo(data, type, id, seo))} onCancel={onCancel} submitLabel="Update pending changes">
      <SeoFields value={seo} onChange={setSeo} defaults={{ title: name, description: "" }} />
    </FormShell>
  );
}
