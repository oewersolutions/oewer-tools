import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "../../components/Cards";
import Breadcrumbs from "../../components/Breadcrumbs";
import { pageMetadata } from "../../lib/metadata";
import { getBlogCategories, getPostsInCategory, getPublishedPosts } from "../../lib/content";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description: "Guides and explainers to help you get the most from our tools.",
  path: "/blog/",
});

export default function BlogIndexPage() {
  const posts = getPublishedPosts();
  const categories = getBlogCategories().filter((c) => getPostsInCategory(c.category_id).length > 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Blog" }]} />
      <h1 className="text-3xl font-bold text-brand">Blog</h1>
      {categories.length > 0 && (
        <nav aria-label="Blog categories">
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.category_id}>
                <Link href={`/blog/category/${c.slug}/`} className="rounded-full border border-brand-200 px-3 py-1 text-sm text-brand-700 hover:bg-brand-50">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.post_id} post={p} />
          ))}
        </div>
      ) : (
        <p className="text-slate-600">No articles yet.</p>
      )}
    </div>
  );
}
