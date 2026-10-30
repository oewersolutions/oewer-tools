import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { PostCard } from "../../components/Cards";
import { ArrowRight } from "../../components/icons";
import { Container, PageBand } from "../../components/layout";
import { getBlogCategories, getBlogCategory, getPostReadingMinutes, getPostsInCategory, getPublishedPosts, getTagsInUse } from "../../lib/content";
import { formatDate } from "../../lib/format";
import { BASE_PATH, pageMetadata } from "../../lib/metadata";
import { postUrl } from "../../lib/search";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description: "Guides and explainers to help you get the most from our tools.",
  path: "/blog/",
});

export default function BlogIndexPage() {
  const posts = getPublishedPosts();
  const categories = getBlogCategories().filter((c) => getPostsInCategory(c.category_id).length > 0);
  const tags = getTagsInUse();
  const [latest, ...rest] = posts;

  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Blog" }]} />}
        eyebrow="Guides"
        title="Blog"
        description="Plain-language guides on money, images and everyday tasks, written to go with the tools."
      >
        {categories.length > 0 && (
          <nav aria-label="Blog categories" className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.category_id}>
                  <Link href={`/blog/category/${c.slug}/`} className="inline-flex rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-brand-50">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </PageBand>
      <Container className="space-y-10 py-14">
        {latest ? (
          <>
            <Link
              href={postUrl(latest.slug)}
              className="group relative isolate block overflow-hidden rounded-3xl hero-bg p-8 text-white shadow-lift transition hover:-translate-y-1 sm:p-12"
            >
              <div className="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
              <p className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-gold-400 px-3 py-1 font-semibold text-brand-950">Latest</span>
                <span className="text-brand-100">{getBlogCategory(latest.category_id)?.name}</span>
                <span className="text-brand-200">{formatDate(latest.published_at)}</span>
              </p>
              <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-5xl">{latest.title}</h2>
              <p className="mt-4 max-w-2xl text-lg text-brand-100">{latest.excerpt}</p>
              <p className="mt-6 inline-flex items-center gap-2 font-semibold text-gold-300">
                Read the article · {getPostReadingMinutes(latest.post_id)} min
                <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
              </p>
            </Link>
            {rest.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <PostCard key={p.post_id} post={p} categoryName={getBlogCategory(p.category_id)?.name} minutes={getPostReadingMinutes(p.post_id)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-600">No articles yet.</p>
        )}
        {tags.length > 0 && (
          <section aria-labelledby="topics-heading" className="border-t border-brand-100 pt-10">
            <h2 id="topics-heading" className="font-display text-2xl font-semibold text-ink">
              Browse by topic
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t.tag_id}>
                  <Link href={`/blog/tag/${t.slug}/`} className="inline-flex rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-brand-100">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-slate-600">
              <a href={`${BASE_PATH}/feed.xml`} className="font-medium text-brand-700 hover:underline">
                Subscribe with RSS
              </a>
            </p>
          </section>
        )}
      </Container>
    </>
  );
}
