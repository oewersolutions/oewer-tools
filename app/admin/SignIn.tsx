"use client";

import { useId, useState, type ReactNode } from "react";

const INPUT =
  "block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-3.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const ICONS = {
  repo: (
    <svg {...icon}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H19v-5" />
    </svg>
  ),
  branch: (
    <svg {...icon}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="9" r="2" />
      <path d="M6 7v10M18 11c0 4-6 3-12 6" />
    </svg>
  ),
  key: (
    <svg {...icon}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M16 7l3 3M14 9l2 2" />
    </svg>
  ),
  shield: (
    <svg {...icon}>
      <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg {...icon}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  commit: (
    <svg {...icon}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M3 12h5.5M15.5 12H21" />
    </svg>
  ),
};

function Field({ label, icon: iconName, children }: { label: string; icon: keyof typeof ICONS; children: (id: string, className: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-500">{ICONS[iconName]}</span>
        {children(id, INPUT)}
      </div>
    </div>
  );
}

const POINTS: { icon: keyof typeof ICONS; title: string; text: string }[] = [
  { icon: "commit", title: "Save and it is live", text: "Press Save on any record and the website updates by itself." },
  { icon: "shield", title: "Kept private", text: "Your password is not stored on this device unless you ask it to be." },
  { icon: "clock", title: "Signs out when you step away", text: "After 30 minutes without activity, or when you close the tab." },
];

/** The signed-out screen of the admin: a brand panel on the left and the sign-in card on the right. It covers the whole window, like the admin itself. */
export default function SignIn({
  token,
  onToken,
  keep,
  onKeep,
  busy,
  error,
  notice,
  onSubmit,
}: {
  token: string;
  onToken: (value: string) => void;
  keep: boolean;
  onKeep: (value: boolean) => void;
  busy: boolean;
  error?: string;
  notice?: string;
  onSubmit: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-50 text-slate-900" data-admin-shell>
      <div className="grid min-h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 font-display text-lg font-semibold ring-1 ring-white/25 backdrop-blur">
              O
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">OEWER Tools</span>
          </div>
          <div className="relative max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">Run the whole site from one place.</h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100">Write articles, manage tools and settings, and see the history of every change, all in one place.</p>
            <ul className="mt-10 space-y-6">
              {POINTS.map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-100 ring-1 ring-white/20">{ICONS[p.icon]}</span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-brand-100">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-sm text-brand-200">For the site owner and invited team members.</p>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-display text-lg font-semibold text-white">
                O
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-ink">OEWER Admin</span>
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">Welcome back</h2>
            <p className="mt-2 text-slate-700">Sign in to manage the articles, tools and settings of your website.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
              className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-20px_rgb(14_21_19/0.25)] sm:p-8"
            >
              <Field label="Password" icon="key">
                {(id, cls) => (
                  <>
                    <input
                      id={id}
                      type={show ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={token}
                      onChange={(e) => onToken(e.target.value)}
                      className={`${cls} pr-16`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-pressed={show}
                      className="absolute inset-y-0 right-0 my-1.5 mr-1.5 rounded-lg px-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
                    >
                      {show ? "Hide" : "Show"}
                      <span className="sr-only"> password</span>
                    </button>
                  </>
                )}
              </Field>
              <label className="flex items-start gap-3 text-sm text-slate-800">
                <input type="checkbox" checked={keep} onChange={(e) => onKeep(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand" />
                <span>Keep me signed in if I reload this tab. Leave this off on a shared computer.</span>
              </label>
              {notice && (
                <p role="status" className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800 ring-1 ring-slate-200">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-offset-2 disabled:opacity-60">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              <a href="/" className="font-medium text-brand-700 hover:underline">
                &larr; Back to the website
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
