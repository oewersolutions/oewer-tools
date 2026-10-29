import Link from "next/link";

export default function NotFound() {
  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-brand">Page not found</h1>
      <p className="text-slate-700">We couldn’t find the page you were looking for. It may have moved, or the address may be mistyped.</p>
      <p>
        <Link href="/" className="text-brand-700 underline">
          Go to the home page
        </Link>{" "}
        or{" "}
        <Link href="/tools/" className="text-brand-700 underline">
          browse all tools
        </Link>
        .
      </p>
    </section>
  );
}
