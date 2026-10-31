"use client";

import { useEffect, useState } from "react";
import { listDeployRuns, type DeployRun } from "../../lib/admin/actions";
import { analyticsInfo, contentCounts, plainCounts } from "../../lib/admin/dashboard";
import { GithubError, type GithubSession } from "../../lib/admin/github";
import { listHistory, type HistoryEntry } from "../../lib/admin/history";
import type { WorkbookData } from "../../lib/workbook";
import type { MenuId } from "./AdminShell";
import { Card, PRIMARY_BUTTON, StatusPill, TOOLBAR_BUTTON } from "./views";

const when = (iso: string) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");
const STATE: Record<DeployRun["state"], string> = { waiting: "Waiting to start", building: "Updating the site", live: "Live", failed: "Failed", cancelled: "Cancelled" };

/** At-a-glance overview: how much content there is, the latest saves, and how the latest site update ended. */
export default function Dashboard({ session, data, refreshKey, onNavigate, onRebuild, rebuilding }: { session: GithubSession; data: WorkbookData; refreshKey: string; onNavigate: (id: MenuId) => void; onRebuild: () => void; rebuilding: boolean }) {
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

  const kpis: { label: string; menu: MenuId }[] = [
    { label: "Tools", menu: "tools" },
    { label: "Articles", menu: "articles" },
    { label: "Pages", menu: "sheets" },
  ];
  const counts = contentCounts(data);
  const tone = run ? ({ live: "good", failed: "bad", building: "warn", waiting: "warn", cancelled: "muted" } as const)[run.state] : "muted";

  return (
    <div className="space-y-5" aria-labelledby="dash-heading" role="region">
      <h2 id="dash-heading" className="sr-only">
        Dashboard
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((c, i) => (
          <button key={c.label} type="button" onClick={() => onNavigate(kpis[i]?.menu ?? "sheets")} role="group" aria-label={c.label} className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow">
            <p className="text-sm font-medium text-slate-600">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{c.published}</p>
            <p className="mt-1 text-sm text-slate-600">
              published · {c.draft} draft · {c.archived} archived
            </p>
          </button>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" role="group" aria-label="Analytics">
          <p className="text-sm font-medium text-slate-600">Visitor analytics</p>
          <p className="mt-2">
            <StatusPill tone={analytics.enabled ? "good" : "muted"}>{analytics.enabled ? "On" : "Off"}</StatusPill>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {analytics.enabled ? (
              <>
                Measuring with <code>{analytics.measurementId}</code>, only after visitors allow it.
              </>
            ) : (
              "Add your Google Analytics Measurement ID to switch it on."
            )}
          </p>
          {analytics.dashboardUrl ? (
            <a href={analytics.dashboardUrl} target="_blank" rel="noopener noreferrer" className={`${TOOLBAR_BUTTON} mt-3 inline-block`}>
              Open analytics reports
            </a>
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              No reports link yet. In All sheets → site_settings, set <code>analytics_dashboard_url</code> to your report&rsquo;s address.
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600">
        {plainCounts(data)
          .map((c) => `${c.total} ${c.label.toLowerCase()}`)
          .join(" · ")}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Latest site update</h3>
            <button type="button" className={PRIMARY_BUTTON} onClick={onRebuild} disabled={rebuilding}>
              {rebuilding ? "Starting…" : "Rebuild site"}
            </button>
          </div>
          {runProblem ? (
            <p className="mt-3 text-sm text-slate-700">{runProblem}</p>
          ) : run === undefined ? (
            <p className="mt-3 text-sm text-slate-700">Checking…</p>
          ) : run === null ? (
            <p className="mt-3 text-sm text-slate-700">No site updates have run yet.</p>
          ) : (
            <p className="mt-3 text-sm">
              <StatusPill tone={tone}>{STATE[run.state]}</StatusPill> · {run.title || run.sha.slice(0, 7)} · <time dateTime={run.updatedAt}>{when(run.updatedAt)}</time>{" "}
              <a href={run.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                Details
              </a>
            </p>
          )}
          <p className="mt-3 text-xs text-slate-600">A save rebuilds the site by itself. Use Rebuild site to publish again without changing anything, for example after a failed update.</p>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink">Recent saves</h3>
          {commitsProblem ? (
            <p className="mt-3 text-sm text-slate-700">{commitsProblem}</p>
          ) : !commits ? (
            <p className="mt-3 text-sm text-slate-700">Checking…</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm" aria-label="Recent saves">
              {commits.map((c) => (
                <li key={c.sha} className="py-2">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                    {c.title}
                  </a>{" "}
                  <span className="text-slate-600">
                    · {c.author} · <time dateTime={c.date}>{when(c.date)}</time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
