import Link from "next/link";
import type { ReactNode } from "react";
import { getBlogCategories, getPostsInCategory } from "../lib/content";
import { Container } from "./layout";

/** "2026" or "2025 to 2026": the years the listed articles were published in. */
function yearSpan(dates: (string | null)[]): string {
  const years = dates
    .filter((d): d is string => !!d)
    .map((d) => Number(d.slice(0, 4)));
  if (years.length === 0) return "";
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first} to ${last}`;
}

/**
 * The top of every article listing: breadcrumbs, a very large title, an intro, a thin rule with the years and the
 * number of articles, and category chips. `active` is the category slug being shown ("" means all articles).
 */
export default function BlogHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  dates,
  count,
  active = null,
}: {
  breadcrumbs: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  dates: (string | null)[];
  count: number;
  /** "" for All, a category slug for a category page, null to show no chip as current (tag and author pages). */
  active?: string | null;
}) {
  const categories = getBlogCategories().filter(
    (c) => getPostsInCategory(c.category_id).length > 0,
  );
  const chip =
    "inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  return (
    <Container className="pt-8 sm:pt-10">
      {breadcrumbs}
      <div className="text-center">
        {eyebrow && <p className="t-eyebrow !text-brand">{eyebrow}</p>}
        <h1 className="mt-3 text-[clamp(3.25rem,13vw,9.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-ink [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description && (
          <p className="t-lead mx-auto mt-6 max-w-2xl">{description}</p>
        )}
      </div>
      <div className="rule mt-10 flex items-center justify-between pt-4 text-sm text-muted">
        <span>{yearSpan(dates)}</span>
        <span>{count === 1 ? "1 article" : `${count} articles`}</span>
      </div>
      {categories.length > 0 && (
        <nav aria-label="Blog categories" className="mt-6">
          <ul className="flex flex-wrap gap-2.5">
            <li>
              <Link
                href="/blog/"
                aria-current={active === "" ? "page" : undefined}
                className={`${chip} ${active === "" ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink"}`}
              >
                All
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.category_id}>
                <Link
                  href={`/blog/category/${c.slug}/`}
                  aria-current={active === c.slug ? "page" : undefined}
                  className={`${chip} ${active === c.slug ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-ink"}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Container>
  );
}

/** The three-column grid every listing uses. */
export function PostGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
