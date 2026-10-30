"use client";

import { useState } from "react";
import { GithubError, type GithubSession, type WorkbookFile } from "../../lib/admin/github";
import { listHistory, restoreVersion, type HistoryEntry } from "../../lib/admin/history";
import { formatIssue } from "../../lib/workbook";

const secondary = "rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50";
const primary = "rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-50";

/**
 * Past versions of the workbook, from Git. Restoring commits the old version as a new one (after a confirmation),
 * so history is never rewritten and a restore can itself be undone.
 */
export default function History({
  session,
  current,
  canPush,
  onRestored,
}: {
  session: GithubSession;
  current: WorkbookFile;
  canPush: boolean;
  onRestored: (base: WorkbookFile, commitSha: string) => Promise<void>;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>();
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [confirming, setConfirming] = useState<string>();
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string>();

  const fail = (e: unknown) => setProblem(e instanceof GithubError ? e.message : "Something went wrong talking to GitHub. Try again.");

  async function load() {
    setLoading(true);
    setProblem(undefined);
    try {
      setEntries(await listHistory(session));
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function restore(entry: HistoryEntry) {
    setWorking(true);
    setProblem(undefined);
    setDone(undefined);
    try {
      const result = await restoreVersion(session, entry, current);
      if (result.status === "unchanged") {
        setProblem("That version is the same as the current one, so there is nothing to restore.");
      } else if (result.status === "invalid") {
        setProblem(`That version is no longer valid under today's rules, so it was not restored (${result.issues.length} problem(s)). First: ${formatIssue(result.issues[0]!)}`);
      } else {
        setConfirming(undefined);
        setDone(`Restored version ${entry.sha.slice(0, 7)}. The site will update shortly.`);
        await onRestored(result.base, result.commit.commitSha);
        await load();
      }
    } catch (e) {
      fail(e);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section aria-labelledby="history-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="history-heading" className="font-display text-2xl font-semibold text-ink">
          History
        </h2>
        <button type="button" className={secondary} onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : entries ? "Refresh" : "Show earlier versions"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-700">Every save is a version kept in Git. Restoring one saves it as a new version on top, so nothing is lost.</p>
      {problem && (
        <p role="alert" className="mt-3 text-red-800">
          {problem}
        </p>
      )}
      {done && (
        <p role="status" className="mt-3 font-medium text-brand">
          {done}
        </p>
      )}
      {entries && entries.length === 0 && <p className="mt-3 text-sm text-slate-700">No versions found.</p>}
      {entries && entries.length > 0 && (
        <ol className="mt-4 space-y-2" aria-label="Earlier versions">
          {entries.map((e, i) => (
            <li key={e.sha} className="rounded-xl bg-brand-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{e.title}</span>
                  {i === 0 && <span className="ml-2 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-900">Latest</span>}
                </span>
                <span className="flex items-center gap-3 text-slate-700">
                  <span>{e.author}</span>
                  <time dateTime={e.date}>{e.date ? new Date(e.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}</time>
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                    <code>{e.sha.slice(0, 7)}</code>
                  </a>
                  {i > 0 && (
                    <button type="button" className={secondary} disabled={!canPush || working} aria-label={`Restore version ${e.sha.slice(0, 7)}`} onClick={() => setConfirming(e.sha)}>
                      Restore
                    </button>
                  )}
                </span>
              </div>
              {confirming === e.sha && (
                <div role="alertdialog" aria-label={`Confirm restore of ${e.sha.slice(0, 7)}`} className="mt-3 rounded-lg border border-gold-500/40 bg-cream p-4">
                  <p className="font-medium text-ink">Restore the workbook to “{e.title}”?</p>
                  <p className="mt-1 text-slate-800">
                    Content saved after this version will be replaced on the live site once it rebuilds. Your pending, unsaved changes stay in the editor and are applied on top. You can undo this by restoring a later version.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={primary} disabled={working} onClick={() => void restore(e)}>
                      {working ? "Restoring…" : "Yes, restore this version"}
                    </button>
                    <button type="button" className={secondary} disabled={working} onClick={() => setConfirming(undefined)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
