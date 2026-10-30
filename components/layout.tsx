import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "./icons";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-page px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

/** Quiet band at the top of an inner page: breadcrumbs, a small label, a large title and an intro. */
export function PageBand({
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
}: {
  breadcrumbs?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="band-bg">
      <Container className="py-8 sm:py-12">
        {breadcrumbs}
        {eyebrow && <p className="t-eyebrow !text-brand">{eyebrow}</p>}
        <h1 className="t-title mt-2 text-ink">{title}</h1>
        {description && <p className="t-lead mt-3 max-w-2xl">{description}</p>}
        {children}
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
        {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
        <h2 id={id} className="t-heading mt-2 text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-muted">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-2 font-medium text-brand transition-[gap] hover:gap-3"
        >
          {hrefLabel ?? "See all"}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}
