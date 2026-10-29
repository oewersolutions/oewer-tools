import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { ToolCard } from "../../components/Cards";
import { CategoryIcon } from "../../components/icons";
import { Container, PageBand } from "../../components/layout";
import SearchBox from "../../components/SearchBox";
import { getToolCategories, getToolsInCategory } from "../../lib/content";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "All tools",
  description: "Free online tools for images, finance, development and everyday tasks.",
  path: "/tools/",
});

export default function ToolsIndexPage() {
  const categories = getToolCategories();
  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Tools" }]} />}
        eyebrow="Tools"
        title="All tools"
        description="Free tools for images, money, code and everyday tasks. They run in your browser, so your data stays on your device."
      >
        <div className="mt-6">
          <SearchBox large />
        </div>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Jump to a category">
          {categories.map((c) => (
            <li key={c.category_id}>
              <a href={`#${c.slug}`} className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-brand-50">
                <CategoryIcon slug={c.slug} className="size-4 text-brand-600" />
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </PageBand>
      <Container className="space-y-16 py-14">
        {categories.map((category) => {
          const tools = getToolsInCategory(category.category_id);
          return (
            <section key={category.category_id} aria-labelledby={category.slug} className="scroll-mt-24">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-gold-300">
                  <CategoryIcon slug={category.slug} className="size-6" />
                </span>
                <div>
                  <h2 id={category.slug} className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                    <Link href={`/tools/${category.slug}/`} className="hover:underline">
                      {category.name}
                    </Link>
                  </h2>
                  <p className="text-slate-700">{category.description}</p>
                </div>
              </div>
              {tools.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((t) => (
                    <ToolCard key={t.tool_id} tool={t} category={category} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-600">Tools in this category are coming soon.</p>
              )}
            </section>
          );
        })}
      </Container>
    </>
  );
}
