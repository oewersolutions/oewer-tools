"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumberField, SelectField, TextAreaField } from "../../components/tools/ui";
import { commitMessageFor, describeChange, queueAdd, queueDelete, queueRowEdit, touchedIds, type Change, type Conflict } from "../../lib/admin/changes";
import { planImport, sheetToCsv, type ImportPlan } from "../../lib/admin/csv";
import { coerceValue, EditError } from "../../lib/admin/edit";
import { commitWorkbook, GithubError, readWorkbookFile, type GithubSession, type WorkbookFile } from "../../lib/admin/github";
import { saveChanges, type Repo } from "../../lib/admin/save";
import { cellString, EMPTY_QUERY, filterOptions, filterableColumns, nextId, paginate, queryRows, refOptions, toRows, type Query, type Row } from "../../lib/admin/table";
import { formatIssue, schema, type Issue, type WorkbookData } from "../../lib/workbook";
import type { ColumnDef } from "../../lib/workbook/types";
import { useProjection } from "./useProjection";

export interface ManagerFile {
  session: GithubSession;
  canPush: boolean;
  bytes: Uint8Array;
  sha: string;
  /** The workbook as loaded, already read and checked. */
  data: WorkbookData;
  issues: Issue[];
}

const button = "rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-50";
const secondary = "rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50";
const small = "rounded-lg border border-brand-200 px-2.5 py-1 text-sm font-medium text-brand-800 transition hover:bg-brand-50";
const PAGE_SIZE_DEFAULT = 25;

