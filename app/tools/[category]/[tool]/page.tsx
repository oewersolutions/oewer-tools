import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { pageMetadata } from "../../../../lib/metadata";
import { getToolComponent } from "../../../../components/tools/registry";
import { Prose } from "../../../../components/Prose";
import { ToolCard } from "../../../../components/Cards";
import { getPublishedTools, getRelatedTools, getToolBySlug, getToolCategory, getToolContent } from "../../../../lib/content";

type Props = { params: Promise<{ category: string; tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const params = getPublishedTools().flatMap((tool) => {
    const category = getToolCategory(tool.category_id);
    return category ? [{ category: category.slug, tool: tool.slug }] : [];
  });
  // Static export fails on an empty list, which happens when no tool is published.
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

function faqJsonLd(faq: { q: string; a: string }[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ToolPage({ params }: Props) {
  const { category: categorySlug, tool: toolSlug } = await params;
  const found = getToolBySlug(categorySlug, toolSlug);
  if (!found) notFound();
  const { tool, category } = found;
  const content = getToolContent(tool.tool_id);
  const related = getRelatedTools(tool, content.related);
  const ToolComponent = getToolComponent(tool.component_key); // throws, failing the build, for an unregistered key

  return (
    <article className="space-y-6 break-words">
      <Breadcrumbs trail={[{ label: "Tools", path: "/tools/" }, { label: category.name, path: `/tools/${category.slug}/` }, { label: tool.name }]} />
      <h1 className="text-3xl font-bold text-brand">{tool.name}</h1>
      <p className="max-w-prose text-lg text-slate-700">{tool.description}</p>

      <section aria-label={tool.name} data-component={tool.component_key}>
        <ToolComponent />
      </section>

      {content.help && (
        <section aria-labelledby="help-heading" className="max-w-3xl space-y-3">
          <h2 id="help-heading" className="text-2xl font-bold text-brand">
            How to use {tool.name}
          </h2>
          <Prose source={content.help} />
        </section>
      )}

      {content.examples.length > 0 && (
        <section aria-labelledby="examples-heading" className="max-w-3xl">
          <h2 id="examples-heading" className="text-2xl font-bold text-brand">
            Examples
          </h2>
          <ul className="mt-3 space-y-3">
            {content.examples.map((e) => (
              <li key={e.title} className="rounded border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{e.title}</p>
                <p className="mt-1 text-slate-700">{e.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.faq.length > 0 && (
        <section aria-labelledby="faq-heading" className="max-w-3xl">
          <h2 id="faq-heading" className="text-2xl font-bold text-brand">
            Frequently asked questions
          </h2>
          <div className="mt-3 space-y-4">
            {content.faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-slate-700">{f.a}</p>
              </div>
            ))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(content.faq) }} />
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-bold text-brand">
            Related tools
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ToolCard key={r.tool.tool_id} tool={r.tool} category={r.category} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
