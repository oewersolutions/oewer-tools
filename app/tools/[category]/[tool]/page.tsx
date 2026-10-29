import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { pageMetadata } from "../../../../lib/metadata";
import { getToolComponent } from "../../../../components/tools/registry";
import { getPublishedTools, getToolBySlug, getToolCategory } from "../../../../lib/content";

type Props = { params: Promise<{ category: string; tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const params = getPublishedTools().flatMap((tool) => {
    const category = getToolCategory(tool.category_id);
    return category ? [{ category: category.slug, tool: tool.slug }] : [];
  });
  // Static export fails on an empty list, which happens while every tool is a draft.
  // This placeholder is never linked and renders the 404 page (see notFound() below).
  return params.length > 0 ? params : [{ category: "_none", tool: "_none" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, tool } = await params;
  const found = getToolBySlug(category, tool);
  return found
    ? pageMetadata({
        title: found.tool.name,
        description: found.tool.description,
        path: `/tools/${found.category.slug}/${found.tool.slug}/`,
        entity: { type: "tool", id: found.tool.tool_id },
      })
    : {};
}

export default async function ToolPage({ params }: Props) {
  const { category: categorySlug, tool: toolSlug } = await params;
  const found = getToolBySlug(categorySlug, toolSlug);
  if (!found) notFound();
  const { tool, category } = found;
  const ToolComponent = getToolComponent(tool.component_key); // throws, failing the build, for an unregistered key

  return (
    <article className="space-y-6">
      <Breadcrumbs trail={[{ label: "Tools", path: "/tools/" }, { label: category.name, path: `/tools/${category.slug}/` }, { label: tool.name }]} />
      <h1 className="text-3xl font-bold text-brand">{tool.name}</h1>
      <p className="max-w-prose text-lg text-slate-700">{tool.description}</p>

      <section aria-label={tool.name} data-component={tool.component_key}>
        <ToolComponent />
      </section>
    </article>
  );
}
