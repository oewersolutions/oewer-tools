"use client";

import { useEffect, useMemo, useState } from "react";
import { NumberField, SelectField, TextAreaField } from "../../components/tools/ui";
import { commitMessageFor, describeChange, queueSet, recordIdAt, type Change, type Conflict } from "../../lib/admin/changes";
import { loadWorkbook, readCell, coerceValue, EditError } from "../../lib/admin/edit";
import { commitWorkbook, GithubError, parseRepo, readWorkbookFile, verifySession, type GithubSession, type WorkbookFile } from "../../lib/admin/github";
import { saveChanges, type Repo } from "../../lib/admin/save";
import { checkWorkbook, formatIssue, schema, type Issue } from "../../lib/workbook";

const WORKBOOK_PATH = "data/oewer_database.xlsx";
const STORAGE_KEY = "oewer-admin-session";
/** Sign out after this long without a click or key press. */
export const IDLE_MS = 30 * 60 * 1000;

// "Remember for this tab" keeps the token in sessionStorage: it survives a reload of this tab only, never reaches other tabs
// or later visits, and is removed on sign-out. It is off by default, because anything stored can be read by a script on the page.
function readRemembered(): { repo: string; branch: string; token: string } | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as { repo?: string; branch?: string; token?: string } | null;
    return value?.repo && value.branch && value.token ? { repo: value.repo, branch: value.branch, token: value.token } : undefined;
  } catch {
    return undefined;
  }
}
// Why a remembered session was dropped. Kept in session storage too, because the page can start up twice and the second
// start must still be able to tell the person; it is cleared when they sign in again.
const NOTICE_KEY = "oewer-admin-notice";
function readNotice(): string | undefined {
  try {
    return sessionStorage.getItem(NOTICE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
function writeNotice(text: string | undefined) {
  try {
    if (text) sessionStorage.setItem(NOTICE_KEY, text);
    else sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    // ignore
  }
}
function remember(value: { repo: string; branch: string; token: string } | undefined) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: the session simply is not remembered
  }
}

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

/** Check the token, download the workbook and check it. Throws a GithubError for anything the person should be told. */
async function openSession(session: GithubSession): Promise<Loaded> {
  const { canPush } = await verifySession(session);
  const file = await readWorkbookFile(session);
  return { session, canPush, bytes: file.bytes, sha: file.sha, ...(await analyse(file.bytes)) };
}

// Resuming a remembered session happens once per page load. The framework can mount this component twice while the page starts
// up, so both mounts share one attempt (and one result) instead of each making its own.
type Resume = { loaded: Loaded; saved: { repo: string; branch: string } } | { error: string; saved: { repo: string; branch: string } };
let resuming: Promise<Resume | undefined> | undefined;
function resumeOnce(): Promise<Resume | undefined> {
  resuming ??= (async () => {
    const saved = readRemembered();
    if (!saved) return undefined;
    const repo = parseRepo(saved.repo);
    if (!repo) {
      remember(undefined);
      return undefined;
    }
    try {
      return { loaded: await openSession({ ...repo, branch: saved.branch, path: WORKBOOK_PATH, token: saved.token }), saved };
    } catch (e) {
      remember(undefined); // the token no longer works, so stop keeping it
      writeNotice(describe(e));
      return { error: describe(e), saved };
    }
  })();
  return resuming;
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
  const [keep, setKeep] = useState(false);
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    const dropped = readNotice();
    if (dropped) setNotice(`Your saved session was not used. ${dropped}`);
  }, []);

  async function signIn(values = { repo: repoText, branch, token }) {
    setError(undefined);
    setNotice(undefined);
    writeNotice(undefined);
    const repo = parseRepo(values.repo);
    if (!repo) return setError("Enter the repository as owner/name, for example oewersolutions/oewer-tools.");
    if (!values.branch.trim()) return setError("Enter the branch name.");
    if (!values.token.trim()) return setError("Paste your GitHub token.");
    const session: GithubSession = { ...repo, branch: values.branch.trim(), path: WORKBOOK_PATH, token: values.token.trim() };
    setBusy(true);
    try {
      setLoaded(await openSession(session));
      setToken("");
      if (keep) remember({ repo: values.repo, branch: values.branch.trim(), token: session.token });
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  // Pick up a session remembered for this tab (after a reload).
  useEffect(() => {
    let current = true;
    setBusy(true);
    void resumeOnce().then((result) => {
      if (!current) return;
      setBusy(false);
      if (!result) return;
      setRepoText(result.saved.repo);
      setBranch(result.saved.branch);
      if ("loaded" in result) {
        setKeep(true);
        setLoaded(result.loaded);
      } else {
        setNotice(`Your saved session was not used. ${result.error}`);
      }
    });
    return () => {
      current = false;
    };
  }, []);

  // Sign out after a period without activity.
  useEffect(() => {
    if (!loaded) return;
    let timer = setTimeout(expire, IDLE_MS);
    function expire() {
      signOut();
      setNotice("You were signed out after 30 minutes without activity.");
    }
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(expire, IDLE_MS);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [loaded]);

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
    resuming = Promise.resolve(undefined); // a later mount must not bring the old session back
    remember(undefined);
    setLoaded(undefined);
    setToken("");
    setKeep(false);
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
            Use a fine-grained token limited to this one repository, with <strong>Contents: Read and write</strong> and nothing else. It stays in this page only and is forgotten when you sign out, after 30 minutes without activity, or when you close the tab.
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="mt-1" />
            <span>Keep me signed in if I reload this tab. The token is then kept in this tab&rsquo;s session storage until you sign out. Leave this off on a shared computer.</span>
          </label>
        </div>
        {notice && (
          <p role="status" className="text-slate-800">
            {notice}
          </p>
        )}
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
  const [pending, setPending] = useState<Change[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [problems, setProblems] = useState<Issue[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [choices, setChoices] = useState<Record<number, "theirs" | "mine">>({});
  const [saved, setSaved] = useState<{ url: string; rebased: boolean }>();

  const repo: Repo = useMemo(
    () => ({
      read: () => readWorkbookFile(loaded.session),
      commit: (bytes, sha, text) => commitWorkbook(loaded.session, bytes, sha, text),
    }),
    [loaded.session],
  );

  function resetOutcome() {
    setSaved(undefined);
    setProblems([]);
    setError(undefined);
  }

  async function currentValue(): Promise<string> {
    try {
      return readCell(await loadWorkbook(loaded.bytes), schema, { sheet, row: Number(row), column });
    } catch {
      return "";
    }
  }

  async function addPending() {
    resetOutcome();
    setWorking(true);
    try {
      const wb = await loadWorkbook(loaded.bytes);
      const pk = recordIdAt(wb, schema, sheet, Number(row));
      if (!pk) throw new EditError("That row has no ID, so it cannot be changed.");
      coerceValue(schema.sheets[sheet]!.columns.find((c) => c.name === column)!, value); // reject a wrong kind of value now
      const before = readCell(wb, schema, { sheet, row: Number(row), column });
      setPending((p) => queueSet(p, { type: "set", sheet, pk, column, before, after: value }));
      setConflicts([]);
    } catch (e) {
      setError(describe(e));
    } finally {
      setWorking(false);
    }
  }

  async function run(changes: Change[], base: WorkbookFile, force: ReadonlySet<number>) {
    resetOutcome();
    setWorking(true);
    try {
      const text = message.trim() || commitMessageFor(changes);
      const result = await saveChanges(repo, base, changes, text, force);
      if (result.status === "saved") {
        setLoaded({ ...loaded, bytes: result.base.bytes, sha: result.base.sha, ...(await analyse(result.base.bytes)) });
        setSaved({ url: result.commit.commitUrl, rebased: result.rebased });
        setPending([]);
        setConflicts([]);
        setChoices({});
        setMessage("");
      } else if (result.status === "invalid") {
        setProblems(result.issues);
      } else {
        // Work from the newest version from now on, and let the person decide each clash.
        setLoaded({ ...loaded, bytes: result.base.bytes, sha: result.base.sha, ...(await analyse(result.base.bytes)) });
        setConflicts(result.conflicts);
        setChoices({});
      }
    } catch (e) {
      setError(describe(e));
    } finally {
      setWorking(false);
    }
  }

  const base: WorkbookFile = { bytes: loaded.bytes, sha: loaded.sha, size: loaded.bytes.length };
  const unresolved = conflicts.filter((c) => !choices[c.index]);

  function saveWithChoices() {
    const drop = new Set(conflicts.filter((c) => choices[c.index] === "theirs").map((c) => c.index));
    const force = new Set(conflicts.filter((c) => choices[c.index] === "mine").map((c) => c.index));
    const remaining = pending.filter((_, i) => !drop.has(i));
    // Indexes shift when changes are dropped, so translate the forced ones.
    const forced = new Set<number>();
    pending.forEach((_, i) => {
      if (force.has(i)) forced.add(remaining.indexOf(pending[i]!));
    });
    setPending(remaining);
    if (remaining.length === 0) {
      setConflicts([]);
      setChoices({});
      return;
    }
    void run(remaining, base, forced);
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="wb-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="wb-heading" className="font-display text-2xl font-semibold text-ink">
            Signed in to {loaded.session.owner}/{loaded.session.repo}
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={onReload} disabled={busy || pending.length > 0} title={pending.length > 0 ? "Save or discard your pending changes first" : undefined} className={secondary}>
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
          Change a cell
        </h2>
        <p className="mt-1 text-sm text-slate-700">Add as many changes as you like, then save them together as one commit. Row 2 is the first data row; row 1 holds the column names.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addPending();
          }}
          className="mt-5 grid gap-5 md:grid-cols-3"
        >
          <SelectField
            label="Sheet"
            value={sheet}
            onChange={(s) => {
              setSheet(s);
              setColumn(schema.sheets[s]!.columns[0]!.name);
            }}
            options={sheets.map((s) => ({ value: s, label: s }))}
          />
          <NumberField label="Row" value={row} onChange={setRow} />
          <SelectField label="Column" value={column} onChange={setColumn} options={columns.map((c) => ({ value: c, label: c }))} />
          <div className="md:col-span-3">
            <TextAreaField label="New value" value={value} onChange={setValue} rows={3} />
            <button type="button" className="mt-2 text-sm font-medium text-brand-700 hover:underline" onClick={async () => setValue(await currentValue())}>
              Fill in the current value
            </button>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={working} className={button}>
              Add to pending changes
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="pending-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
        <h2 id="pending-heading" className="font-display text-2xl font-semibold text-ink">
          Pending changes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-slate-700">Nothing yet. Changes you add appear here and are only saved when you press Save.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {pending.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-brand-50 p-3 text-sm">
                <span>{describeChange(c)}</span>
                <button type="button" onClick={() => { resetOutcome(); setConflicts([]); setPending((p) => p.filter((_, n) => n !== i)); }} className="shrink-0 font-medium text-brand-700 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div role="alert" className="mt-5 text-red-800">
            <p>{error}</p>
          </div>
        )}

        {problems.length > 0 && (
          <div role="alert" className="mt-5 text-red-800">
            <p className="font-medium">These changes would leave {problems.length} problem(s) in the workbook, so nothing was saved:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              {problems.slice(0, 10).map((i, n) => (
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
                {c.kind === "changed" && (
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
            <button type="button" onClick={() => void run(pending, base, new Set())} disabled={working || !loaded.canPush} className={button}>
              {working ? "Saving…" : `Save ${pending.length} change${pending.length === 1 ? "" : "s"} to GitHub`}
            </button>
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
