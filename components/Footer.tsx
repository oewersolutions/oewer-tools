import Link from "next/link";
import { getMeasurementId, getNavigation, getPublishedTools, getSetting, getToolCategories, getToolCategory } from "../lib/content";
import { toolUrl } from "../lib/search";
import ConsentSettingsButton from "./ConsentSettingsButton";
import { Container } from "./layout";

function Column({ title, links }: { title: string; links: { label: string; url: string }[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.url}>
            <Link href={link.url} className="text-sm text-brand-100 transition hover:text-white hover:underline">
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
  const name = getSetting("site_name");
  const popular = getPublishedTools()
    .filter((t) => t.featured)
    .flatMap((t) => {
      const c = getToolCategory(t.category_id);
      return c ? [{ label: t.name, url: toolUrl(c.slug, t.slug) }] : [];
    });
  const categories = getToolCategories().map((c) => ({ label: c.name, url: `/tools/${c.slug}/` }));

  return (
    <footer className="mt-24 bg-brand-950 text-brand-100">
      <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" aria-hidden="true" />
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-gold-300 font-display text-lg font-semibold text-brand-950">
                O
              </span>
              <span className="font-display text-xl font-semibold text-white">{name}</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed">{getSetting("site_tagline")}. Our tools run in your browser, so your files and numbers stay on your device.</p>
          </div>
          <Column title="Tool categories" links={categories} />
          <Column title="Popular tools" links={popular} />
          <div className="space-y-8">
            <Column title="Company" links={getNavigation("footer")} />
            <Column title="Legal" links={getNavigation("footer_legal")} />
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-xs text-brand-200">
            © {year} {name}. All rights reserved.
          </p>
          <ConsentSettingsButton measurementId={getMeasurementId()} />
        </div>
      </Container>
    </footer>
  );
}
