import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { ToolCard } from "../../../components/Cards";
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

  return (
    <div className="space-y-6">
      <Breadcrumbs trail={[{ label: "Tools", path: "/tools/" }, { label: category.name }]} />
      <h1 className="text-3xl font-bold text-brand">{category.name}</h1>
      <p className="max-w-prose text-slate-700">{category.description}</p>
      {tools.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <ToolCard key={t.tool_id} tool={t} category={category} />
          ))}
        </div>
      ) : (
        <p className="text-slate-600">Tools in this category are coming soon.</p>
      )}
    </div>
  );
}
