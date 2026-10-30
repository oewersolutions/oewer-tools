import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { ToolCard } from "../../components/Cards";
import { ArrowRight, CategoryIcon } from "../../components/icons";
import { Container, PageBand } from "../../components/layout";
import SearchBox from "../../components/SearchBox";
import { getToolCategories, getToolsInCategory } from "../../lib/content";
import { pageMetadata } from "../../lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "All tools",
  description:
    "Free online tools for images, finance, development and everyday tasks.",
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
        <div className="mt-8">
          <SearchBox large />
        </div>
        <ul
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Jump to a category"
        >
          {categories.map((c) => (
            <li key={c.category_id}>
              <a
                href={`#${c.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-ink"
              >
                <CategoryIcon slug={c.slug} className="size-4 text-brand" />
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </PageBand>
      <Container className="space-y-20 py-12 sm:py-16">
        {categories.map((category) => {
          const tools = getToolsInCategory(category.category_id);
          return (
            <section
              key={category.category_id}
              aria-labelledby={category.slug}
              className="scroll-mt-28"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="t-eyebrow">
                    {tools.length === 1 ? "1 tool" : `${tools.length} tools`}
                  </p>
                  <h2 id={category.slug} className="t-heading mt-2 text-ink">
                    {category.name}
                  </h2>
                  <p className="mt-2 text-muted">{category.description}</p>
                </div>
                <Link
                  href={`/tools/${category.slug}/`}
                  className="group inline-flex items-center gap-2 font-medium text-brand transition-[gap] hover:gap-3"
                >
                  View all
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              {tools.length > 0 ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {tools.map((t) => (
                    <ToolCard key={t.tool_id} tool={t} category={category} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted">
                  Tools in this category are coming soon.
                </p>
              )}
            </section>
          );
        })}
      </Container>
    </>
  );
}
