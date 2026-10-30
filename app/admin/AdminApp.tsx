"use client";

import { useMemo, useState } from "react";
import { NumberField, SelectField, TextAreaField } from "../../components/tools/ui";
import { loadWorkbook, readCell, saveWorkbook, setCell, EditError } from "../../lib/admin/edit";
import { commitWorkbook, GithubError, parseRepo, readWorkbookFile, verifySession, type GithubSession } from "../../lib/admin/github";
import { checkWorkbook, formatIssue, schema, type Issue } from "../../lib/workbook";

const WORKBOOK_PATH = "data/oewer_database.xlsx";

interface Loaded {
  session: GithubSession;
  canPush: boolean;
  bytes: Uint8Array;
  sha: string;
  issues: Issue[];
  rowCounts: [string, number][];
}

const button = "rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-50";
const secondary = "rounded-xl border border-brand px-5 py-2.5 font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50";

function describe(e: unknown): string {
  if (e instanceof GithubError || e instanceof EditError) return e.message;
  return "Something went wrong. Please try again.";
}

async function analyse(bytes: Uint8Array) {
  const result = await checkWorkbook(bytes as unknown as ArrayBuffer, bytes.byteLength);
  const rowCounts = Object.entries(result.data).map(([sheet, rows]): [string, number] => [sheet, rows.length]);
  return { issues: result.issues, rowCounts };
}

export default function AdminApp({ defaultRepo, defaultBranch }: { defaultRepo: string; defaultBranch: string }) {
  // The token lives only in this component's state: it is not saved to the page, the browser or the repository.
  const [repoText, setRepoText] = useState(defaultRepo);
  const [branch, setBranch] = useState(defaultBranch);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState<Loaded>();

  async function signIn() {
    setError(undefined);
    const repo = parseRepo(repoText);
    if (!repo) return setError("Enter the repository as owner/name, for example oewersolutions/oewer-tools.");
    if (!branch.trim()) return setError("Enter the branch name.");
    if (!token.trim()) return setError("Paste your GitHub token.");
    const session: GithubSession = { ...repo, branch: branch.trim(), path: WORKBOOK_PATH, token: token.trim() };
    setBusy(true);
    try {
      const { canPush } = await verifySession(session);
      const file = await readWorkbookFile(session);
      setLoaded({ session, canPush, bytes: file.bytes, sha: file.sha, ...(await analyse(file.bytes)) });
      setToken("");
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    if (!loaded) return;
    setError(undefined);
    setBusy(true);
    try {
      const file = await readWorkbookFile(loaded.session);
      setLoaded({ ...loaded, bytes: file.bytes, sha: file.sha, ...(await analyse(file.bytes)) });
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setLoaded(undefined);
    setToken("");
    setError(undefined);
  }

  if (!loaded) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void signIn();
        }}
        className="max-w-xl space-y-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-soft"
      >
        <NumberField label="Repository (owner/name)" value={repoText} onChange={setRepoText} />
        <NumberField label="Branch" value={branch} onChange={setBranch} />
        <div>
          <label htmlFor="admin-token" className="block text-sm font-semibold text-slate-800">
            GitHub token
          </label>
          <input
            id="admin-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base shadow-sm"
          />
          <p className="mt-2 text-sm text-slate-700">
            Use a fine-grained token limited to this one repository, with <strong>Contents: Read and write</strong> and nothing else. It stays in this page only and is forgotten when you sign out or close the tab.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={button}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    );
  }

  return <Workbook loaded={loaded} setLoaded={setLoaded} busy={busy} error={error} setError={setError} onReload={reload} onSignOut={signOut} />;
}

