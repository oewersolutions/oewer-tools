"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { explainFailure, failedSteps, listDeployRuns, type DeployRun, type RunState } from "../../lib/admin/actions";
import { GithubError, type GithubSession } from "../../lib/admin/github";

const POLL_MS = 6000;
const GIVE_UP_MS = 15 * 60 * 1000;

const LABEL: Record<RunState, string> = { waiting: "Waiting to start", building: "Updating the site", live: "Live", failed: "Failed", cancelled: "Cancelled" };
const STYLE: Record<RunState, string> = {
  waiting: "bg-slate-100 text-slate-800",
  building: "bg-gold-300/40 text-gold-700",
  live: "bg-brand-100 text-brand-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-slate-100 text-slate-800",
};

const active = (r: DeployRun) => r.state === "waiting" || r.state === "building";

/**
 * Shows whether the site has been rebuilt after a save: the latest runs of the deploy workflow, refreshed every few
 * seconds while one is in progress. A failed run says why in plain words, and the live site is never replaced by one.
 */
export default function BuildStatus({ session, watchSha, siteUrl }: { session: GithubSession; watchSha?: string; siteUrl: string }) {
  const [runs, setRuns] = useState<DeployRun[]>();
  const [problem, setProblem] = useState<string>();
  const [failures, setFailures] = useState<Record<number, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startedWatching = useRef(Date.now());

  const refresh = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      const latest = await listDeployRuns(session, { limit: 5 });
      setRuns(latest);
      setProblem(undefined);
      for (const run of latest.filter((r) => r.state === "failed")) {
        void failedSteps(session, run.id)
          .then((steps) => setFailures((f) => (f[run.id] ? f : { ...f, [run.id]: explainFailure(steps) })))
          .catch(() => setFailures((f) => (f[run.id] ? f : { ...f, [run.id]: explainFailure([]) })));
      }
      const waitingForRun = watchSha !== undefined && !latest.some((r) => r.sha === watchSha);
      if ((latest.some(active) || waitingForRun) && Date.now() - startedWatching.current < GIVE_UP_MS) timer.current = setTimeout(refresh, POLL_MS);
    } catch (e) {
      setProblem(e instanceof GithubError ? e.message : "The build status could not be read.");
    }
  }, [session, watchSha]);

  useEffect(() => {
    startedWatching.current = Date.now();
    void refresh();
    return () => clearTimeout(timer.current);
  }, [refresh]);

  const latest = runs?.[0];
  const watched = watchSha ? runs?.find((r) => r.sha === watchSha) : undefined;
  const headline = !runs
    ? "Checking the site…"
    : watchSha && !watched
      ? "Your changes are saved. Waiting for GitHub to start updating the site…"
      : (watched ?? latest)?.state === "live"
        ? "The site is up to date."
        : (watched ?? latest)?.state === "failed"
          ? "The site could not be updated. The live site still shows the previous version."
          : (watched ?? latest)
            ? "Your changes are being published. This usually takes a minute or two."
            : "No site updates have run yet.";

  return (
    <section aria-labelledby="status-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="status-heading" className="font-display text-2xl font-semibold text-ink">
          Site status
        </h2>
        <div className="flex gap-2">
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-50">
            View the live site
          </a>
          <button type="button" onClick={() => void refresh()} className="rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-50">
            Check again
          </button>
        </div>
      </div>
      <p role="status" className="mt-3 font-medium text-ink">
        {problem ? "Build status is not available." : headline}
      </p>
      {problem && <p className="mt-1 text-sm text-slate-700">{problem}</p>}
      {runs && runs.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Recent site updates">
          {runs.map((r) => (
            <li key={r.id} className="rounded-xl bg-brand-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[r.state]}`}>{LABEL[r.state]}</span>
                  <span className="font-medium">{r.title || r.sha.slice(0, 7)}</span>
                </span>
                <span className="flex items-center gap-3 text-slate-700">
                  <time dateTime={r.updatedAt}>{new Date(r.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                    Details
                  </a>
                </span>
              </div>
              {r.state === "failed" && failures[r.id] && <p className="mt-2 text-red-900">{failures[r.id]}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
