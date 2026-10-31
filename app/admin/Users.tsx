"use client";

import { useCallback, useEffect, useState } from "react";
import { cancelInvitation, inviteUser, listInvitations, listPeople, removeUser, ROLE_LABEL, validUsername, type Invitation, type Person, type Role } from "../../lib/admin/collaborators";
import { GithubError, type GithubSession } from "../../lib/admin/github";
import { Card, ListShell, StatusPill, TH, TD, TR, TOOLBAR_BUTTON, PRIMARY_BUTTON, FormHeader, FormGroup, FormRow, INPUT } from "./views";

const describe = (e: unknown) => (e instanceof GithubError ? e.message : "Something went wrong. Please try again.");
const ROLES: Role[] = ["editor", "viewer", "admin"];
const ROLE_HELP: Record<Role, string> = {
  editor: "Can edit and save content. This is the usual choice for someone who writes articles.",
  viewer: "Can look at everything but cannot save changes.",
  admin: "Can also manage settings and users on GitHub. Give this only to someone you trust fully.",
};

/** Team members are GitHub collaborators: onboarding sends an invitation, and each person signs in with their own token. */
export default function Users({ session, canManage }: { session: GithubSession; canManage: boolean }) {
  const [people, setPeople] = useState<Person[]>();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [problem, setProblem] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [login, setLogin] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [working, setWorking] = useState(false);
  const [formError, setFormError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([listPeople(session), listInvitations(session)]);
      setPeople(p);
      setInvites(i);
      setProblem(undefined);
    } catch (e) {
      setProblem(describe(e));
    }
  }, [session]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function invite() {
    setFormError(undefined);
    if (!validUsername(login)) return setFormError("Enter the person's GitHub username: the name after github.com/, with no spaces.");
    setWorking(true);
    try {
      await inviteUser(session, login, role);
      setNotice(`${login.trim()} has been invited as ${ROLE_LABEL[role].toLowerCase()}. They get an email from GitHub and must accept it.`);
      setMode("list");
      setLogin("");
      await refresh();
    } catch (e) {
      setFormError(describe(e));
    } finally {
      setWorking(false);
    }
  }

  async function act(fn: () => Promise<void>, done: string) {
    setNotice(undefined);
    setWorking(true);
    try {
      await fn();
      setNotice(done);
      await refresh();
    } catch (e) {
      setProblem(describe(e));
    } finally {
      setWorking(false);
    }
  }

  if (mode === "new") {
    return (
      <form
        aria-label="Onboard a user"
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
        className="space-y-4"
      >
        <FormHeader
          trail={[{ label: "Users", onClick: () => setMode("list") }, { label: "New user" }]}
          actions={
            <>
              <button type="submit" disabled={working} className={PRIMARY_BUTTON}>
                {working ? "Inviting…" : "Send invitation"}
              </button>
              <button type="button" onClick={() => setMode("list")} className={TOOLBAR_BUTTON}>
                Discard
              </button>
            </>
          }
          title="New user"
        />
        <Card>
          <FormGroup title="Who">
            <FormRow id="user-login" label="GitHub username" hint="The name in their profile address, github.com/name. They need a free GitHub account.">
              <input id="user-login" aria-describedby="user-login-hint" value={login} onChange={(e) => setLogin(e.target.value)} className={INPUT} autoComplete="off" spellCheck={false} />
            </FormRow>
            <FormRow id="user-role" label="Role" hint={ROLE_HELP[role]}>
              <select id="user-role" aria-describedby="user-role-hint" value={role} onChange={(e) => setRole(e.target.value as Role)} className={INPUT}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </FormRow>
          </FormGroup>
          {formError && (
            <p role="alert" className="mt-4 text-red-800">
              {formError}
            </p>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-ink">What happens next</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>GitHub emails the person an invitation to this repository. It stays pending until they accept it.</li>
            <li>They create a fine-grained token limited to this repository with <strong>Contents: Read and write</strong> (and <strong>Actions: Read</strong> to see site updates).</li>
            <li>They open this admin page and sign in with that token. Their saves appear under their own name in the history.</li>
          </ol>
        </Card>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <ListShell
        title="Users"
        subtitle="Everyone who can work on this site. Each person signs in with their own GitHub token."
        action={
          <button type="button" className={PRIMARY_BUTTON} onClick={() => { setNotice(undefined); setMode("new"); }} disabled={!canManage}>
            New user
          </button>
        }
      >
        {problem && (
          <p role="alert" className="border-b border-slate-200 px-4 py-3 text-red-800">
            {problem}
          </p>
        )}
        {notice && (
          <p role="status" className="border-b border-slate-200 px-4 py-3 font-medium text-brand">
            {notice}
          </p>
        )}
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Users</caption>
          <thead>
            <tr>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </thead>
          <tbody>
            {!people && !problem && (
              <tr>
                <TD colSpan={4}>Loading…</TD>
              </tr>
            )}
            {people?.map((p) => (
              <TR key={p.login}>
                <TD>
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold uppercase text-brand-800">
                      {p.login.slice(0, 2)}
                    </span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                      {p.login}
                    </a>
                  </span>
                </TD>
                <TD>{ROLE_LABEL[p.role]}</TD>
                <TD>
                  <StatusPill tone="good">Active</StatusPill>
                </TD>
                <TD>
                  <button type="button" className={TOOLBAR_BUTTON} disabled={!canManage || working} aria-label={`Remove ${p.login}`} onClick={() => void act(() => removeUser(session, p.login), `${p.login} was removed.`)}>
                    Remove
                  </button>
                </TD>
              </TR>
            ))}
            {invites.map((i) => (
              <TR key={i.id}>
                <TD>
                  <span className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                      {i.login.slice(0, 2)}
                    </span>
                    <span className="font-medium">{i.login}</span>
                  </span>
                </TD>
                <TD>{ROLE_LABEL[i.role]}</TD>
                <TD>
                  <StatusPill tone="warn">Invited</StatusPill>
                </TD>
                <TD>
                  <button type="button" className={TOOLBAR_BUTTON} disabled={!canManage || working} aria-label={`Cancel invitation for ${i.login}`} onClick={() => void act(() => cancelInvitation(session, i.id), `The invitation for ${i.login} was cancelled.`)}>
                    Cancel invitation
                  </button>
                </TD>
              </TR>
            ))}
          </tbody>
        </table>
      </ListShell>
      {!canManage && <p className="text-sm text-slate-700">This token cannot manage users. Sign in with a token that has the Administration: Read and write permission.</p>}
    </div>
  );
}
