import AdSlot from "../../../components/AdSlot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { CategoryCard, ToolCard } from "../../../components/Cards";
import { CategoryIcon } from "../../../components/icons";
import { Container, PageBand, SectionHeading } from "../../../components/layout";
import { pageMetadata } from "../../../lib/metadata";
import { getToolCategories, getToolCategoryBySlug, getToolsInCategory } from "../../../lib/content";

type Props = { params: Promise<{ category: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getToolCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getToolCategoryBySlug((await params).category);
  return category
    ? pageMetadata({ title: category.name, description: category.description, path: `/tools/${category.slug}/`, entity: { type: "tool_category", id: category.category_id } })
    : {};
}

export default async function ToolCategoryPage({ params }: Props) {
  const category = getToolCategoryBySlug((await params).category);
  if (!category) notFound();
  const tools = getToolsInCategory(category.category_id);

  const others = getToolCategories().filter((c) => c.category_id !== category.category_id);

  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Tools", path: "/tools/" }, { label: category.name }]} />}
        eyebrow={tools.length === 1 ? "1 tool" : `${tools.length} tools`}
        title={category.name}
        description={category.description}
        icon={<CategoryIcon slug={category.slug} className="size-7" />}
      />
      <Container className="space-y-16 py-14">
        {tools.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <ToolCard key={t.tool_id} tool={t} category={category} heading="h2" />
            ))}
          </div>
        ) : (
          <p className="text-slate-600">Tools in this category are coming soon.</p>
        )}
        <AdSlot placement="list_bottom" pageType="tool_category" />
        {others.length > 0 && (
          <section aria-labelledby="other-heading">
            <SectionHeading id="other-heading" title="More categories" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((c) => (
                <CategoryCard key={c.category_id} category={c} toolCount={getToolsInCategory(c.category_id).length} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
