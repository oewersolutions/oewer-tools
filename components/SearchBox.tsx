"use client";

import Link from "next/link";
import { useId, useState, type FocusEvent, type KeyboardEvent } from "react";
import { searchItems, type SearchItem } from "../lib/search";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function SearchBox() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const results = items ? searchItems(items, query) : [];
  const showPanel = open && query.trim().length > 0;

  async function loadIndex() {
    if (items || failed) return;
    try {
      const response = await fetch(`${BASE_PATH}/search-index.json`);
      if (!response.ok) throw new Error(String(response.status));
      setItems((await response.json()) as SearchItem[]);
    } catch {
      setFailed(true);
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") close();
  }

  return (
    <div className="relative w-full sm:w-72" role="search" onBlur={onBlur} onKeyDown={onKeyDown}>
      <label htmlFor={`${id}-input`} className="sr-only">
        Search tools and articles
      </label>
      <input
        id={`${id}-input`}
        type="search"
        value={query}
        placeholder="Search tools and articles"
        autoComplete="off"
        aria-controls={`${id}-results`}
        onFocus={() => {
          setOpen(true);
          void loadIndex();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
      />
      <div id={`${id}-results`} aria-live="polite">
        {showPanel && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-96 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {failed ? (
              <p className="p-3 text-sm text-slate-700">Search is unavailable right now.</p>
            ) : !items ? (
              <p className="p-3 text-sm text-slate-700">Loading…</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-slate-700">No results for “{query.trim()}”.</p>
            ) : (
              <ul>
                {results.map((item) => (
                  <li key={item.url}>
                    <Link href={item.url} onClick={close} className="block px-3 py-2 hover:bg-brand-50 focus-visible:bg-brand-50">
                      <span className="block text-sm font-medium text-brand">{item.title}</span>
                      <span className="block text-xs text-slate-600">
                        {item.type} · {item.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
