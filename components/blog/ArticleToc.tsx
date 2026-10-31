"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  text: string;
}

/**
 * The contents list beside an article. The section being read is marked (a thin green line and darker text), found
 * by watching which heading has most recently passed the top of the screen. With JavaScript off the links still jump
 * to the sections; only the marker is missing.
 */
export function ArticleToc({ items }: { items: Item[] }) {
  const [current, setCurrent] = useState(items[0]?.id);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0 || typeof IntersectionObserver === "undefined")
      return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // The first heading (in reading order) that is in the upper part of the screen; otherwise keep the last one.
        const first = headings.find((h) => visible.has(h.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  return (
    <ol className="border-l border-line">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={current === item.id ? "location" : undefined}
            className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors ${current === item.id ? "border-brand font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
