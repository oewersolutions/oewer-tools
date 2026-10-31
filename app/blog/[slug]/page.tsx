import AdSlot from "../../../components/AdSlot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { ArrowRight } from "../../../components/icons";
import { ArticleToc } from "../../../components/blog/ArticleToc";
import { ShareLinks } from "../../../components/blog/ShareLinks";
import ArticleImage from "../../../components/ArticleImage";
import Cover from "../../../components/Cover";
import { Container } from "../../../components/layout";
import { PostCard } from "../../../components/Cards";
import { PostBody } from "../../../components/Prose";
import { articleAdIndex } from "../../../lib/ads";
import {
  authorSlug,
  getAuthor,
  getCoverInfo,
  getPageBySlug,
  getBlogCategory,
  getRelatedPosts,
  getToolsForPost,
  getPostBlocks,
  getPostBySlug,
  getPostReadingMinutes,
  getPostTags,
  getPostsWithPages,
  getSetting,
} from "../../../lib/content";
import { BASE_PATH, getSiteUrl, pageMetadata } from "../../../lib/metadata";
import { formatDate } from "../../../lib/format";
import { toolUrl } from "../../../lib/search";
import { nonEmptyParams } from "../../../lib/static";
import { absoluteUrl } from "../../../lib/seo";
import { articleJsonLd, buildOutline, statusNotice } from "../../../lib/posts";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return nonEmptyParams(
    getPostsWithPages().map((p) => ({ slug: p.slug })),
    { slug: "_none" },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug((await params).slug);
  return post
    ? pageMetadata({
        title: post.title,
        description: post.excerpt,
        path: `/blog/${post.slug}/`,
        entity: { type: "post", id: post.post_id },
        type: "article",
        noindex: post.status !== "published",
        image: post.cover_image ? { path: post.cover_image, alt: post.cover_alt, ...getCoverInfo(post) } : undefined,
      })
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
    image: post.cover_image
      ? absoluteUrl(getSiteUrl(), BASE_PATH, post.cover_image)
      : undefined,
  });

  const meta = (
    <p className="t-meta mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 !text-sm">
      <time dateTime={post.published_at ?? undefined}>
        {formatDate(post.published_at)}
      </time>
      <span aria-hidden="true">·</span>
      <span>{minutes} min read</span>
      {author && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            By{" "}
            <Link
              href={`/blog/author/${authorSlug(author)}/`}
              className="font-medium text-ink hover:underline"
            >
              {author.display_name}
            </Link>
          </span>
        </>
      )}
    </p>
  );

  return (
    <article>
      {notice && (
        <div role="note" className="border-b border-gold-400/40 bg-gold-300/30">
          <Container className="py-3 text-sm text-ink">
            <strong>{notice.title}.</strong> {notice.text}
          </Container>
        </div>
      )}

      <Container className="pt-8 sm:pt-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ld }}
        />
        <Breadcrumbs
          trail={[
            { label: "Articles", path: "/blog/" },
            ...(category
              ? [
                  {
                    label: category.name,
                    path: `/blog/category/${category.slug}/`,
                  },
                ]
              : []),
            { label: post.title },
          ]}
        />
        <header className="mx-auto max-w-3xl text-center">
          {category && (
            <Link href={`/blog/category/${category.slug}/`} className="pill">
              {category.name}
            </Link>
          )}
          <h1 className="t-title mt-5 text-ink">{post.title}</h1>
          {meta}
          <p className="t-lead mx-auto mt-5 max-w-2xl">{post.excerpt}</p>
        </header>

        {post.cover_image ? (
          <ArticleImage
            src={post.cover_image}
            alt={post.cover_alt}
            info={getCoverInfo(post)}
            sizes="(min-width: 1280px) 1136px, 100vw"
            priority
            className="mt-10 aspect-[16/9] w-full rounded-3xl object-cover sm:aspect-[21/9]"
          />
        ) : (
          <Cover
            seed={post.slug}
            number={Number(post.post_id.replace(/\D/g, "")) || undefined}
            className="mt-10 aspect-[16/9] rounded-3xl sm:aspect-[21/9]"
          />
        )}

        <div className="mt-12 grid justify-center gap-x-16 lg:mt-16 lg:grid-cols-[13rem_minmax(0,42rem)]">
          <aside aria-label="Article tools" className="hidden lg:block">
            <div className="sticky top-28 space-y-8">
              {outline.length >= 2 && (
                <nav aria-label="In this article">
                  <p className="t-eyebrow mb-3">In this article</p>
                  <ArticleToc items={outline} />
                </nav>
              )}
              <ShareLinks title={post.title} />
            </div>
          </aside>

          <div className="min-w-0">
            {outline.length >= 3 && (
              <details className="card mb-10 p-5 lg:hidden">
                <summary className="t-subheading cursor-pointer">
                  In this article
                </summary>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted marker:text-brand">
                  {outline.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <PostBody
              blocks={blocks}
              adAfter={
                adIndex === null
                  ? undefined
                  : {
                      index: adIndex,
                      node: (
                        <AdSlot placement="in_article" pageType="blog_post" />
                      ),
                    }
              }
            />

            {getPageBySlug("editorial-policy") && (
              <p className="t-meta mt-10 !text-sm">
                This article was written with AI assistance.{" "}
                <Link href="/editorial-policy/" className="font-medium text-brand underline">
                  How we research and check our articles
                </Link>
                .
              </p>
            )}

            {tags.length > 0 && (
              <ul aria-label="Tags" className="mt-8 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <li key={t.tag_id}>
                    <Link
                      href={`/blog/tag/${t.slug}/`}
                      className="pill !px-3.5 !py-1 transition-colors hover:bg-brand hover:text-white"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 lg:hidden">
              <ShareLinks title={post.title} />
            </div>

            {tools.length > 0 && (
              <aside aria-label="Try our tools" className="mt-12 space-y-4">
                {tools.map((t) => (
                  <Link
                    key={t.tool.tool_id}
                    href={toolUrl(t.category.slug, t.tool.slug)}
                    className="card card-link group flex items-center justify-between gap-6 p-6 sm:p-7"
                  >
                    <span>
                      <span className="t-subheading block text-ink">
                        Try it yourself
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        Open the {t.tool.name} and put your own numbers in.
                      </span>
                    </span>
                    <span className="btn shrink-0 group-hover:bg-brand">
                      Open <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </Link>
                ))}
              </aside>
            )}

            {author && (
              <aside
                aria-label="About the author"
                className="card mt-10 flex items-center gap-5 p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-semibold text-gold-300"
                >
                  {author.display_name.charAt(0)}
                </span>
                <div>
                  <p className="t-meta">Written by</p>
                  <p className="t-subheading text-ink">
                    <Link
                      href={`/blog/author/${authorSlug(author)}/`}
                      className="hover:underline"
                    >
                      {author.display_name}
                    </Link>
                  </p>
                  {author.bio && (
                    <p className="mt-1 text-sm text-muted">{author.bio}</p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {readNext.length > 0 && (
          <section
            aria-labelledby="related-articles-heading"
            className="mt-20 pb-4"
          >
            <p className="t-eyebrow">Keep reading</p>
            <h2
              id="related-articles-heading"
              className="t-heading mt-2 text-ink"
            >
              Related articles
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {readNext.map((p) => (
                <PostCard
                  key={p.post_id}
                  post={p}
                  categoryName={getBlogCategory(p.category_id)?.name}
                  minutes={getPostReadingMinutes(p.post_id)}
                />
              ))}
            </div>
          </section>
        )}
      </Container>
    </article>
  );
}
