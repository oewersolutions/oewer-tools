import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { PostCard } from "../../../../components/Cards";
import { pageMetadata } from "../../../../lib/metadata";
import { getBlogCategories, getBlogCategoryBySlug, getPostsInCategory } from "../../../../lib/content";

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

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Blog", path: "/blog/" }, { label: category.name }]} />
      <h1 className="text-3xl font-bold text-brand">{category.name}</h1>
      {category.description && <p className="max-w-prose text-slate-700">{category.description}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {getPostsInCategory(category.category_id).map((p) => (
          <PostCard key={p.post_id} post={p} />
        ))}
      </div>
    </div>
  );
}
