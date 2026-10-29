import Link from "next/link";
import { getNavigation, getSetting } from "../lib/content";
import SearchBox from "./SearchBox";
import { Container } from "./layout";

export default function Header() {
  const links = getNavigation("header");
  const name = getSetting("site_name");

  return (
    <header className="z-20 sm:sticky sm:top-0 border-b border-brand-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-brand font-display text-lg font-semibold text-gold-300 shadow-soft transition group-hover:bg-brand-700">
            O
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">{name}</span>
        </Link>
        <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <ul className="flex flex-wrap gap-x-1 gap-y-1">
            {links.map((link) => (
              <li key={link.url}>
                <Link href={link.url} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-800">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchBox />
      </Container>
    </header>
  );
}
