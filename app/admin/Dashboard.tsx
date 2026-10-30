"use client";

import { useEffect, useState } from "react";
import { listDeployRuns, type DeployRun } from "../../lib/admin/actions";
import { analyticsInfo, contentCounts, plainCounts } from "../../lib/admin/dashboard";
import { GithubError, type GithubSession } from "../../lib/admin/github";
import { listHistory, type HistoryEntry } from "../../lib/admin/history";
import type { WorkbookData } from "../../lib/workbook";

const when = (iso: string) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");
const STATE: Record<DeployRun["state"], string> = { waiting: "Waiting to start", building: "Updating the site", live: "Live", failed: "Failed", cancelled: "Cancelled" };

/** At-a-glance overview: how much content there is, the latest saves, and how the latest site update ended. */
export default function Dashboard({ session, data, refreshKey }: { session: GithubSession; data: WorkbookData; refreshKey: string }) {
  const [commits, setCommits] = useState<HistoryEntry[]>();
  const [commitsProblem, setCommitsProblem] = useState<string>();
  const [run, setRun] = useState<DeployRun | null>();
  const [runProblem, setRunProblem] = useState<string>();

  useEffect(() => {
    let current = true;
    setCommitsProblem(undefined);
    setRunProblem(undefined);
    listHistory(session, 5).then(
      (c) => current && setCommits(c),
      (e) => current && setCommitsProblem(e instanceof GithubError ? e.message : "Recent saves could not be read."),
    );
    listDeployRuns(session, { limit: 1 }).then(
      (r) => current && setRun(r[0] ?? null),
      (e) => current && setRunProblem(e instanceof GithubError && e.kind === "forbidden" ? "Not available: the token needs the Actions: Read permission." : "The latest site update could not be read."),
    );
    return () => {
      current = false;
    };
  }, [session, refreshKey]);

  const analytics = analyticsInfo(data);

  return (
    <section aria-labelledby="dash-heading" className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
      <h2 id="dash-heading" className="font-display text-2xl font-semibold text-ink">
        Dashboard
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {contentCounts(data).map((c) => (
          <div key={c.label} className="rounded-xl bg-brand-50 p-4" role="group" aria-label={c.label}>
            <p className="text-sm font-semibold text-slate-800">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{c.published}</p>
            <p className="text-sm text-slate-700">
              published · {c.draft} draft · {c.archived} archived
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {plainCounts(data)
          .map((c) => `${c.total} ${c.label.toLowerCase()}`)
          .join(" · ")}
      </p>

      <div className="mt-5 rounded-xl bg-brand-50 p-4" role="group" aria-label="Analytics">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Visitor analytics</h3>
            <p className="mt-1 text-sm text-slate-800">
              {analytics.enabled ? (
                <>
                  On, measuring with <code>{analytics.measurementId}</code>. Visitors are counted only after they allow it.
                </>
              ) : (
                <>Off. Add your Google Analytics Measurement ID to switch it on.</>
              )}
            </p>
          </div>
          {analytics.dashboardUrl && (
            <a href={analytics.dashboardUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700">
              Open analytics reports
            </a>
          )}
        </div>
        {!analytics.dashboardUrl && (
          <p className="mt-2 text-sm text-slate-700">
            No reports link yet. In <strong>All sheets → site_settings</strong>, set <code>analytics_dashboard_url</code> to the address of your Google Analytics (or Looker Studio) report, and set <code>analytics_measurement_id</code> to turn counting on.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-ink">Latest site update</h3>
          {runProblem ? (
            <p className="mt-2 text-sm text-slate-700">{runProblem}</p>
          ) : run === undefined ? (
            <p className="mt-2 text-sm text-slate-700">Checking…</p>
          ) : run === null ? (
            <p className="mt-2 text-sm text-slate-700">No site updates have run yet.</p>
          ) : (
            <p className="mt-2 text-sm">
              <strong>{STATE[run.state]}</strong> · {run.title || run.sha.slice(0, 7)} · <time dateTime={run.updatedAt}>{when(run.updatedAt)}</time>{" "}
              <a href={run.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                Details
              </a>
            </p>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-ink">Recent saves</h3>
          {commitsProblem ? (
            <p className="mt-2 text-sm text-slate-700">{commitsProblem}</p>
          ) : !commits ? (
            <p className="mt-2 text-sm text-slate-700">Checking…</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm" aria-label="Recent saves">
              {commits.map((c) => (
                <li key={c.sha}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                    {c.title}
                  </a>{" "}
                  <span className="text-slate-700">
                    · {c.author} · <time dateTime={c.date}>{when(c.date)}</time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
