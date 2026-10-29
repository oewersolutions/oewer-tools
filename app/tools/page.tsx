import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "../../components/Cards";
import Breadcrumbs from "../../components/Breadcrumbs";
import { pageMetadata } from "../../lib/metadata";
import { getToolCategories, getToolsInCategory } from "../../lib/content";

export const metadata: Metadata = pageMetadata({
  title: "All tools",
  description: "Free online tools for images, finance, development and everyday tasks.",
  path: "/tools/",
});

export default function ToolsIndexPage() {
  return (
    <div className="space-y-10">
      <Breadcrumbs trail={[{ label: "Tools" }]} />
      <h1 className="text-3xl font-bold text-brand">All tools</h1>
      {getToolCategories().map((category) => {
        const tools = getToolsInCategory(category.category_id);
        return (
          <section key={category.category_id} aria-labelledby={category.slug}>
            <h2 id={category.slug} className="text-2xl font-bold text-brand">
              <Link href={`/tools/${category.slug}/`} className="hover:underline">
                {category.name}
              </Link>
            </h2>
            <p className="mt-1 max-w-prose text-slate-700">{category.description}</p>
            {tools.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => (
                  <ToolCard key={t.tool_id} tool={t} category={category} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Tools in this category are coming soon.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
