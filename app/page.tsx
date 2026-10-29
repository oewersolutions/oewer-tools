import type { Metadata } from "next";
import Link from "next/link";
import { CategoryCard, PostCard, ToolCard } from "../components/Cards";
import { pageMetadata } from "../lib/metadata";
import { getFeaturedTools, getPublishedPosts, getSetting, getToolCategories, getToolCategory, getToolsInCategory } from "../lib/content";

export function generateMetadata(): Metadata {
  return { ...pageMetadata({ title: getSetting("site_name"), description: getSetting("site_tagline"), path: "/" }), title: { absolute: getSetting("site_name") } };
}

export default function HomePage() {
  const categories = getToolCategories();
  const featured = getFeaturedTools();
  const posts = getPublishedPosts().slice(0, 3);

  return (
    <div className="space-y-14">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold text-brand">{getSetting("site_name")}</h1>
        <p className="mt-4 text-lg text-slate-700">{getSetting("site_tagline")}</p>
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-2xl font-bold text-brand">
          Browse tools
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoryCard key={c.category_id} category={c} toolCount={getToolsInCategory(c.category_id).length} />
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="text-2xl font-bold text-brand">
            Featured tools
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((t) => (
              <ToolCard key={t.tool_id} tool={t} category={getToolCategory(t.category_id)!} />
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section aria-labelledby="articles-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="articles-heading" className="text-2xl font-bold text-brand">
              Latest articles
            </h2>
            <Link href="/blog/" className="text-sm text-brand-700 underline">
              All articles
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.post_id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
