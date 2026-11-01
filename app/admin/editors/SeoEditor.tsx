"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import { planSeo, readSeo, type SeoEntity, type SeoForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import type { WorkbookData } from "../../../lib/workbook";
import { schema } from "../../../lib/workbook";
import { RecordList } from "../views";
import { FormShell, SeoFields } from "./parts";

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
      {editing && <SeoForm key={`${editing.type}:${editing.id}`} data={data} {...editing} onCancel={() => setEditing(null)} onSave={(c) => { onApply(c); setEditing(null); }} />}
      {!editing && (
        <RecordList
          title="Search settings"
          subtitle="How each page appears in search results. Pages without custom text use their own title and description. Custom text must have both a title (up to 70 characters) and a description (up to 170)."
          columns={["Page", "Kind", "Search settings"]}
          pageSize={25}
          rows={entries.map((e) => {
            const seo = readSeo(data, e.type, e.id);
            const custom = seo.meta_title !== "" || seo.meta_description !== "";
            const state = seo.noindex ? "Hidden from search" : custom ? "Custom" : "Default";
            return {
              key: `${e.type}:${e.id}`,
              label: `Edit search settings for ${e.title}`,
              search: `${e.label} ${e.title} ${state}`,
              cells: [e.title, e.label.replace(/s$/, ""), state],
              onOpen: () => setEditing({ type: e.type, id: e.id, name: e.title }),
            };
          })}
        />
      )}
    </div>
  );
}

function SeoForm({ data, type, id, name, onSave, onCancel }: { data: WorkbookData; type: SeoEntity; id: string; name: string; onSave: (c: Change[]) => void; onCancel: () => void }) {
  const [seo, setSeo] = useState<SeoForm>(() => readSeo(data, type, id));
  return (
    <FormShell title={`Search settings for ${name}`} onSubmit={() => onSave(planSeo(data, type, id, seo))} onCancel={onCancel} listLabel="Search settings">
      <SeoFields value={seo} onChange={setSeo} defaults={{ title: name, description: "" }} />
    </FormShell>
  );
}
