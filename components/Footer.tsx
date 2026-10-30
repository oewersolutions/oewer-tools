import Link from "next/link";
import { adsActive } from "../lib/ads";
import { getAdConfig, getMeasurementId, getNavigation, getOptionalSetting, getSetting, getToolCategories } from "../lib/content";
import ConsentSettingsButton from "./ConsentSettingsButton";
import { Container } from "./layout";

const linkClass = "block text-sm text-ink-2 transition-colors hover:text-brand";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="t-eyebrow">{title}</h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </nav>
  );
}

export default function Footer() {
  const year = new Date().getUTCFullYear();
  const name = getSetting("site_name");
  const email = getOptionalSetting("contact_email");
  const categories = getToolCategories();
  // Company links: the header and footer menus together, without the Tools entry (it has its own column).
  const company = [...getNavigation("header"), ...getNavigation("footer")].filter((l, i, all) => !/^\/tools\/?$/.test(l.url) && all.findIndex((x) => x.url === l.url) === i);
  const legal = getNavigation("footer_legal");

  return (
    <footer className="mt-24 border-t border-line">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[0.625rem] bg-brand">
                <span className="size-3.5 rounded-full border-[3px] border-gold-300" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">{name}</span>
            </Link>
            <p className="t-meta mt-4 !text-sm leading-relaxed">{getSetting("site_tagline")}. Our tools run in your browser, so your files and numbers stay on your device.</p>
          </div>
          <Column title="Tools">
            {categories.map((c) => (
              <li key={c.category_id}>
                <Link href={`/tools/${c.slug}/`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </Column>
          <Column title="Company">
            {company.map((l) => (
              <li key={l.url}>
                <Link href={l.url} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </Column>
          <Column title="Legal">
            {legal.map((l) => (
              <li key={l.url}>
                <Link href={l.url} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <ConsentSettingsButton measurementId={getMeasurementId()} adsActive={adsActive(getAdConfig())} />
            </li>
          </Column>
        </div>
        <div className="rule mt-12 flex flex-col gap-2 pt-6 sm:flex-row sm:justify-between">
          <p className="t-meta">
            © {year} {name}. All rights reserved.
          </p>
          {email && (
            <a href={`mailto:${email}`} className="t-meta transition-colors hover:text-brand">
              {email}
            </a>
          )}
        </div>
      </Container>
    </footer>
  );
}
