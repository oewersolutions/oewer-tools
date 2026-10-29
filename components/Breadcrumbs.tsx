import Link from "next/link";
import { BASE_PATH, getSiteUrl } from "../lib/metadata";
import { absoluteUrl } from "../lib/seo";

export interface Crumb {
  label: string;
  /** Site-relative path with trailing slash. Omit for the current page. */
  path?: string;
}

/** Visible trail plus BreadcrumbList structured data. The home page is always the first step. */
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const all: Crumb[] = [{ label: "Home", path: "/" }, ...trail];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.path ? { item: absoluteUrl(getSiteUrl(), BASE_PATH, c.path) } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
      <ol className="flex flex-wrap gap-x-2">
        {all.map((c, i) => (
          <li key={c.label} className="flex gap-x-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.path ? (
              <Link href={c.path} className="text-brand-700 underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
