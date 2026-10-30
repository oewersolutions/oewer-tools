import { commitWorkbook, githubCall, readWorkbookFile, repoUrl, type CommitResult, type GithubSession, type WorkbookFile } from "./github";
import { checkWorkbook, type Issue } from "../workbook";

type Fetch = typeof fetch;

export interface HistoryEntry {
  sha: string;
  /** First line of the commit message. */
  title: string;
  author: string;
  /** ISO date-time. */
  date: string;
  url: string;
}

/** Past versions of the workbook, newest first: every commit on the branch that changed the workbook file. */
export async function listHistory(session: GithubSession, limit = 30, doFetch?: Fetch): Promise<HistoryEntry[]> {
  const url = `${repoUrl(session)}/commits?sha=${encodeURIComponent(session.branch)}&path=${encodeURIComponent(session.path)}&per_page=${limit}`;
  const rows = (await (await githubCall(session, url, {}, doFetch)).json()) as {
    sha: string;
    html_url: string;
    commit: { message: string; author?: { name?: string; date?: string } | null };
    author?: { login?: string } | null;
  }[];
  return rows.map((r) => ({
    sha: r.sha,
    title: r.commit.message.split("\n")[0] ?? "",
    author: r.author?.login ?? r.commit.author?.name ?? "unknown",
    date: r.commit.author?.date ?? "",
    url: r.html_url,
  }));
}

export type RestoreResult =
  | { status: "restored"; commit: CommitResult; base: WorkbookFile }
  /** The old version is not a valid workbook by today's rules, so it is not restored. */
  | { status: "invalid"; issues: Issue[] }
  /** The old version is already what is on GitHub. */
  | { status: "unchanged" };

export const restoreMessage = (entry: HistoryEntry) => `Restore workbook to version ${entry.sha.slice(0, 7)}: ${entry.title}`;

/**
 * Restore means committing the old bytes as a new version, so nothing is erased from history and the restore
 * itself can be undone the same way. `current` is the version now on GitHub; GitHub refuses if it has moved on.
 */
export async function restoreVersion(session: GithubSession, entry: HistoryEntry, current: WorkbookFile, doFetch?: Fetch): Promise<RestoreResult> {
  const old = await readWorkbookFile(session, doFetch, entry.sha);
  if (old.sha === current.sha) return { status: "unchanged" };
  const { issues } = await checkWorkbook(old.bytes as unknown as ArrayBuffer, old.bytes.byteLength);
  if (issues.length > 0) return { status: "invalid", issues };
  const commit = await commitWorkbook(session, old.bytes, current.sha, restoreMessage(entry), doFetch);
  return { status: "restored", commit, base: { bytes: old.bytes, sha: commit.fileSha, size: old.bytes.length } };
}
