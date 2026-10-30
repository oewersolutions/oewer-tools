import Link from "next/link";
import { ArrowRight } from "../components/icons";
import { Container } from "../components/layout";
import SearchBox from "../components/SearchBox";

export default function NotFound() {
  return (
    <section className="band-bg">
      <Container className="py-20 text-center sm:py-28">
        <p className="t-display text-7xl text-ink sm:text-9xl" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-5xl">Page not found</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-700">We couldn’t find the page you were looking for. It may have moved, or the address may be mistyped.</p>
        <div className="mx-auto mt-8 flex max-w-2xl justify-center">
          <SearchBox large />
        </div>
        <p className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-700">
            Go to the home page
          </Link>
          <Link href="/tools/" className="inline-flex items-center gap-2 rounded-xl border border-brand px-6 py-3 font-semibold text-brand transition hover:bg-brand-50">
            Browse all tools
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </p>
      </Container>
    </section>
  );
}
