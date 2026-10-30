import AdSlot from "../../../../components/AdSlot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { pageMetadata } from "../../../../lib/metadata";
import { nonEmptyParams } from "../../../../lib/static";
import { getToolComponent } from "../../../../components/tools/registry";
import { Prose } from "../../../../components/Prose";
import { PostCard, ToolCard } from "../../../../components/Cards";
import { ToolIcon } from "../../../../components/icons";
import { Container, PageBand } from "../../../../components/layout";
import { Check } from "lucide-react";
import { ToolEvents } from "../../../../components/tools/ToolEvents";
import { getBlogCategory, getGuidesForTool, getPostReadingMinutes, getPublishedTools, getRelatedTools, getToolBySlug, getToolCategory, getToolContent } from "../../../../lib/content";

type Props = { params: Promise<{ category: string; tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const params = getPublishedTools().flatMap((tool) => {
    const category = getToolCategory(tool.category_id);
    return category ? [{ category: category.slug, tool: tool.slug }] : [];
  });
  // Placeholder (never linked, renders the 404 page) so the export does not fail when no tool is published.
  return nonEmptyParams(params, { category: "_none", tool: "_none" });
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
  const guides = getGuidesForTool(tool.tool_id);
  const ToolComponent = getToolComponent(tool.component_key); // throws, failing the build, for an unregistered key

  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: "Tools", path: "/tools/" }, { label: category.name, path: `/tools/${category.slug}/` }, { label: tool.name }]} />}
        eyebrow={category.name}
        title={tool.name}
        description={tool.description}
        icon={<ToolIcon componentKey={tool.component_key} className="size-7" />}
      >
        <ul className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="Highlights">
          {["Free", "No sign-up", "Runs in your browser"].map((label) => (
            <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 font-medium text-brand-800">
              <Check aria-hidden="true" className="size-3.5 text-brand-600" />
              {label}
            </li>
          ))}
        </ul>
      </PageBand>

      <Container className="space-y-16 py-12 [overflow-wrap:anywhere]">
        <section aria-label={tool.name} data-component={tool.component_key}>
          <ToolEvents tool={tool.slug}>
            <ToolComponent />
          </ToolEvents>
        </section>

        <AdSlot placement="below_tool" pageType="tool" />

        {content.help && (
          <section aria-labelledby="help-heading" className="max-w-3xl space-y-4">
            <h2 id="help-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              How to use {tool.name}
            </h2>
            <Prose source={content.help} />
          </section>
        )}

        {content.examples.length > 0 && (
          <section aria-labelledby="examples-heading">
            <h2 id="examples-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Examples
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {content.examples.map((e, i) => (
                <li key={e.title} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
                  <p className="flex items-center gap-3 font-semibold text-ink">
                    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-gold-300/40 font-display text-gold-700">
                      {i + 1}
                    </span>
                    {e.title}
                  </p>
                  <p className="mt-3 leading-relaxed text-slate-700">{e.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.faq.length > 0 && (
          <section aria-labelledby="faq-heading" className="max-w-3xl">
            <h2 id="faq-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-6 space-y-3">
              {content.faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-brand-100 bg-white p-5">
                  <h3 className="font-semibold text-ink">{f.q}</h3>
                  <p className="mt-2 leading-relaxed text-slate-700">{f.a}</p>
                </div>
              ))}
            </div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(content.faq) }} />
          </section>
        )}

        {guides.length > 0 && (
          <section aria-labelledby="guides-heading">
            <h2 id="guides-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Guides about {tool.name}
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {guides.map((p) => (
                <PostCard key={p.post_id} post={p} categoryName={getBlogCategory(p.category_id)?.name} minutes={getPostReadingMinutes(p.post_id)} />
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Related tools
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <ToolCard key={r.tool.tool_id} tool={r.tool} category={r.category} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
