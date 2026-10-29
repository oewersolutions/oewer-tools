import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { ArrowRight } from "../../../components/icons";
import { Container, PageBand } from "../../../components/layout";
import { PostBody } from "../../../components/Prose";
import { getAuthor, getBlogCategory, getPostBlocks, getPostBySlug, getPostReadingMinutes, getPostTags, getPublishedPosts } from "../../../lib/content";
import { pageMetadata } from "../../../lib/metadata";
import { formatDate } from "../../../lib/format";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug((await params).slug);
  return post
    ? pageMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}/`, entity: { type: "post", id: post.post_id }, type: "article" })
    : {};
}

export default async function PostPage({ params }: Props) {
  const post = getPostBySlug((await params).slug);
  if (!post) notFound();

  const author = getAuthor(post.author_id);
  const category = getBlogCategory(post.category_id);
  const tags = getPostTags(post.post_id);

  const minutes = getPostReadingMinutes(post.post_id);

  return (
    <article>
      <PageBand
        breadcrumbs={
          <Breadcrumbs
            trail={[
              { label: "Blog", path: "/blog/" },
              ...(category ? [{ label: category.name, path: `/blog/category/${category.slug}/` }] : []),
              { label: post.title },
            ]}
          />
        }
        eyebrow={category?.name}
        title={post.title}
        description={post.excerpt}
      >
        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
          {author && (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-brand font-display text-gold-300">
                {author.display_name.charAt(0)}
              </span>
              <span className="font-medium text-ink">{author.display_name}</span>
            </span>
          )}
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          <span>{minutes} min read</span>
        </p>
      </PageBand>

      <Container className="py-12">
        <div className="mx-auto max-w-prose">
          <PostBody blocks={getPostBlocks(post.post_id)} />
          {tags.length > 0 && (
            <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2 text-sm">
              {tags.map((t) => (
                <li key={t.tag_id} className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
                  {t.name}
                </li>
              ))}
            </ul>
          )}
          <aside aria-label="Try our tools" className="mt-12 rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
            <p className="font-display text-xl font-semibold text-ink">Put it into practice</p>
            <p className="mt-1 text-slate-700">Our free tools run in your browser, so your numbers and files stay private.</p>
            <Link href="/tools/" className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-900">
              Browse all tools
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </aside>
        </div>
      </Container>
    </article>
  );
}
