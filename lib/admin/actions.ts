import { githubCall, GithubError, type GithubSession } from "./github";

/**
 * Build and publish status, read from the GitHub Actions runs of the deploy workflow. Reading runs needs the token to
 * have the "Actions: Read" permission as well as "Contents"; without it the status is simply unavailable.
 */

export const DEPLOY_WORKFLOW = "deploy.yml";

export type RunState = "waiting" | "building" | "live" | "failed" | "cancelled";

export interface DeployRun {
  id: number;
  sha: string;
  /** The commit's first line. */
  title: string;
  state: RunState;
  url: string;
  startedAt: string;
  updatedAt: string;
}

export function runState(status: string, conclusion: string | null): RunState {
  if (status === "completed") {
    if (conclusion === "success") return "live";
    if (conclusion === "cancelled" || conclusion === "skipped") return "cancelled";
    return "failed";
  }
  return status === "in_progress" ? "building" : "waiting";
}

interface RawRun {
  id: number;
  head_sha: string;
  display_title?: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
}

const toRun = (r: RawRun): DeployRun => ({
  id: r.id,
  sha: r.head_sha,
  title: r.display_title ?? "",
  state: runState(r.status, r.conclusion),
  url: r.html_url,
  startedAt: r.run_started_at ?? r.created_at,
  updatedAt: r.updated_at,
});

const NO_ACCESS = "The token cannot read build status. Add the Actions: Read permission to it to see whether the site has been updated. Your changes are still saved.";

async function actionsCall(session: GithubSession, path: string, doFetch?: typeof fetch): Promise<Response> {
  try {
    return await githubCall(session, `https://api.github.com/repos/${encodeURIComponent(session.owner)}/${encodeURIComponent(session.repo)}${path}`, {}, doFetch);
  } catch (e) {
    if (e instanceof GithubError && (e.kind === "forbidden" || e.kind === "not_found")) throw new GithubError("forbidden", NO_ACCESS, e.status);
    throw e;
  }
}

/** The latest deploy runs on the branch, newest first, or only those for one commit. */
export async function listDeployRuns(session: GithubSession, options: { sha?: string; limit?: number } = {}, doFetch?: typeof fetch): Promise<DeployRun[]> {
  const query = new URLSearchParams({ branch: session.branch, per_page: String(options.limit ?? 5) });
  if (options.sha) query.set("head_sha", options.sha);
  const response = await actionsCall(session, `/actions/workflows/${DEPLOY_WORKFLOW}/runs?${query}`, doFetch);
  return ((await response.json()) as { workflow_runs: RawRun[] }).workflow_runs.map(toRun);
}

/** Names of the steps that failed in a run, in order. */
export async function failedSteps(session: GithubSession, runId: number, doFetch?: typeof fetch): Promise<string[]> {
  const response = await actionsCall(session, `/actions/runs/${runId}/jobs`, doFetch);
  const { jobs } = (await response.json()) as { jobs: { name: string; conclusion: string | null; steps?: { name: string; conclusion: string | null }[] }[] };
  const steps = jobs.flatMap((j) => (j.steps ?? []).filter((s) => s.conclusion === "failure").map((s) => s.name));
  return steps.length > 0 ? steps : jobs.filter((j) => j.conclusion === "failure").map((j) => j.name);
}

/** What a failed step means for the person editing, in plain words. */
export function explainFailure(steps: string[]): string {
  const has = (re: RegExp) => steps.some((s) => re.test(s));
  if (has(/validate workbook/i)) return "The workbook did not pass validation, so the site was not updated. Open the run to see which rows have problems, fix them and save again.";
  if (has(/typecheck|test/i)) return "The automatic checks failed, so the site was not updated.";
  if (has(/build/i)) return "The site could not be built, so the live site was left as it was. Open the run for the error message.";
  if (has(/deploy|pages/i)) return "The site was built but could not be published. Check that GitHub Pages is set to deploy from GitHub Actions in the repository settings.";
  return "The update failed, so the live site was left as it was. Open the run for details.";
}

const NO_DISPATCH = "The token cannot start a site update. Add the Actions: Read and write permission to it, then sign in again.";

/** Start the deploy workflow by hand on the session's branch: the same build a save triggers, without needing a new commit. */
export async function rebuildSite(session: GithubSession, doFetch?: typeof fetch): Promise<void> {
  try {
    await githubCall(
      session,
      `https://api.github.com/repos/${encodeURIComponent(session.owner)}/${encodeURIComponent(session.repo)}/actions/workflows/${DEPLOY_WORKFLOW}/dispatches`,
      { method: "POST", body: JSON.stringify({ ref: session.branch }) },
      doFetch,
    );
  } catch (e) {
    if (e instanceof GithubError && (e.kind === "forbidden" || e.kind === "not_found")) throw new GithubError("forbidden", NO_DISPATCH, e.status);
    throw e;
  }
}
