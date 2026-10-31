import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AboutPage,
  ContactPage,
  ReadingPage,
} from "../../components/pages/PageLayouts";
import { nonEmptyParams } from "../../lib/static";
import { pageMetadata } from "../../lib/metadata";
import { summarize } from "../../lib/seo";
import {
  getOptionalSetting,
  getPageBySlug,
  getPublishedPages,
} from "../../lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Static pages from the `pages` sheet (About, Contact, Privacy, Terms). Drafts are not built.
export function generateStaticParams() {
  return nonEmptyParams(
    getPublishedPages().map((p) => ({ slug: p.slug })),
    { slug: "_none" },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPageBySlug((await params).slug);
  return page
    ? pageMetadata({
        title: page.title,
        description: summarize(page.content),
        path: `/${page.slug}/`,
        entity: { type: "page", id: page.page_id },
      })
    : {};
}

export default async function StaticPage({ params }: Props) {
  const page = getPageBySlug((await params).slug);
  if (!page) notFound();

  if (page.slug === "about")
    return <AboutPage title={page.title} content={page.content} />;
  if (page.slug === "contact")
    return (
      <ContactPage
        title={page.title}
        content={page.content}
        email={getOptionalSetting("contact_email")}
      />
    );
  return <ReadingPage title={page.title} content={page.content} />;
}
