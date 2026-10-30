"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import SearchBox from "./SearchBox";
import { Container } from "./layout";

interface NavLink {
  label: string;
  url: string;
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/**
 * The site header: logo, main navigation, a search button that opens a dialog, a call to action and, on small
 * screens, a menu button that opens the navigation below the bar. Everything is reachable by keyboard, the dialog
 * is the browser's own (focus is held inside it, Escape closes it), and "/" opens the search from anywhere.
 */
export default function HeaderBar({
  name,
  links,
}: {
  name: string;
  links: NavLink[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);

  // Close the menu and the search whenever the visitor moves to another page.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (searchOpen && !el.open) {
      el.showModal();
      // A dialog puts focus on its first control (the close button); the visitor wants to type, so move it to the field.
      el.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    }
    if (!searchOpen && el.open) el.close();
  }, [searchOpen]);

  // "/" opens the search, like on most sites, unless the visitor is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isEditable(e.target)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container className="flex h-[4.5rem] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-[0.625rem] bg-brand"
          >
            <span className="size-3.5 rounded-full border-[3px] border-gold-300" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">
            {name}
          </span>
        </Link>

        <nav
          aria-label="Main"
          className={`${menuOpen ? "max-md:block" : "max-md:hidden"} max-md:absolute max-md:inset-x-0 max-md:top-full max-md:border-b max-md:border-line max-md:bg-white max-md:px-4 max-md:pb-5 max-md:pt-2 md:static`}
        >
          <ul className="flex flex-col gap-1 md:flex-row md:gap-9">
            {links.map((link) => (
              <li key={link.url}>
                <Link
                  href={link.url}
                  aria-current={active(link.url) ? "page" : undefined}
                  className={`block rounded-lg py-2.5 text-sm font-medium transition-colors md:py-1 ${active(link.url) ? "text-brand md:shadow-[0_2px_0_var(--color-brand)]" : "text-ink-2 hover:text-brand"}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            ref={searchButton}
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-haspopup="dialog"
            aria-label="Search"
            className="flex size-10 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:border-ink"
          >
            <Search aria-hidden="true" className="size-[1.125rem]" />
          </button>
          <Link href="/tools" className="btn hidden md:inline-flex">
            All tools
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex size-10 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:border-ink md:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </Container>

      <dialog
        ref={dialog}
        aria-label="Search"
        onClose={() => {
          setSearchOpen(false);
          searchButton.current?.focus(); // Safari does not focus a button when it is clicked, so give focus back explicitly
        }}
        onClick={(e) => e.target === dialog.current && setSearchOpen(false)}
        className="fixed left-1/2 top-[10vh] m-0 w-[min(92vw,40rem)] -translate-x-1/2 rounded-3xl border border-line bg-white p-5 text-ink shadow-lift backdrop:bg-ink/40"
      >
        {searchOpen && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="t-subheading">Search</p>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            {/* Closed a moment later, so the click can finish navigating before the link disappears (Safari cancels it otherwise). */}
            <SearchBox
              inline
              autoFocus
              onNavigate={() => setTimeout(() => setSearchOpen(false), 0)}
            />
            <p className="t-meta mt-3">Press Esc to close.</p>
          </>
        )}
      </dialog>
    </header>
  );
}
