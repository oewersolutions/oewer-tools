"use client";

import { useState, type ReactNode } from "react";

export type MenuId = "dashboard" | "articles" | "tools" | "categories" | "seo" | "ads" | "sheets" | "users" | "history" | "status";

interface MenuItem {
  id: MenuId;
  label: string;
}
export const MENU: { group: string; items: MenuItem[] }[] = [
  { group: "", items: [{ id: "dashboard", label: "Dashboard" }] },
  {
    group: "Content",
    items: [
      { id: "articles", label: "Articles" },
      { id: "tools", label: "Tools" },
      { id: "categories", label: "Categories" },
    ],
  },
  {
    group: "Site",
    items: [
      { id: "seo", label: "Search settings" },
      { id: "ads", label: "Ads" },
      { id: "status", label: "Site status" },
    ],
  },
  {
    group: "Data",
    items: [
      { id: "sheets", label: "All sheets" },
      { id: "history", label: "History" },
    ],
  },
  { group: "Team", items: [{ id: "users", label: "Users" }] },
];

export const titleOf = (id: MenuId) => MENU.flatMap((g) => g.items).find((i) => i.id === id)!.label;

const ghost = "rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50";

/**
 * The admin's frame: a menu down the left, a top bar with the things that apply everywhere (unsaved changes, rebuild,
 * sign out) and the page itself on the right. It covers the whole window, so the public site's header is not shown here.
 */
export default function AdminShell({
  active,
  onNavigate,
  repoName,
  version,
  pending,
  onShowPending,
  onRebuild,
  rebuilding,
  onReload,
  onSignOut,
  busy,
  children,
}: {
  active: MenuId;
  onNavigate: (id: MenuId) => void;
  repoName: string;
  version: string;
  pending: number;
  onShowPending: () => void;
  onRebuild: () => void;
  rebuilding: boolean;
  onReload: () => void;
  onSignOut: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const go = (id: MenuId) => {
    onNavigate(id);
    setOpen(false);
  };
  return (
    <div className="fixed inset-0 z-[60] flex bg-slate-50 text-slate-900" data-admin-shell>
      <aside
        className={`${open ? "flex" : "hidden"} absolute inset-y-0 left-0 z-10 w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:static md:flex`}
        aria-label="Admin menu"
      >
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-semibold text-white">
            O
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold leading-tight text-ink">OEWER Admin</p>
            <p className="truncate text-xs text-slate-600">{repoName}</p>
            <p className="text-xs text-slate-500">version {version}</p>
          </div>
        </div>
        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-4">
          {MENU.map((g) => (
            <div key={g.group || "top"} className="mt-3 first:mt-0">
              {g.group && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</p>}
              <ul>
                {g.items.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      aria-current={i.id === active ? "page" : undefined}
                      onClick={() => go(i.id)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${i.id === active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100"}`}
                    >
                      {i.label}
                      {i.id === "dashboard" && pending > 0 && <span className="ml-auto rounded-full bg-gold-300 px-2 py-0.5 text-xs font-semibold text-ink">{pending}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button type="button" onClick={onSignOut} className={`${ghost} w-full`}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
          <button type="button" className={`${ghost} md:hidden`} aria-expanded={open} onClick={() => setOpen(!open)}>
            Menu
          </button>
          <h1 className="font-display text-lg font-semibold text-ink">{titleOf(active)}</h1>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {pending > 0 && (
              <button type="button" onClick={onShowPending} className="rounded-full bg-gold-300/50 px-3 py-1 text-sm font-medium text-ink">
                {pending} unsaved change{pending === 1 ? "" : "s"}
              </button>
            )}
            <button type="button" onClick={onReload} disabled={busy} className={ghost}>
              Reload
            </button>
            <button type="button" onClick={onRebuild} disabled={rebuilding} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white transition hover:bg-ink-2 disabled:opacity-50">
              {rebuilding ? "Starting…" : "Rebuild site"}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
