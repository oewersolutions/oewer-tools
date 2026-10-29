import Link from "next/link";
import { getNavigation, getSetting } from "../lib/content";

function LinkList({ label, links }: { label: string; links: { label: string; url: string }[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map((link) => (
          <li key={link.url}>
            <Link href={link.url} className="text-sm text-brand-100 hover:text-white hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-16 bg-brand-900 text-brand-100">
      <div className="mx-auto max-w-page space-y-4 px-4 py-8">
        <p className="text-lg font-semibold text-white">{getSetting("site_name")}</p>
        <p className="text-sm">{getSetting("site_tagline")}</p>
        <LinkList label="Footer" links={getNavigation("footer")} />
        <LinkList label="Legal" links={getNavigation("footer_legal")} />
        <p className="text-xs">
          © {year} {getSetting("site_name")}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
