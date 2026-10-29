import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { PostCard } from "../../../../components/Cards";
import { Container, PageBand } from "../../../../components/layout";
import { pageMetadata } from "../../../../lib/metadata";
import { getBlogCategories, getBlogCategoryBySlug, getPostReadingMinutes, getPostsInCategory } from "../../../../lib/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// Only categories that have published articles get a page.
export function generateStaticParams() {
  return getBlogCategories()
    .filter((c) => getPostsInCategory(c.category_id).length > 0)
    .map((c) => ({ slug: c.slug }));
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
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Blog", path: "/blog/" }, { label: category.name }]} />}
        eyebrow={posts.length === 1 ? "1 article" : `${posts.length} articles`}
        title={category.name}
        description={category.description || undefined}
      />
      <Container className="py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.post_id} post={p} categoryName={category.name} minutes={getPostReadingMinutes(p.post_id)} />
          ))}
        </div>
      </Container>
    </>
  );
}
