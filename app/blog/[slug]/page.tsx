import AdSlot from "../../../components/AdSlot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { ArrowRight } from "../../../components/icons";
import { Container, PageBand } from "../../../components/layout";
import { PostCard, ToolCard } from "../../../components/Cards";
import { PostBody } from "../../../components/Prose";
import { articleAdIndex } from "../../../lib/ads";
import { authorSlug, getAuthor, getBlogCategory, getRelatedPosts, getToolsForPost, getPostBlocks, getPostBySlug, getPostReadingMinutes, getPostTags, getPostsWithPages, getSetting } from "../../../lib/content";
import { BASE_PATH, getSiteUrl, pageMetadata } from "../../../lib/metadata";
import { formatDate } from "../../../lib/format";
import { nonEmptyParams } from "../../../lib/static";
import { absoluteUrl } from "../../../lib/seo";
import { articleJsonLd, buildOutline, statusNotice } from "../../../lib/posts";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return nonEmptyParams(getPostsWithPages().map((p) => ({ slug: p.slug })), { slug: "_none" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug((await params).slug);
  return post
    ? pageMetadata({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}/`, entity: { type: "post", id: post.post_id }, type: "article", noindex: post.status !== "published" })
    : {};
}

export default async function PostPage({ params }: Props) {
  const post = getPostBySlug((await params).slug);
  if (!post) notFound();

  const author = getAuthor(post.author_id);
  const category = getBlogCategory(post.category_id);
  const tags = getPostTags(post.post_id);

  const minutes = getPostReadingMinutes(post.post_id);
  const blocks = getPostBlocks(post.post_id);
  const outline = buildOutline(blocks);
  const adIndex = articleAdIndex(blocks.map((b) => b.block_type));
  const notice = statusNotice(post.status);
  const tools = getToolsForPost(post.post_id);
  const readNext = post.status === "published" ? getRelatedPosts(post) : [];
  const ld = articleJsonLd({
    title: post.title,
    description: post.excerpt,
    url: absoluteUrl(getSiteUrl(), BASE_PATH, `/blog/${post.slug}/`),
    published: post.published_at,
    modified: post.updated_at,
    authorName: author?.display_name,
    publisherName: getSetting("site_name"),
  });

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
              <Link href={`/blog/author/${authorSlug(author)}/`} className="font-medium text-ink hover:underline">
                {author.display_name}
              </Link>
            </span>
          )}
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          <span>{minutes} min read</span>
        </p>
      </PageBand>

      {notice && (
        <div role="note" className="border-b border-gold-400/40 bg-gold-300/30">
          <Container className="py-3 text-sm text-ink">
            <strong>{notice.title}.</strong> {notice.text}
          </Container>
        </div>
      )}

      <Container className="py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
        <div className="mx-auto max-w-prose">
          {outline.length >= 3 && (
            <nav aria-label="In this article" className="mb-10 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
              <p className="font-display text-lg font-semibold text-ink">In this article</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-700 marker:text-brand-400">
                {outline.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="font-medium text-brand-700 hover:underline">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <PostBody blocks={blocks} adAfter={adIndex === null ? undefined : { index: adIndex, node: <AdSlot placement="in_article" pageType="blog_post" /> }} />
          {tags.length > 0 && (
            <ul aria-label="Tags" className="mt-10 flex flex-wrap gap-2 text-sm">
              {tags.map((t) => (
                <li key={t.tag_id}>
                  <Link href={`/blog/tag/${t.slug}/`} className="inline-block rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800 transition hover:bg-brand-100">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {author && (
            <aside aria-label="About the author" className="mt-12 flex gap-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xl text-gold-300">
                {author.display_name.charAt(0)}
              </span>
              <div>
                <p className="text-sm text-slate-600">Written by</p>
                <p className="font-display text-xl font-semibold text-ink">
                  <Link href={`/blog/author/${authorSlug(author)}/`} className="hover:underline">
                    {author.display_name}
                  </Link>
                </p>
                {author.bio && <p className="mt-1 text-slate-700">{author.bio}</p>}
              </div>
            </aside>
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

        {tools.length > 0 && (
          <section aria-labelledby="tools-heading" className="mt-16">
            <h2 id="tools-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Try it yourself
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <ToolCard key={t.tool.tool_id} tool={t.tool} category={t.category} />
              ))}
            </div>
          </section>
        )}

        {readNext.length > 0 && (
          <section aria-labelledby="related-articles-heading" className="mt-16">
            <h2 id="related-articles-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {readNext.map((p) => (
                <PostCard key={p.post_id} post={p} categoryName={getBlogCategory(p.category_id)?.name} minutes={getPostReadingMinutes(p.post_id)} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </article>
  );
}
