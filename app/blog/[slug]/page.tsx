import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { PostBody } from "../../../components/Prose";
import { getAuthor, getBlogCategory, getPostBlocks, getPostBySlug, getPostTags, getPublishedPosts } from "../../../lib/content";
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

  return (
    <article className="space-y-6">
      <Breadcrumbs
        trail={[
          { label: "Blog", path: "/blog/" },
          ...(category ? [{ label: category.name, path: `/blog/category/${category.slug}/` }] : []),
          { label: post.title },
        ]}
      />
      <h1 className="max-w-3xl text-3xl font-bold text-brand">{post.title}</h1>
      <p className="text-sm text-slate-600">
        {author && <>By {author.display_name} · </>}
        <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
      </p>
      <PostBody blocks={getPostBlocks(post.post_id)} />
      {tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-wrap gap-2 text-sm text-slate-700">
          {tags.map((t) => (
            <li key={t.tag_id} className="rounded-full bg-slate-100 px-3 py-1">
              {t.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
