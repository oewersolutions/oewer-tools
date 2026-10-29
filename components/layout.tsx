import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "./icons";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-page px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Header band for inner pages: breadcrumbs above, then icon, title and intro. */
export function PageBand({
  breadcrumbs,
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  breadcrumbs?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="band-bg border-b border-brand-100/70">
      <Container className="py-8 sm:py-12">
        {breadcrumbs}
        <div className="flex items-start gap-4 sm:gap-5">
          {icon && <span className="mt-1 hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-gold-300 shadow-soft sm:flex">{icon}</span>}
          <div className="min-w-0">
            {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
            {description && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-700">{description}</p>}
            {children}
          </div>
        </div>
      </Container>
    </div>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  href,
  hrefLabel,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
        <h2 id={id} className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-lg text-slate-700">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-900">
          {hrefLabel ?? "See all"}
          <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