function describeError(e: unknown): string {
  return e instanceof GithubError || e instanceof EditError ? e.message : "Something went wrong. Please try again.";
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const shorten = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max)}…` : text);

export default function Manager({
  file,
  onSaved,
}: {
  file: ManagerFile;
  /** Called with the version now on GitHub after a save, or after a clash has shown a newer one. */
  onSaved: (base: WorkbookFile) => void;
}) {
  const sheets = Object.keys(schema.sheets);
  const [sheet, setSheet] = useState(sheets[0]!);
  const def = schema.sheets[sheet]!;
  const [query, setQuery] = useState<Query>(EMPTY_QUERY);
  const [pageNumber, setPageNumber] = useState(1);
  const [editing, setEditing] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  const [pending, setPending] = useState<Change[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  const [saveProblems, setSaveProblems] = useState<Issue[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [choices, setChoices] = useState<Record<number, "theirs" | "mine">>({});
  const [saved, setSaved] = useState<{ url: string; rebased: boolean }>();
  const [importPlan, setImportPlan] = useState<ImportPlan>();

  const projection = useProjection(file.bytes, pending, { data: file.data, issues: file.issues });
  const rows = useMemo(() => toRows(projection.data, sheet, def), [projection.data, sheet, def]);
  const pageSize = useMemo(() => {
    const setting = (projection.data.admin_settings ?? []).find((r) => r.values.setting_key === "rows_per_page");
    const n = Number(setting?.values.setting_value);
    return Number.isInteger(n) && n >= 5 && n <= 200 ? n : PAGE_SIZE_DEFAULT;
  }, [projection.data]);
  const filtered = useMemo(() => queryRows(rows, def, query), [rows, def, query]);
  const view = paginate(filtered, pageNumber, pageSize);
  const touched = useMemo(() => touchedIds(pending, sheet, def.primary_key), [pending, sheet, def]);

  const repo: Repo = useMemo(
    () => ({
      read: () => readWorkbookFile(file.session),
      commit: (bytes, sha, text) => commitWorkbook(file.session, bytes, sha, text),
    }),
    [file.session],
  );

  function clearOutcome() {
    setSaved(undefined);
    setSaveProblems([]);
    setError(undefined);
    setConflicts([]);
  }
  function changePending(next: Change[]) {
    clearOutcome();
    setPending(next);
  }
  function chooseSheet(name: string) {
    setSheet(name);
    setQuery(EMPTY_QUERY);
    setPageNumber(1);
    setEditing(null);
    setImportPlan(undefined);
  }

  const currentStrings = (id: string): Record<string, string> => {
    const row = rows.find((r) => r.id === id);
    return Object.fromEntries(def.columns.map((c) => [c.name, cellString(row?.values[c.name])]));
  };

  function submitRow(after: Record<string, string>) {
    const pk = after[def.primary_key]?.trim() ?? "";
    if (pk === "") return setError(`Enter a ${def.primary_key}: it identifies the record.`);
    try {
      for (const c of def.columns) coerceValue(c, after[c.name] ?? ""); // catch a wrong kind of value now
    } catch (e) {
      return setError(describeError(e));
    }
    if (editing?.mode === "add") {
      if (rows.some((r) => r.id === pk)) return setError(`${pk} is already used in ${sheet}. Choose another ${def.primary_key}.`);
      changePending(queueAdd(pending, sheet, def.primary_key, { ...after, [def.primary_key]: pk }));
    } else if (editing?.mode === "edit") {
      changePending(queueRowEdit(pending, sheet, def.primary_key, editing.id, currentStrings(editing.id), after));
    }
    setEditing(null);
  }

  async function run(changes: Change[], force: ReadonlySet<number>) {
    clearOutcome();
    setWorking(true);
    try {
      const base: WorkbookFile = { bytes: file.bytes, sha: file.sha, size: file.bytes.length };
      const result = await saveChanges(repo, base, changes, message.trim() || commitMessageFor(changes), force);
      if (result.status === "saved") {
        onSaved(result.base);
        setSaved({ url: result.commit.commitUrl, rebased: result.rebased });
        setPending([]);
        setChoices({});
        setMessage("");
      } else if (result.status === "invalid") {
        setSaveProblems(result.issues);
      } else {
        onSaved(result.base); // from now on, work from the newest version
        setConflicts(result.conflicts);
        setChoices({});
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setWorking(false);
    }
  }

  function saveWithChoices() {
    const dropped = new Set(conflicts.filter((c) => choices[c.index] === "theirs").map((c) => c.index));
    const mine = new Set(conflicts.filter((c) => choices[c.index] === "mine").map((c) => c.index));
    const remaining = pending.filter((_, i) => !dropped.has(i));
    const forced = new Set<number>();
    pending.forEach((c, i) => mine.has(i) && forced.add(remaining.indexOf(c)));
    setPending(remaining);
    setConflicts([]);
    if (remaining.length > 0) void run(remaining, forced);
  }

  const unresolved = conflicts.filter((c) => !choices[c.index]);
  const liveIssues = projection.issues;

  return (
    <div className="space-y-8">
      <nav aria-label="Sheets" className="rounded-2xl border border-brand-100 bg-white p-4 shadow-soft">
        <ul className="flex flex-wrap gap-2">
          {sheets.map((name) => {
            const count = (projection.data[name] ?? []).length;
            return (
              <li key={name}>
                <button
                  type="button"
                  aria-current={name === sheet ? "page" : undefined}
                  onClick={() => chooseSheet(name)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${name === sheet ? "bg-brand text-white" : "bg-brand-50 text-brand-800 hover:bg-brand-100"}`}
                >
                  {name} <span className={name === sheet ? "text-brand-100" : "text-slate-600"}>({count})</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="sheet-heading" className="space-y-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sheet-heading" className="font-display text-2xl font-semibold text-ink">
              {sheet}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-700">{def.purpose}</p>
          </div>
          <button type="button" onClick={() => { clearOutcome(); setEditing({ mode: "add" }); }} className={button}>
            Add row
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <NumberField label="Search rows" value={query.search} onChange={(v) => { setQuery({ ...query, search: v }); setPageNumber(1); }} />
          </div>
          <SelectField
            label="Filter by"
            value={query.filterColumn}
            onChange={(v) => { setQuery({ ...query, filterColumn: v, filterValue: "" }); setPageNumber(1); }}
            options={[{ value: "", label: "No filter" }, ...filterableColumns(def).map((c) => ({ value: c.name, label: c.name }))]}
          />
          <SelectField
            label="Filter value"
            value={query.filterValue}
            onChange={(v) => { setQuery({ ...query, filterValue: v }); setPageNumber(1); }}
            options={[
              { value: "", label: query.filterColumn ? "Any" : "Choose a column first" },
              ...(query.filterColumn ? filterOptions(def.columns.find((c) => c.name === query.filterColumn)!, rows, schema.enums).map((v) => ({ value: v, label: v })) : []),
            ]}
          />
          <SelectField
            label="Sort by"
            value={query.sortColumn}
            onChange={(v) => setQuery({ ...query, sortColumn: v })}
            options={[{ value: "", label: "Sheet order" }, ...def.columns.map((c) => ({ value: c.name, label: c.name }))]}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={query.sortDescending} onChange={(e) => setQuery({ ...query, sortDescending: e.target.checked })} />
            Descending
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} onClick={() => download(`${sheet}.csv`, new Blob([sheetToCsv(def, rows)], { type: "text/csv" }))}>
            Export {sheet} as CSV
          </button>
          <ImportButton onPlan={(p) => { clearOutcome(); setImportPlan(p); }} sheet={sheet} rows={rows} />
          <button type="button" className={secondary} onClick={() => download("oewer_database.xlsx", new Blob([file.bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))}>
            Download the workbook
          </button>
        </div>

        {importPlan && (
          <div role="status" className="space-y-3 rounded-xl bg-brand-50 p-5">
            {importPlan.errors.length > 0 ? (
              <>
                <p className="font-medium text-red-800">This file cannot be imported:</p>
                <ul className="list-disc space-y-1 pl-6 text-sm text-red-800">
                  {importPlan.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                The file would add <strong>{importPlan.added}</strong>, update <strong>{importPlan.updated}</strong> and leave <strong>{importPlan.unchanged}</strong> row(s) as they are. Rows missing from the file are not deleted.
              </p>
            )}
            <div className="flex gap-2">
              {importPlan.errors.length === 0 && importPlan.changes.length > 0 && (
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    changePending(importPlan.changes.reduce((acc, c) => (c.type === "add" ? queueAdd(acc, c.sheet, def.primary_key, c.values) : c.type === "set" ? queueRowEdit(acc, c.sheet, def.primary_key, c.pk, { [c.column]: c.before }, { [c.column]: c.after }) : acc), pending));
                    setImportPlan(undefined);
                  }}
                >
                  Add {importPlan.changes.length} change{importPlan.changes.length === 1 ? "" : "s"} to pending
                </button>
              )}
              <button type="button" className={secondary} onClick={() => setImportPlan(undefined)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {editing && (
          <RowForm
            key={editing.mode === "edit" ? editing.id : "add"}
            sheet={sheet}
            mode={editing.mode}
            initial={editing.mode === "edit" ? currentStrings(editing.id) : { [def.primary_key]: nextId(def, rows.map((r) => r.id)) }}
            data={projection.data}
            error={error}
            onSubmit={submitRow}
            onCancel={() => { setEditing(null); setError(undefined); }}
          />
        )}

        <div className="overflow-x-auto rounded-xl border border-brand-100" tabIndex={0} role="region" aria-label={`${sheet} rows`}>
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">
              {sheet}: {view.total} row{view.total === 1 ? "" : "s"}, page {view.page} of {view.pages}
            </caption>
            <thead className="bg-brand-50 text-brand-900">
              <tr>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
                {def.columns.map((c) => (
                  <th key={c.name} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.items.length === 0 && (
                <tr>
                  <td colSpan={def.columns.length + 1} className="px-3 py-6 text-center text-slate-700">
                    No rows match.
                  </td>
                </tr>
              )}
              {view.items.map((r) => {
                const mark = touched.get(r.id);
                return (
                  <tr key={r.id} className={`border-t border-brand-100 ${mark ? "bg-gold-300/20" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-2">
                      <button type="button" className={small} aria-label={`Edit ${r.id}`} onClick={() => { clearOutcome(); setEditing({ mode: "edit", id: r.id }); }}>
                        Edit
                      </button>{" "}
                      <button type="button" className={small} aria-label={`Delete ${r.id}`} onClick={() => changePending(queueDelete(pending, sheet, def.primary_key, r.id))}>
                        Delete
                      </button>
                      {mark && <span className="ml-2 text-xs font-medium text-gold-700">{mark === "added" ? "New" : "Changed"}</span>}
                    </td>
                    {def.columns.map((c) => {
                      const text = cellString(r.values[c.name]);
                      return (
                        <td key={c.name} title={text.length > 60 ? text : undefined} className="max-w-xs px-3 py-2 align-top">
                          {shorten(text)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          <span>
            {view.total} row{view.total === 1 ? "" : "s"} · page {view.page} of {view.pages}
          </span>
          <span className="flex gap-2">
            <button type="button" className={secondary} disabled={view.page <= 1} onClick={() => setPageNumber(view.page - 1)}>
              Previous
            </button>
            <button type="button" className={secondary} disabled={view.page >= view.pages} onClick={() => setPageNumber(view.page + 1)}>
              Next
            </button>
          </span>
        </nav>
      </section>

      <section aria-labelledby="pending-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <h2 id="pending-heading" className="font-display text-2xl font-semibold text-ink">
          Pending changes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-slate-700">Nothing yet. Changes you make appear here and are only saved when you press Save.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pending.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-brand-50 p-3 text-sm">
                <span>{describeChange(c)}</span>
                <button type="button" onClick={() => changePending(pending.filter((_, n) => n !== i))} className="shrink-0 font-medium text-brand-700 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {pending.length > 0 && liveIssues.length > 0 && (
          <div role="status" className="mt-5 text-red-800">
            <p className="font-medium">With these changes the workbook would have {liveIssues.length} problem(s), so it cannot be saved yet:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              {liveIssues.slice(0, 10).map((i, n) => (
                <li key={n}>{formatIssue(i)}</li>
              ))}
            </ul>
          </div>
        )}
        {pending.length > 0 && liveIssues.length === 0 && projection.ready && (
          <p role="status" className="mt-5 font-medium text-brand">
            The workbook is valid with these changes.
          </p>
        )}

        {error && !editing && (
          <p role="alert" className="mt-5 text-red-800">
            {error}
          </p>
        )}

        {saveProblems.length > 0 && (
          <div role="alert" className="mt-5 text-red-800">
            <p className="font-medium">These changes would leave {saveProblems.length} problem(s) in the workbook, so nothing was saved:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              {saveProblems.slice(0, 10).map((i, n) => (
                <li key={n}>{formatIssue(i)}</li>
              ))}
            </ul>
          </div>
        )}

        {conflicts.length > 0 && (
          <div role="alert" className="mt-5 space-y-4 rounded-xl border border-gold-500/50 bg-gold-300/20 p-5">
            <p className="font-medium text-ink">
              Someone else changed the workbook on GitHub. {conflicts.length === 1 ? "One of your changes clashes" : `${conflicts.length} of your changes clash`} with their edits. Nothing was saved. Choose what to do with each:
            </p>
            {conflicts.map((c) => (
              <fieldset key={c.index} className="space-y-2 text-sm">
                <legend className="font-medium">{describeChange(c.change)}</legend>
                <p className="text-slate-700">
                  {c.kind === "changed" && <>On GitHub now: <strong>{c.theirs === "" ? "(empty)" : c.theirs}</strong></>}
                  {c.kind === "row_missing" && "That record was deleted on GitHub."}
                  {c.kind === "id_taken" && "That ID is already used on GitHub."}
                </p>
                <label className="flex items-center gap-2">
                  <input type="radio" name={`c${c.index}`} checked={choices[c.index] === "theirs"} onChange={() => setChoices({ ...choices, [c.index]: "theirs" })} />
                  Keep what is on GitHub (drop my change)
                </label>
                {c.kind !== "row_missing" && (
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`c${c.index}`} checked={choices[c.index] === "mine"} onChange={() => setChoices({ ...choices, [c.index]: "mine" })} />
                    Use my version (overwrite theirs)
                  </label>
                )}
              </fieldset>
            ))}
            <button type="button" onClick={saveWithChoices} disabled={working || unresolved.length > 0} className={button}>
              Apply my choices and save
            </button>
          </div>
        )}

        {pending.length > 0 && conflicts.length === 0 && (
          <div className="mt-5 space-y-4">
            <TextAreaField label="Commit message (optional)" value={message} onChange={setMessage} rows={2} placeholder={commitMessageFor(pending)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void run(pending, new Set())} disabled={working || !file.canPush} className={button}>
                {working ? "Saving…" : `Save ${pending.length} change${pending.length === 1 ? "" : "s"} to GitHub`}
              </button>
              <button type="button" onClick={() => changePending([])} className={secondary}>
                Discard all
              </button>
            </div>
          </div>
        )}

        {saved && (
          <p role="status" className="mt-5 font-medium text-brand">
            Saved. {saved.rebased && "Your changes were merged with newer changes made by someone else. "}
            <a href={saved.url} className="underline" rel="noopener noreferrer">
              View the commit on GitHub
            </a>
            . The site rebuilds automatically.
          </p>
        )}
      </section>
    </div>
  );
}

function ImportButton({ sheet, rows, onPlan }: { sheet: string; rows: Row[]; onPlan: (plan: ImportPlan) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const def = schema.sheets[sheet]!;
  return (
    <>
      <button type="button" className={secondary} onClick={() => input.current?.click()}>
        Import CSV into {sheet}
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        aria-label={`Choose a CSV file to import into ${sheet}`}
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          e.target.value = "";
          if (!chosen) return;
          if (chosen.size > 2 * 1024 * 1024) return onPlan({ changes: [], added: 0, updated: 0, unchanged: 0, errors: ["That file is larger than 2 MB."] });
          onPlan(planImport(sheet, def, await chosen.text(), rows));
        }}
      />
    </>
  );
}

function RowForm({
  sheet,
  mode,
  initial,
  data,
  error,
  onSubmit,
  onCancel,
}: {
  sheet: string;
  mode: "add" | "edit";
  initial: Record<string, string>;
  data: Parameters<typeof refOptions>[1];
  error?: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const def = schema.sheets[sheet]!;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(def.columns.map((c) => [c.name, initial[c.name] ?? ""])));
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
  }, []);
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const id = `row-form-${sheet}`;

  return (
    <form
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-5 rounded-xl border border-gold-500/40 bg-cream p-5"
    >
      <h3 id={`${id}-title`} className="font-display text-xl font-semibold text-ink">
        {mode === "add" ? `Add a row to ${sheet}` : `Edit ${initial[def.primary_key]}`}
      </h3>
      <div ref={first} className="grid gap-5 md:grid-cols-2">
        {def.columns.map((c) => (
          <Field key={c.name} column={c} value={values[c.name] ?? ""} onChange={(v) => set(c.name, v)} readOnly={mode === "edit" && c.name === def.primary_key} data={data} />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={button}>
          {mode === "add" ? "Add to pending changes" : "Update pending changes"}
        </button>
        <button type="button" onClick={onCancel} className={secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ column, value, onChange, readOnly, data }: { column: ColumnDef; value: string; onChange: (v: string) => void; readOnly: boolean; data: Parameters<typeof refOptions>[1] }) {
  const label = `${column.name}${column.required ? " *" : ""}`;
  if (column.type === "text") return <div className="md:col-span-2"><TextAreaField label={label} value={value} onChange={onChange} rows={4} /></div>;
  if (column.type === "bool") {
    return <SelectField label={label} value={value} onChange={onChange} options={[{ value: "", label: "(not set)" }, { value: "true", label: "true" }, { value: "false", label: "false" }]} />;
  }
  if (column.type === "enum") {
    const options = schema.enums[column.enum ?? ""] ?? [];
    return <SelectField label={label} value={value} onChange={onChange} options={[...(column.required ? [] : [{ value: "", label: "(none)" }]), ...(value && !options.includes(value) ? [{ value, label: value }] : []), ...options.map((o) => ({ value: o, label: o }))]} />;
  }
  if (column.type === "ref") {
    const options = refOptions(column, data);
    return <SelectField label={label} value={value} onChange={onChange} options={[{ value: "", label: "(none)" }, ...(value && !options.includes(value) ? [{ value, label: value }] : []), ...options.map((o) => ({ value: o, label: o }))]} />;
  }
  if (readOnly) {
    return <NumberField label={`${label} (cannot be changed)`} value={value} onChange={() => undefined} readOnly />;
  }
  return <NumberField label={label} value={value} onChange={onChange} hint={column.type === "datetime" ? "UTC, like 2026-10-29T08:30:00Z" : undefined} />;
}
