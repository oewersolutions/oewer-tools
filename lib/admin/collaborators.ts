import { githubCall, GithubError, repoUrl, type GithubSession } from "./github";

/**
 * People who can work on the site are the repository's collaborators on GitHub. Adding someone sends them an invitation;
 * they sign in to the admin with their own token, so every save is recorded under their name. Managing collaborators
 * needs the token's "Administration: Read and write" permission.
 */

export type Role = "editor" | "viewer" | "admin";

/** Editors can save changes (GitHub's "write"), viewers can only look ("read"). */
export const ROLE_PERMISSION: Record<Role, string> = { editor: "push", viewer: "pull", admin: "admin" };
export const ROLE_LABEL: Record<Role, string> = { editor: "Editor", viewer: "Viewer", admin: "Admin" };

export interface Person {
  login: string;
  role: Role;
  url: string;
}
export interface Invitation {
  id: number;
  login: string;
  role: Role;
  url: string;
  createdAt: string;
}

const NO_ACCESS = "The token cannot manage users. Add the Administration: Read and write permission to it, then sign in again.";

export function roleOf(permission: string): Role {
  if (permission === "admin") return "admin";
  if (permission === "write" || permission === "push" || permission === "maintain") return "editor";
  return "viewer";
}

/** A GitHub username: letters, digits and single hyphens, not starting or ending with one, at most 39 characters. */
export function validUsername(text: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(text.trim());
}

async function call(session: GithubSession, path: string, init: RequestInit = {}, doFetch?: typeof fetch): Promise<Response> {
  try {
    return await githubCall(session, `${repoUrl(session)}${path}`, init, doFetch);
  } catch (e) {
    if (e instanceof GithubError && (e.kind === "forbidden" || e.kind === "not_found")) throw new GithubError("forbidden", NO_ACCESS, e.status);
    throw e;
  }
}

export async function listPeople(session: GithubSession, doFetch?: typeof fetch): Promise<Person[]> {
  const raw = (await (await call(session, "/collaborators?per_page=100", {}, doFetch)).json()) as { login: string; html_url: string; role_name?: string; permissions?: { admin?: boolean; push?: boolean } }[];
  return raw.map((p) => ({ login: p.login, url: p.html_url, role: p.permissions?.admin ? "admin" : p.permissions?.push ? "editor" : roleOf(p.role_name ?? "read") }));
}

export async function listInvitations(session: GithubSession, doFetch?: typeof fetch): Promise<Invitation[]> {
  const raw = (await (await call(session, "/invitations?per_page=100", {}, doFetch)).json()) as { id: number; invitee?: { login: string; html_url: string } | null; permissions: string; created_at: string }[];
  return raw.map((i) => ({ id: i.id, login: i.invitee?.login ?? "", url: i.invitee?.html_url ?? "", role: roleOf(i.permissions), createdAt: i.created_at }));
}

/** Invite someone, or change the role of someone already on the team. */
export async function inviteUser(session: GithubSession, login: string, role: Role, doFetch?: typeof fetch): Promise<void> {
  if (!validUsername(login)) throw new GithubError("other", "That is not a GitHub username. Use the name after github.com/, with no spaces.");
  await call(session, `/collaborators/${encodeURIComponent(login.trim())}`, { method: "PUT", body: JSON.stringify({ permission: ROLE_PERMISSION[role] }) }, doFetch);
}

export async function removeUser(session: GithubSession, login: string, doFetch?: typeof fetch): Promise<void> {
  await call(session, `/collaborators/${encodeURIComponent(login)}`, { method: "DELETE" }, doFetch);
}

export async function cancelInvitation(session: GithubSession, id: number, doFetch?: typeof fetch): Promise<void> {
  await call(session, `/invitations/${id}`, { method: "DELETE" }, doFetch);
}
