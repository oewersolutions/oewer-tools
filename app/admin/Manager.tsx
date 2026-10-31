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
import { mergeChanges } from "../../lib/admin/forms";
import { hasLiveChanges, liveChanges } from "../../lib/admin/live";
import AdsEditor from "./editors/AdsEditor";
import CategoriesEditor from "./editors/CategoriesEditor";
import PostsEditor from "./editors/PostsEditor";
import SeoEditor from "./editors/SeoEditor";
import ToolsEditor from "./editors/ToolsEditor";
import { useProjection } from "./useProjection";
import { FormHeader, FormRow, INPUT, ListShell, PRIMARY_BUTTON, RecordPager, StatusPill, TD, TH, toneFor, TOOLBAR_BUTTON, TR } from "./views";

export type View = "tools" | "categories" | "articles" | "seo" | "ads" | "sheets";

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
const secondary = TOOLBAR_BUTTON;
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
  tab,
  onSaved,
  onPublished,
  onPendingCount,
}: {
  file: ManagerFile;
  /** Which editor to show: the menu on the left chooses it. */
  tab: View;
  /** Told how many unsaved changes there are, for the top bar. */
  onPendingCount?: (n: number) => void;
  /** Called with the version now on GitHub after a save, or after a clash has shown a newer one. */
  onSaved: (base: WorkbookFile) => void;
  /** Called with the new commit when a save has gone to GitHub, so the site update can be followed. */
  onPublished?: (commitSha: string) => void;
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

  useEffect(() => onPendingCount?.(pending.length), [pending.length, onPendingCount]);
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
        onPublished?.(result.commit.commitSha);
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
  const onSite = useMemo(() => (pending.length > 0 && projection.ready ? liveChanges(file.data, projection.data) : undefined), [pending.length, projection.ready, projection.data, file.data]);

  const apply = (changes: Change[]) => changePending(mergeChanges(pending, changes));
  const editorProps = { data: projection.data, onApply: apply, session: file.session, canPush: file.canPush };

  return (
    <div className="space-y-8">
      {tab !== "sheets" && (
        <section aria-label="Editor" className="space-y-5">
          {tab === "tools" && <ToolsEditor {...editorProps} />}
          {tab === "categories" && <CategoriesEditor {...editorProps} />}
          {tab === "articles" && <PostsEditor {...editorProps} />}
          {tab === "seo" && <SeoEditor {...editorProps} />}
          {tab === "ads" && <AdsEditor {...editorProps} />}
        </section>
      )}

      {tab === "sheets" && (
        <>
          {editing ? (
            <RowForm
              key={editing.mode === "edit" ? editing.id : "add"}
              sheet={sheet}
              mode={editing.mode}
              initial={editing.mode === "edit" ? currentStrings(editing.id) : { [def.primary_key]: nextId(def, rows.map((r) => r.id)) }}
              data={projection.data}
              error={error}
              onSubmit={submitRow}
              onCancel={() => { setEditing(null); setError(undefined); }}
              position={editing.mode === "edit" ? { index: filtered.findIndex((r) => r.id === editing.id) + 1, total: filtered.length, onPrev: filtered.findIndex((r) => r.id === editing.id) > 0 ? () => setEditing({ mode: "edit", id: filtered[filtered.findIndex((r) => r.id === editing.id) - 1]!.id }) : undefined, onNext: filtered.findIndex((r) => r.id === editing.id) < filtered.length - 1 ? () => setEditing({ mode: "edit", id: filtered[filtered.findIndex((r) => r.id === editing.id) + 1]!.id }) : undefined } : undefined}
            />
          ) : (
            <div className="space-y-4">
              <nav aria-label="Sheets" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <ul className="flex flex-wrap gap-1.5">
                  {sheets.map((name) => {
                    const count = (projection.data[name] ?? []).length;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          aria-current={name === sheet ? "page" : undefined}
                          onClick={() => chooseSheet(name)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${name === sheet ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100"}`}
                        >
                          {name} <span className="text-slate-500">({count})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <ListShell
                title={sheet}
                subtitle={def.purpose}
                action={
                  <>
                    <button type="button" className={TOOLBAR_BUTTON} onClick={() => download(`${sheet}.csv`, new Blob([sheetToCsv(def, rows)], { type: "text/csv" }))}>
                      Export {sheet} as CSV
                    </button>
                    <ImportButton onPlan={(p) => { clearOutcome(); setImportPlan(p); }} sheet={sheet} rows={rows} />
                    <button type="button" className={TOOLBAR_BUTTON} onClick={() => download("oewer_database.xlsx", new Blob([file.bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))}>
                      Download the workbook
                    </button>
                    <button type="button" onClick={() => { clearOutcome(); setEditing({ mode: "add" }); }} className={PRIMARY_BUTTON}>
                      Add row
                    </button>
                  </>
                }
                toolbar={
                  <>
                    <div className="min-w-48 flex-1">
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
                    <label className="flex items-center gap-2 pb-2.5 text-sm">
                      <input type="checkbox" checked={query.sortDescending} onChange={(e) => setQuery({ ...query, sortDescending: e.target.checked })} />
                      Descending
                    </label>
                  </>
                }
                footer={
                  <nav aria-label="Pages" className="flex w-full items-center justify-between gap-3">
                    <span>
                      {view.total} row{view.total === 1 ? "" : "s"} · page {view.page} of {view.pages}
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className={TOOLBAR_BUTTON} disabled={view.page <= 1} onClick={() => setPageNumber(view.page - 1)}>
                        Previous
                      </button>
                      <button type="button" className={TOOLBAR_BUTTON} disabled={view.page >= view.pages} onClick={() => setPageNumber(view.page + 1)}>
                        Next
                      </button>
                    </span>
                  </nav>
                }
              >
                {importPlan && (
                  <div role="status" className="space-y-3 border-b border-slate-200 bg-brand-50 p-5">
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
                          className={PRIMARY_BUTTON}
                          onClick={() => {
                            changePending(importPlan.changes.reduce((acc, c) => (c.type === "add" ? queueAdd(acc, c.sheet, def.primary_key, c.values) : c.type === "set" ? queueRowEdit(acc, c.sheet, def.primary_key, c.pk, { [c.column]: c.before }, { [c.column]: c.after }) : acc), pending));
                            setImportPlan(undefined);
                          }}
                        >
                          Add {importPlan.changes.length} change{importPlan.changes.length === 1 ? "" : "s"} to pending
                        </button>
                      )}
                      <button type="button" className={TOOLBAR_BUTTON} onClick={() => setImportPlan(undefined)}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
                <table className="w-full min-w-max text-left text-sm">
                  <caption className="sr-only">
                    {sheet}: {view.total} row{view.total === 1 ? "" : "s"}, page {view.page} of {view.pages}
                  </caption>
                  <thead>
                    <tr>
                      <TH>
                        <span className="sr-only">Actions</span>
                      </TH>
                      {def.columns.map((c) => (
                        <TH key={c.name}>{c.name}</TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {view.items.length === 0 && (
                      <tr>
                        <TD colSpan={def.columns.length + 1} className="py-8 text-center text-slate-600">
                          No rows match.
                        </TD>
                      </tr>
                    )}
                    {view.items.map((r) => {
                      const mark = touched.get(r.id);
                      return (
                        <TR key={r.id} marked={Boolean(mark)}>
                          <TD className="whitespace-nowrap">
                            <button type="button" className={TOOLBAR_BUTTON} aria-label={`Edit ${r.id}`} onClick={() => { clearOutcome(); setEditing({ mode: "edit", id: r.id }); }}>
                              Edit
                            </button>{" "}
                            <button type="button" className={TOOLBAR_BUTTON} aria-label={`Delete ${r.id}`} onClick={() => changePending(queueDelete(pending, sheet, def.primary_key, r.id))}>
                              Delete
                            </button>
                            {mark && <span className="ml-2"><StatusPill tone="warn">{mark === "added" ? "New" : "Changed"}</StatusPill></span>}
                          </TD>
                          {def.columns.map((c) => {
                            const text = cellString(r.values[c.name]);
                            return (
                              <TD key={c.name} title={text.length > 60 ? text : undefined}>
                                {c.type === "enum" && text ? <StatusPill tone={toneFor(text)}>{text}</StatusPill> : shorten(text)}
                              </TD>
                            );
                          })}
                        </TR>
                      );
                    })}
                  </tbody>
                </table>
              </ListShell>
            </div>
          )}
        </>
      )}

      <section aria-labelledby="pending-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

        {pending.length > 0 && projection.ready && liveIssues.length > 0 && (
          <div role="status" className="mt-5 text-red-800">
            <p className="font-medium">With these changes the workbook would have {liveIssues.length} problem(s), so it cannot be saved yet:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              {liveIssues.slice(0, 10).map((i, n) => (
                <li key={n}>{formatIssue(i)}</li>
              ))}
            </ul>
          </div>
        )}
        {onSite && liveIssues.length === 0 && (
          <div className="mt-5 rounded-xl border border-brand-100 bg-cream p-4 text-sm" aria-label="What will change on the live site">
            <p className="font-semibold text-ink">What saving will change on the live site</p>
            {!hasLiveChanges(onSite) ? (
              <p className="mt-1 text-slate-700">Nothing visitors can see. These changes only affect drafts, settings or items that are not on the site.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {onSite.appear.map((t) => (
                  <li key={`a-${t}`}>
                    <strong>Appears:</strong> {t}
                  </li>
                ))}
                {onSite.edited.map((t) => (
                  <li key={`e-${t}`}>
                    <strong>Updated:</strong> {t}
                  </li>
                ))}
                {onSite.disappear.map((t) => (
                  <li key={`d-${t}`}>
                    <strong>Removed:</strong> {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {pending.length > 0 && !projection.ready && (
          <p role="status" className="mt-5 text-slate-700">
            Checking the workbook with these changes…
          </p>
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
  position,
}: {
  sheet: string;
  mode: "add" | "edit";
  initial: Record<string, string>;
  data: Parameters<typeof refOptions>[1];
  error?: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  position?: { index: number; total: number; onPrev?: () => void; onNext?: () => void };
}) {
  const def = schema.sheets[sheet]!;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(def.columns.map((c) => [c.name, initial[c.name] ?? ""])));
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
  }, []);
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const id = `row-form-${sheet}`;
  const title = mode === "add" ? `Add a row to ${sheet}` : `Edit ${initial[def.primary_key]}`;

  return (
    <form
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-4"
    >
      <h3 id={`${id}-title`} className="sr-only">
        {title}
      </h3>
      <FormHeader
        trail={[{ label: sheet, onClick: onCancel }, { label: mode === "add" ? "New" : (initial[def.primary_key] ?? "") }]}
        title={title}
        actions={
          <>
            <button type="submit" className={PRIMARY_BUTTON}>
              {mode === "add" ? "Add to pending changes" : "Update pending changes"}
            </button>
            <button type="button" onClick={onCancel} className={TOOLBAR_BUTTON}>
              Cancel
            </button>
          </>
        }
        status={position && <RecordPager {...position} />}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div ref={first} className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {def.columns.map((c) => (
            <div key={c.name} className={c.type === "text" ? "lg:col-span-2" : ""}>
              <Field idBase={id} column={c} value={values[c.name] ?? ""} onChange={(v) => set(c.name, v)} readOnly={mode === "edit" && c.name === def.primary_key} data={data} />
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-5 text-red-800">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({ idBase, column, value, onChange, readOnly, data }: { idBase: string; column: ColumnDef; value: string; onChange: (v: string) => void; readOnly: boolean; data: Parameters<typeof refOptions>[1] }) {
  const id = `${idBase}-${column.name}`;
  const label = `${column.name}${column.required ? " *" : ""}${readOnly ? " (cannot be changed)" : ""}`;
  const hint = column.type === "datetime" ? "UTC, like 2026-10-29T08:30:00Z" : undefined;
  const select = (options: { value: string; label: string }[]) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  let control;
  if (column.type === "text") control = <textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT} />;
  else if (column.type === "bool") control = select([{ value: "", label: "(not set)" }, { value: "true", label: "true" }, { value: "false", label: "false" }]);
  else if (column.type === "enum") {
    const options = schema.enums[column.enum ?? ""] ?? [];
    control = select([...(column.required ? [] : [{ value: "", label: "(none)" }]), ...(value && !options.includes(value) ? [{ value, label: value }] : []), ...options.map((o) => ({ value: o, label: o }))]);
  } else if (column.type === "ref") {
    const options = refOptions(column, data);
    control = select([{ value: "", label: "(none)" }, ...(value && !options.includes(value) ? [{ value, label: value }] : []), ...options.map((o) => ({ value: o, label: o }))]);
  } else control = <input id={id} type="text" autoComplete="off" value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} className={`${INPUT} ${readOnly ? "bg-slate-50 text-slate-600" : ""}`} />;
  return (
    <FormRow id={id} label={label} hint={hint}>
      {control}
    </FormRow>
  );
}
