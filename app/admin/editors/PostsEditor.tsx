"use client";

import { useState } from "react";
import type { Change } from "../../../lib/admin/changes";
import type { GithubSession } from "../../../lib/admin/github";
import { nowIso, planPost, planSeo, readPost, readSeo, type BlockForm, type PostForm, type SeoForm } from "../../../lib/admin/forms";
import { cellString, toRows } from "../../../lib/admin/table";
import { PostBody } from "../../../components/Prose";
import { readingMinutes } from "../../../lib/format";
import { slugify, statusNotice } from "../../../lib/posts";
import { schema, type WorkbookData } from "../../../lib/workbook";
import { StatusPill, toneFor } from "../views";
import ImageUpload from "./ImageUpload";
import { CheckGroup, FormShell, primaryButton, Section, SelectField, SeoFields, smallButton, TextAreaField, TextField } from "./parts";

const BLOCK_HELP: Record<string, string> = {
  paragraph: "Text. Use **bold**, *italic*, `code` and [links](https://…).",
  heading: "A section heading.",
  list: "One item per line.",
  image: "Alt text: describe the picture for people who cannot see it.",
  quote: "A pull quote.",
  code: "Shown as a code block.",
  callout: "A highlighted note.",
};

export default function PostsEditor({ data, onApply, session, canPush }: { data: WorkbookData; onApply: (changes: Change[]) => void; session: GithubSession; canPush: boolean }) {
  const posts = toRows(data, "posts", schema.sheets.posts!).sort((a, b) => cellString(b.values.published_at).localeCompare(cellString(a.values.published_at)) || b.id.localeCompare(a.id));
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-700">Articles are written as a list of blocks: paragraphs, headings, lists, images and so on. Only published articles are listed on the site.</p>
        <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
          New article
        </button>
      </div>

      {editing && (
        <PostForm
          key={editing}
          data={data}
          session={session}
          canPush={canPush}
          postId={editing === "new" ? "" : editing}
          onCancel={() => setEditing(null)}
          onSave={(changes) => {
            onApply(changes);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Articles</caption>
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Title", "Status", "Published", ""].map((h, i) => (
                <th key={i} scope="col" className="border-b border-slate-200 px-4 py-3 font-semibold">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{cellString(p.values.title)}</td>
                <td className="px-4 py-3"><StatusPill tone={toneFor(cellString(p.values.status))}>{cellString(p.values.status)}</StatusPill></td>
                <td className="px-4 py-3">{cellString(p.values.published_at).slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className={smallButton} aria-label={`Edit article ${cellString(p.values.title)}`} onClick={() => setEditing(p.id)}>
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

function PostForm({ data, postId, session, canPush, onSave, onCancel }: { data: WorkbookData; postId: string; session: GithubSession; canPush: boolean; onSave: (c: Change[]) => void; onCancel: () => void }) {
  const categories = toRows(data, "blog_categories", schema.sheets.blog_categories!);
  const authors = toRows(data, "authors", schema.sheets.authors!);
  const tags = toRows(data, "tags", schema.sheets.tags!);
  const [f, setF] = useState<PostForm>(() => {
    const form = readPost(data, postId);
    return postId ? form : { ...form, category_id: categories[0]?.id ?? "", author_id: authors[0]?.id ?? "" };
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(postId));
  const [newTag, setNewTag] = useState("");
  const [newBlockType, setNewBlockType] = useState("paragraph");
  const [seo, setSeo] = useState<SeoForm>(() => readSeo(data, "post", postId));
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState(false);
  const set = (patch: Partial<PostForm>) => setF((s) => ({ ...s, ...patch }));
  const setBlock = (i: number, patch: Partial<BlockForm>) => set({ blocks: f.blocks.map((b, n) => (n === i ? { ...b, ...patch } : b)) });
  const move = (i: number, by: -1 | 1) => {
    const next = [...f.blocks];
    [next[i], next[i + by]] = [next[i + by]!, next[i]!];
    set({ blocks: next });
  };

  function save() {
    const slug = f.slug || slugify(f.title);
    if (!f.title.trim()) return setError("Give the article a title.");
    if (!slug) return setError("The address needs at least one letter or number.");
    if (!f.category_id || !f.author_id) return setError("Choose a category and an author.");
    const { changes, postId: id } = planPost(data, { ...f, title: f.title.trim(), slug }, nowIso());
    onSave([...changes, ...planSeo(data, "post", id, seo)]);
  }

  return (
    <FormShell title={postId ? `Edit article ${f.title}` : "New article"} onSubmit={save} onCancel={onCancel} submitLabel="Update pending changes" error={error}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField label="Title" value={f.title} onChange={(v) => set({ title: v, ...(slugTouched ? {} : { slug: slugify(v) }) })} />
        </div>
        <TextField label="Page address (slug)" value={f.slug} onChange={(v) => { setSlugTouched(true); set({ slug: v }); }} hint="Changing it breaks old links." />
        <SelectField label="Status" value={f.status} onChange={(v) => set({ status: v })} options={(schema.enums.status ?? []).map((s) => ({ value: s, label: s }))} />
        <SelectField label="Category" value={f.category_id} onChange={(v) => set({ category_id: v })} options={categories.map((c) => ({ value: c.id, label: cellString(c.values.name) }))} />
        <SelectField label="Author" value={f.author_id} onChange={(v) => set({ author_id: v })} options={authors.map((a) => ({ value: a.id, label: cellString(a.values.display_name) }))} />
        <div>
          <TextField label="Publication date" value={f.published_at} onChange={(v) => set({ published_at: v })} hint="UTC, like 2026-10-29T08:30:00Z. Left empty, it is set when you publish." />
          <button type="button" className={`${smallButton} mt-2`} onClick={() => set({ published_at: nowIso() })}>
            Set publication date to now
          </button>
        </div>
        <TextField label="Cover image file" value={f.cover_image} onChange={(v) => set({ cover_image: v })} hint="Where the picture is on the site, like /images/blog/my-article/cover-1600.jpg (jpg, png or webp). Empty uses a generated cover." />
        <TextField label="Cover image description (alt text)" value={f.cover_alt} onChange={(v) => set({ cover_alt: v })} hint="Required with a cover: describe the picture for people who cannot see it." />
        <div className="space-y-2 md:col-span-2">
          <ImageUpload kind="cover" slug={f.slug || slugify(f.title)} session={session} canPush={canPush} label="Upload a cover picture" onUploaded={(path) => set({ cover_image: path })} />
          {f.cover_image && (
            <p className="text-xs text-slate-700">
              The cover is <code>{f.cover_image}</code>. Describe it in the box above (required).{" "}
              <button type="button" className="font-medium text-brand-700 underline" onClick={() => set({ cover_image: "", cover_alt: "" })}>
                Remove the cover
              </button>{" "}
              (the file stays in the repository; the article goes back to a generated cover).
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <TextAreaField label="Summary (shown in lists and search results)" value={f.excerpt} onChange={(v) => set({ excerpt: v })} rows={2} />
        </div>
      </div>

      <Section title="Tags">
        <CheckGroup legend="Tags" options={tags.map((t) => ({ value: t.id, label: cellString(t.values.name) }))} selected={f.tagIds} onChange={(v) => set({ tagIds: v })} empty="There are no tags yet." />
        {f.newTags.length > 0 && <p className="text-sm text-slate-700">New tags to create: {f.newTags.join(", ")}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <TextField label="Create a new tag" value={newTag} onChange={setNewTag} />
          </div>
          <button
            type="button"
            className={smallButton}
            onClick={() => {
              if (newTag.trim()) set({ newTags: [...f.newTags, newTag.trim()] });
              setNewTag("");
            }}
          >
            Add tag
          </button>
        </div>
      </Section>

      <Section title="Article content">
        {f.blocks.length === 0 && <p className="text-sm text-slate-700">No blocks yet. A published article needs at least one.</p>}
        <ol className="space-y-4">
          {f.blocks.map((b, i) => (
            <li key={i}>
              <fieldset className="space-y-3 rounded-lg bg-white p-4">
                <legend className="px-1 text-sm font-semibold text-brand-800">
                  Block {i + 1} of {f.blocks.length}
                </legend>
                <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
                  <SelectField label={`Block ${i + 1} type`} value={b.block_type} onChange={(v) => setBlock(i, { block_type: v })} options={(schema.enums.block_type ?? []).map((t) => ({ value: t, label: t }))} />
                  <TextAreaField label={`Block ${i + 1} ${b.block_type === "image" ? "alt text" : "text"}`} value={b.content} onChange={(v) => setBlock(i, { content: v })} rows={b.block_type === "heading" ? 1 : 4} />
                </div>
                <p className="text-xs text-slate-600">{BLOCK_HELP[b.block_type]}</p>
                {b.block_type === "image" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <ImageUpload kind="inline" slug={f.slug || slugify(f.title)} session={session} canPush={canPush} label={`Block ${i + 1}: upload a picture`} onUploaded={(path) => setBlock(i, { asset_path: path })} />
                    </div>
                    <TextField label={`Block ${i + 1} image file`} value={b.asset_path} onChange={(v) => setBlock(i, { asset_path: v })} hint="Where the file is on the site, like /images/blog/my-article/chart-1600.jpg (jpg, png or webp)." />
                    <TextField label={`Block ${i + 1} caption`} value={b.caption} onChange={(v) => setBlock(i, { caption: v })} hint="Optional. Shown under the picture." />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={smallButton} disabled={i === 0} onClick={() => move(i, -1)}>
                    Move block {i + 1} up
                  </button>
                  <button type="button" className={smallButton} disabled={i === f.blocks.length - 1} onClick={() => move(i, 1)}>
                    Move block {i + 1} down
                  </button>
                  <button type="button" className={smallButton} onClick={() => set({ blocks: f.blocks.filter((_, n) => n !== i) })}>
                    Remove block {i + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end gap-2">
          <SelectField label="New block type" value={newBlockType} onChange={setNewBlockType} options={(schema.enums.block_type ?? []).map((t) => ({ value: t, label: t }))} />
          <button type="button" className={smallButton} onClick={() => set({ blocks: [...f.blocks, { block_id: "", block_type: newBlockType, content: "", asset_path: "", caption: "" }] })}>
            Add block
          </button>
        </div>
      </Section>

      <SeoFields value={seo} onChange={setSeo} defaults={{ title: f.title, description: f.excerpt }} />

      <Section title="Preview">
        <button type="button" className={smallButton} aria-expanded={preview} onClick={() => setPreview(!preview)}>
          {preview ? "Hide preview" : "Preview article"}
        </button>
        {preview && (
          <article aria-label="Article preview" className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6">
            {statusNotice(f.status) && (
              <p className="rounded-lg bg-gold-300/30 p-3 text-sm text-ink">
                <strong>{statusNotice(f.status)!.title}.</strong> {statusNotice(f.status)!.text}
              </p>
            )}
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{cellString(categories.find((c) => c.id === f.category_id)?.values.name)}</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">{f.title || "Untitled article"}</h2>
            <p className="text-lg text-slate-700">{f.excerpt}</p>
            <p className="text-sm text-slate-700">
              {cellString(authors.find((a) => a.id === f.author_id)?.values.display_name)} · {readingMinutes(f.blocks.map((b) => b.content).join(" "))} min read
            </p>
            {f.blocks.length === 0 ? (
              <p className="text-slate-700">No content yet.</p>
            ) : (
              <PostBody blocks={f.blocks.map((b, i) => ({ block_id: `preview-${i}`, post_id: f.post_id, sort_order: i + 1, block_type: b.block_type, content: b.content, asset_path: b.asset_path, caption: b.caption }))} />
            )}
          </article>
        )}
      </Section>
    </FormShell>
  );
}
