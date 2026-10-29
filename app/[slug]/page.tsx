import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Container, PageBand } from "../../components/layout";
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
    <article>
      <PageBand breadcrumbs={<Breadcrumbs trail={[{ label: page.title }]} />} title={page.title} />
      <Container className="py-12">
        <div className="max-w-3xl rounded-3xl border border-brand-100 bg-white p-6 shadow-soft sm:p-10">
          <Prose source={page.content} />
        </div>
      </Container>
    </article>
  );
}
