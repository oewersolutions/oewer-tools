import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { PostCard } from "../../../../components/Cards";
import { Container, PageBand } from "../../../../components/layout";
import { getBlogCategory, getPostReadingMinutes, getPostsByTag, getTagBySlug, getTagsInUse, MIN_POSTS_FOR_INDEXED_TAG } from "../../../../lib/content";
import { pageMetadata } from "../../../../lib/metadata";
import { nonEmptyParams } from "../../../../lib/static";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Only tags that are used by a published article get a page.
export function generateStaticParams() {
  return nonEmptyParams(
    getTagsInUse().map((t) => ({ slug: t.slug })),
    { slug: "_none" },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = getTagBySlug((await params).slug);
  if (!tag) return {};
  return pageMetadata({
    title: `${tag.name} articles`,
    description: `Articles tagged ${tag.name}.`,
    path: `/blog/tag/${tag.slug}/`,
    noindex: getPostsByTag(tag.tag_id).length < MIN_POSTS_FOR_INDEXED_TAG,
  });
}

export default async function TagPage({ params }: Props) {
  const tag = getTagBySlug((await params).slug);
  if (!tag) notFound();
  const posts = getPostsByTag(tag.tag_id);
  if (posts.length === 0) notFound();

  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Blog", path: "/blog/" }, { label: `Tag: ${tag.name}` }]} />}
        eyebrow={posts.length === 1 ? "1 article" : `${posts.length} articles`}
        title={`Tagged: ${tag.name}`}
      />
      <Container className="py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard heading="h2" key={p.post_id} post={p} categoryName={getBlogCategory(p.category_id)?.name} minutes={getPostReadingMinutes(p.post_id)} />
          ))}
        </div>
      </Container>
    </>
  );
}
