import Link from "next/link";
import { getNavigation, getSetting } from "../lib/content";
import SearchBox from "./SearchBox";

export default function Header() {
  const links = getNavigation("header");

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {getSetting("site_name")}
        </Link>
        <nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((link) => (
              <li key={link.url}>
                <Link href={link.url} className="py-1 text-sm font-medium text-brand-100 hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchBox />
      </div>
    </header>
  );
}
