import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Prose } from "../../components/Prose";
import { pageMetadata } from "../../lib/metadata";
import { getPageBySlug, getPublishedPages } from "../../lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Static pages from the `pages` sheet (About, Contact, Privacy, Terms). Drafts are not built.
export function generateStaticParams() {
  return getPublishedPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPageBySlug((await params).slug);
  return page ? pageMetadata({ title: page.title, path: `/${page.slug}/`, entity: { type: "page", id: page.page_id } }) : {};
}

export default async function StaticPage({ params }: Props) {
  const page = getPageBySlug((await params).slug);
  if (!page) notFound();

  return (
    <article className="space-y-6">
      <Breadcrumbs trail={[{ label: page.title }]} />
      <h1 className="text-3xl font-bold text-brand">{page.title}</h1>
      <Prose source={page.content} />
    </article>
  );
}
