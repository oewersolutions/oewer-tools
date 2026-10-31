/**
 * Minimal GitHub client for the admin page. It talks to api.github.com straight from the browser using a
 * fine-grained token the person pastes in. Nothing here stores the token, and `fetch` can be replaced in tests.
 */

export interface GithubTarget {
  owner: string;
  repo: string;
  branch: string;
  /** Path of the workbook inside the repository. */
  path: string;
}

export interface GithubSession extends GithubTarget {
  token: string;
}

export type GithubErrorKind = "auth" | "forbidden" | "not_found" | "conflict" | "rate_limit" | "network" | "other";

export class GithubError extends Error {
  constructor(
    public kind: GithubErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GithubError";
  }
}

type Fetch = typeof fetch;

const API = "https://api.github.com";

/** "owner/name" -> parts, or null when it is not in that form. */
export function parseRepo(text: string): { owner: string; repo: string } | null {
  const match = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/.exec(text.trim());
  return match ? { owner: match[1]!, repo: match[2]! } : null;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/\s/g, ""));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");
export const repoUrl = (t: GithubTarget) => `${API}/repos/${encodeURIComponent(t.owner)}/${encodeURIComponent(t.repo)}`;

export async function githubCall(session: GithubSession, url: string, init: RequestInit = {}, doFetch: Fetch = fetch): Promise<Response> {
  let response: Response;
  try {
    response = await doFetch(url, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${session.token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new GithubError("network", "Could not reach GitHub. Check your connection and try again.");
  }
  if (response.ok) return response;

  let detail = "";
  try {
    detail = ((await response.json()) as { message?: string }).message ?? "";
  } catch {
    // no JSON body
  }
  if (response.status === 401) throw new GithubError("auth", "GitHub did not accept the token. It may be wrong, expired or revoked.", 401);
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    throw new GithubError("rate_limit", "GitHub's rate limit was reached. Wait a few minutes and try again.", 403);
  }
  if (response.status === 403) throw new GithubError("forbidden", "The token is not allowed to do that. It needs read and write access to this repository's contents.", 403);
  if (response.status === 404) throw new GithubError("not_found", "GitHub could not find that repository, branch or file, or the token cannot see it.", 404);
  if (response.status === 409 || (response.status === 422 && /sha/i.test(detail))) {
    throw new GithubError("conflict", "The workbook changed on GitHub after you loaded it. Reload to get the latest version, then redo your change.", response.status);
  }
  throw new GithubError("other", `GitHub returned ${response.status}${detail ? `: ${detail}` : ""}.`, response.status);
}

export interface Verification {
  fullName: string;
  canPush: boolean;
}

/** Check the token can see the repository, and whether it may write to it. */
export async function verifySession(session: GithubSession, doFetch?: Fetch): Promise<Verification> {
  const response = await githubCall(session, repoUrl(session), {}, doFetch);
  const body = (await response.json()) as { full_name: string; permissions?: { push?: boolean } };
  return { fullName: body.full_name, canPush: body.permissions?.push === true };
}

export interface WorkbookFile {
  bytes: Uint8Array;
  /** Blob SHA of this exact version. Sent back when saving, so a change made meanwhile is detected. */
  sha: string;
  size: number;
}

/** Download the workbook and its SHA. Uses the blob API, which works for files of any size up to 100 MB. */
export async function readWorkbookFile(session: GithubSession, doFetch?: Fetch, ref: string = session.branch): Promise<WorkbookFile> {
  const metaUrl = `${repoUrl(session)}/contents/${encodePath(session.path)}?ref=${encodeURIComponent(ref)}`;
  const meta = (await (await githubCall(session, metaUrl, {}, doFetch)).json()) as { sha?: string; size?: number; type?: string };
  if (meta.type !== "file" || !meta.sha) throw new GithubError("not_found", `${session.path} is not a file at ${ref}.`);

  const blob = (await (await githubCall(session, `${repoUrl(session)}/git/blobs/${meta.sha}`, {}, doFetch)).json()) as { content: string; encoding: string };
  if (blob.encoding !== "base64") throw new GithubError("other", "GitHub sent the workbook in an unexpected format.");
  const bytes = fromBase64(blob.content);
  return { bytes, sha: meta.sha, size: meta.size ?? bytes.length };
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
  /** SHA of the saved workbook, to use as `sha` for the next save. */
  fileSha: string;
}

/** Save a new version of the workbook. `sha` must be the version the change was made from. */
export async function commitWorkbook(session: GithubSession, bytes: Uint8Array, sha: string, message: string, doFetch?: Fetch): Promise<CommitResult> {
  const url = `${repoUrl(session)}/contents/${encodePath(session.path)}`;
  const response = await githubCall(session, url, { method: "PUT", body: JSON.stringify({ message, content: toBase64(bytes), sha, branch: session.branch }) }, doFetch);
  const body = (await response.json()) as { content: { sha: string }; commit: { sha: string; html_url: string } };
  return { commitSha: body.commit.sha, commitUrl: body.commit.html_url, fileSha: body.content.sha };
}

export interface FileToCommit {
  /** Path inside the repository, without a leading slash, like `public/images/blog/x/cover-1600.webp`. */
  path: string;
  bytes: Uint8Array;
}

export interface FilesCommit {
  commitSha: string;
  commitUrl: string;
}

/** `/images/blog/a.webp` (an address on the site) to `public/images/blog/a.webp` (the file in the repository). */
export const repoPathForSitePath = (sitePath: string): string => `public/${sitePath.replace(/^\/+/, "")}`;

const MAX_ATTEMPTS = 3;

/**
 * Save one or more new files in a single commit (so one site update, not one per file), through GitHub's Git data
 * API: add each file as a blob, build a new tree on top of the branch's latest one, commit it, and move the branch.
 * The branch is moved without force: if someone saved in the meantime GitHub refuses, and the whole sequence is
 * repeated on top of their commit (up to three times), so nothing of theirs is ever overwritten.
 */
export async function commitFiles(session: GithubSession, files: FileToCommit[], message: string, doFetch?: Fetch): Promise<FilesCommit> {
  if (files.length === 0) throw new GithubError("other", "There is nothing to save.");
  const base = repoUrl(session);
  const branch = encodeURIComponent(session.branch);
  const call = async (path: string, init?: RequestInit) => (await githubCall(session, `${base}${path}`, init, doFetch)).json() as Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const post = (path: string, body: unknown) => call(path, { method: "POST", body: JSON.stringify(body) });

  // The blobs do not depend on the branch, so they are made once, even if the commit has to be redone.
  const blobs = await Promise.all(files.map(async (f) => ({ path: f.path.replace(/^\/+/, ""), sha: (await post("/git/blobs", { content: toBase64(f.bytes), encoding: "base64" })).sha as string })));

  for (let attempt = 1; ; attempt++) {
    const head = (await call(`/git/ref/heads/${branch}`)).object.sha as string;
    const parentTree = (await call(`/git/commits/${head}`)).tree.sha as string;
    const tree = (await post("/git/trees", { base_tree: parentTree, tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })) })).sha as string;
    const commit = await post("/git/commits", { message, tree, parents: [head] });
    try {
      await call(`/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
      return { commitSha: commit.sha as string, commitUrl: commit.html_url as string };
    } catch (e) {
      const movedOn = e instanceof GithubError && (e.status === 422 || e.status === 409);
      if (!movedOn) throw e;
      if (attempt >= MAX_ATTEMPTS) throw new GithubError("conflict", "The branch keeps changing on GitHub, so the picture could not be saved. Wait a moment and try again.", e.status);
    }
  }
}
