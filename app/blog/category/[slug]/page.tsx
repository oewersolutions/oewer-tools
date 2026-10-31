import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { PostCard } from "../../../../components/Cards";
import BlogHeader, { PostGrid } from "../../../../components/BlogHeader";
import { Container } from "../../../../components/layout";
import { nonEmptyParams } from "../../../../lib/static";
import { pageMetadata } from "../../../../lib/metadata";
import {
  getBlogCategories,
  getBlogCategoryBySlug,
  getPostReadingMinutes,
  getPostsInCategory,
} from "../../../../lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Only categories that have published articles get a page.
export function generateStaticParams() {
  return nonEmptyParams(
    getBlogCategories()
      .filter((c) => getPostsInCategory(c.category_id).length > 0)
      .map((c) => ({ slug: c.slug })),
    { slug: "_none" },
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getBlogCategoryBySlug((await params).slug);
  return category
    ? pageMetadata({
        title: category.name,
        description: category.description || undefined,
        path: `/blog/category/${category.slug}/`,
        entity: { type: "blog_category", id: category.category_id },
      })
    : {};
}

export default async function BlogCategoryPage({ params }: Props) {
  const category = getBlogCategoryBySlug((await params).slug);
  if (!category) notFound();

  const posts = getPostsInCategory(category.category_id);

  return (
    <>
      <BlogHeader
        breadcrumbs={
          <Breadcrumbs
            trail={[
              { label: "Articles", path: "/blog/" },
              { label: category.name },
            ]}
          />
        }
        eyebrow="Category"
        title={category.name}
        description={category.description || undefined}
        dates={posts.map((p) => p.published_at)}
        count={posts.length}
        active={category.slug}
      />
      <Container className="py-12 sm:py-14">
        <PostGrid>
          {posts.map((p) => (
            <PostCard
              heading="h2"
              key={p.post_id}
              post={p}
              categoryName={category.name}
              minutes={getPostReadingMinutes(p.post_id)}
            />
          ))}
        </PostGrid>
      </Container>
    </>
  );
}