function Workbook({
  loaded,
  setLoaded,
  busy,
  error,
  setError,
  onReload,
  onSignOut,
}: {
  loaded: Loaded;
  setLoaded: (l: Loaded) => void;
  busy: boolean;
  error?: string;
  setError: (e?: string) => void;
  onReload: () => void;
  onSignOut: () => void;
}) {
  const sheets = Object.keys(schema.sheets);
  const [sheet, setSheet] = useState(sheets[0]!);
  const [row, setRow] = useState("2");
  const columns = useMemo(() => schema.sheets[sheet]!.columns.map((c) => c.name), [sheet]);
  const [column, setColumn] = useState(columns[0]!);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<{ bytes: Uint8Array; before: string; issues: Issue[] }>();
  const [saved, setSaved] = useState<{ url: string }>();

  const rowNumber = Number(row);
  const ref = { sheet, row: rowNumber, column };

  async function currentValue(): Promise<string> {
    try {
      return readCell(await loadWorkbook(loaded.bytes), schema, ref);
    } catch {
      return "";
    }
  }

  async function check() {
    setError(undefined);
    setSaved(undefined);
    setWorking(true);
    try {
      const wb = await loadWorkbook(loaded.bytes);
      const before = setCell(wb, schema, ref, value);
      const bytes = await saveWorkbook(wb);
      const { issues } = await analyse(bytes);
      setPreview({ bytes, before, issues });
      if (!message) setMessage(`Admin: change ${sheet} row ${row} ${column}`);
    } catch (e) {
      setPreview(undefined);
      setError(describe(e));
    } finally {
      setWorking(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setError(undefined);
    setWorking(true);
    try {
      const result = await commitWorkbook(loaded.session, preview.bytes, loaded.sha, message.trim() || `Admin: change ${sheet} row ${row} ${column}`);
      const { issues, rowCounts } = await analyse(preview.bytes);
      setLoaded({ ...loaded, bytes: preview.bytes, sha: result.fileSha, issues, rowCounts });
      setSaved({ url: result.commitUrl });
      setPreview(undefined);
    } catch (e) {
      setError(describe(e));
    } finally {
      setWorking(false);
    }
  }

  const existing = preview?.before;
  const blockers = preview?.issues ?? [];

  return (
    <div className="space-y-8">
      <section aria-labelledby="wb-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="wb-heading" className="font-display text-2xl font-semibold text-ink">
            Signed in to {loaded.session.owner}/{loaded.session.repo}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={onReload} disabled={busy} className={secondary}>
              Reload
            </button>
            <button type="button" onClick={onSignOut} className={secondary}>
              Sign out
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          Branch <strong>{loaded.session.branch}</strong> · {loaded.session.path} · version <code>{loaded.sha.slice(0, 7)}</code> · {(loaded.bytes.length / 1024).toFixed(1)} KB
        </p>
        {!loaded.canPush && (
          <p role="status" className="mt-3 rounded-lg bg-gold-300/30 p-3 text-sm">
            This token can only read the repository, so changes cannot be saved. Create a token with <strong>Contents: Read and write</strong>.
          </p>
        )}
        <p role="status" className={`mt-3 font-medium ${loaded.issues.length === 0 ? "text-brand" : "text-red-800"}`}>
          {loaded.issues.length === 0 ? "The workbook is valid." : `The workbook has ${loaded.issues.length} problem(s):`}
        </p>
        {loaded.issues.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-red-800">
            {loaded.issues.slice(0, 10).map((i, n) => (
              <li key={n}>{formatIssue(i)}</li>
            ))}
          </ul>
        )}
        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-600">Sheets</h3>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {loaded.rowCounts.map(([name, count]) => (
            <li key={name} className="flex justify-between border-b border-brand-100 py-1">
              <span>{name}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="edit-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <h2 id="edit-heading" className="font-display text-2xl font-semibold text-ink">
          Change one cell
        </h2>
        <p className="mt-1 text-sm text-slate-700">A first, simple editor to prove saving works. Row 2 is the first data row; row 1 holds the column names.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
          className="mt-5 grid gap-5 md:grid-cols-3"
        >
          <SelectField
            label="Sheet"
            value={sheet}
            onChange={(s) => {
              setSheet(s);
              setColumn(schema.sheets[s]!.columns[0]!.name);
              setPreview(undefined);
            }}
            options={sheets.map((s) => ({ value: s, label: s }))}
          />
          <NumberField label="Row" value={row} onChange={(v) => { setRow(v); setPreview(undefined); }} />
          <SelectField label="Column" value={column} onChange={(c) => { setColumn(c); setPreview(undefined); }} options={columns.map((c) => ({ value: c, label: c }))} />
          <div className="md:col-span-3">
            <TextAreaField label="New value" value={value} onChange={(v) => { setValue(v); setPreview(undefined); }} rows={3} />
            <button type="button" className="mt-2 text-sm font-medium text-brand-700 hover:underline" onClick={async () => setValue(await currentValue())}>
              Fill in the current value
            </button>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={working} className={button}>
              Check this change
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="mt-5 text-red-800">
            <p>{error}</p>
            {error.includes("changed on GitHub") && (
              <button type="button" onClick={onReload} className={`${secondary} mt-3`}>
                Reload the latest workbook
              </button>
            )}
          </div>
        )}

        {preview && (
          <div className="mt-6 space-y-4 rounded-xl bg-brand-50 p-5" role="status">
            <p>
              <strong>{sheet}</strong>, row {row}, <strong>{column}</strong>: <span className="line-through">{existing || "(empty)"}</span> → <strong>{value || "(empty)"}</strong>
            </p>
            {blockers.length === 0 ? (
              <p className="font-medium text-brand">The workbook is still valid after this change.</p>
            ) : (
              <div className="text-red-800">
                <p className="font-medium">This change would leave {blockers.length} problem(s), so it cannot be saved:</p>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                  {blockers.slice(0, 10).map((i, n) => (
                    <li key={n}>{formatIssue(i)}</li>
                  ))}
                </ul>
              </div>
            )}
            <TextAreaField label="Commit message" value={message} onChange={setMessage} rows={2} />
            <button type="button" onClick={() => void commit()} disabled={working || blockers.length > 0 || !loaded.canPush} className={button}>
              {working ? "Saving…" : "Save to GitHub"}
            </button>
          </div>
        )}

        {saved && (
          <p role="status" className="mt-5 font-medium text-brand">
            Saved. <a href={saved.url} className="underline" rel="noopener noreferrer">View the commit on GitHub</a>. The site rebuilds automatically.
          </p>
        )}
      </section>
    </div>
  );
}
