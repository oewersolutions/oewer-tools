"use client";

import { useEffect, useState } from "react";
import { NumberField } from "../../components/tools/ui";
import { GithubError, parseRepo, readWorkbookFile, verifySession, type GithubSession } from "../../lib/admin/github";
import { EditError } from "../../lib/admin/edit";
import { checkWorkbook, formatIssue, type Issue, type WorkbookData } from "../../lib/workbook";
import BuildStatus from "./BuildStatus";
import Dashboard from "./Dashboard";
import History from "./History";
import Manager from "./Manager";
import { absoluteUrl } from "../../lib/seo";

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
  data: WorkbookData;
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
  return { issues: result.issues, rowCounts, data: result.data };
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
            Use a fine-grained token limited to this one repository, with <strong>Contents: Read and write</strong>, plus <strong>Actions: Read</strong> if you want to see whether the site has been updated after a save. Nothing else is needed. It stays in this page only and is forgotten when you sign out, after 30 minutes without activity, or when you close the tab.
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
  const [watchSha, setWatchSha] = useState<string>();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const siteSetting = (loaded.data.site_settings ?? []).find((r) => r.values.setting_key === "site_url");
  const siteUrl = absoluteUrl(process.env.NEXT_PUBLIC_SITE_URL || String(siteSetting?.values.setting_value ?? "https://example.com"), basePath, "/");

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
        {error && (
          <p role="alert" className="mt-3 text-red-800">
            {error}
          </p>
        )}
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
      </section>

      <Dashboard session={loaded.session} data={loaded.data} refreshKey={loaded.sha} />

      <BuildStatus session={loaded.session} watchSha={watchSha} siteUrl={siteUrl} />

      <History
        session={loaded.session}
        current={{ bytes: loaded.bytes, sha: loaded.sha, size: loaded.bytes.length }}
        canPush={loaded.canPush}
        onRestored={async (base, commitSha) => {
          setWatchSha(commitSha);
          setLoaded({ ...loaded, bytes: base.bytes, sha: base.sha, ...(await analyse(base.bytes)) });
        }}
      />

      <Manager
        onPublished={setWatchSha}
        file={{ session: loaded.session, canPush: loaded.canPush, bytes: loaded.bytes, sha: loaded.sha, data: loaded.data, issues: loaded.issues }}
        onSaved={async (base) => setLoaded({ ...loaded, bytes: base.bytes, sha: base.sha, ...(await analyse(base.bytes)) })}
      />
    </div>
  );
}
