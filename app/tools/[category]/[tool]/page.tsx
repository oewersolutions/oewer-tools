import AdSlot from "../../../../components/AdSlot";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import { BASE_PATH, getSiteUrl, pageMetadata } from "../../../../lib/metadata";
import { absoluteUrl } from "../../../../lib/seo";
import { nonEmptyParams } from "../../../../lib/static";
import ToolHost from "../../../../components/tools/ToolHost";
import { toolComponentKey } from "../../../../lib/tools/keys";
import { Prose } from "../../../../components/Prose";
import { PostCard, ToolCard } from "../../../../components/Cards";
import { Container, PageBand } from "../../../../components/layout";
import { Check } from "lucide-react";
import { ToolEvents } from "../../../../components/tools/ToolEvents";
import {
  getBlogCategory,
  getGuidesForTool,
  getPostReadingMinutes,
  getPublishedTools,
  getRelatedTools,
  getToolBySlug,
  getToolCategory,
  getToolContent,
} from "../../../../lib/content";

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
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function appJsonLd(
  name: string,
  description: string,
  url: string,
): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in the browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
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
  const componentKey = toolComponentKey(tool.component_key); // throws, failing the build, for an unregistered key

  const pageUrl = absoluteUrl(
    getSiteUrl(),
    BASE_PATH,
    `/tools/${category.slug}/${tool.slug}/`,
  );
  const shareText = encodeURIComponent(
    `${tool.name}: free and private, runs in your browser`,
  );
  const shareUrl = encodeURIComponent(pageUrl);
  const shareLinks = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
    },
    {
      label: "X",
      href: `https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: appJsonLd(tool.name, tool.description, pageUrl),
        }}
      />
      <PageBand
        breadcrumbs={
          <Breadcrumbs
            trail={[
              { label: "Tools", path: "/tools/" },
              { label: category.name, path: `/tools/${category.slug}/` },
              { label: tool.name },
            ]}
          />
        }
        eyebrow={category.name}
        title={tool.name}
        description={tool.description}
      >
        <ul
          className="mt-5 flex flex-wrap gap-2 text-sm"
          aria-label="Highlights"
        >
          {["Free", "No sign-up", "Runs in your browser"].map((label) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1 font-medium text-ink-2"
            >
              <Check aria-hidden="true" className="size-3.5 text-brand" />
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <span>Share this tool:</span>
          {shareLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand underline underline-offset-2"
            >
              {l.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </p>
      </PageBand>

      <Container className="space-y-20 py-12 sm:py-16 [overflow-wrap:anywhere]">
        <section aria-label={tool.name} data-component={tool.component_key}>
          <noscript>
            <p className="panel bg-surface p-5 text-ink-2">
              This tool runs in your browser and needs JavaScript. Turn
              JavaScript on to use it. The guide below works without it.
            </p>
          </noscript>
          <ToolEvents tool={tool.slug}>
            <ToolHost componentKey={componentKey} />
          </ToolEvents>
        </section>

        <AdSlot placement="below_tool" pageType="tool" />

        {content.help && (
          <section
            aria-labelledby="help-heading"
            className="max-w-3xl space-y-5"
          >
            <h2 id="help-heading" className="t-heading text-ink">
              How to use {tool.name}
            </h2>
            <Prose source={content.help} />
          </section>
        )}

        {content.examples.length > 0 && (
          <section aria-labelledby="examples-heading">
            <h2 id="examples-heading" className="t-heading text-ink">
              Examples
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {content.examples.map((e, i) => (
                <li key={e.title} className="card p-6">
                  <p className="t-subheading flex items-center gap-3 text-ink">
                    <span
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-lg bg-tint text-sm font-semibold text-brand"
                    >
                      {i + 1}
                    </span>
                    {e.title}
                  </p>
                  <p className="mt-3 leading-relaxed text-muted">{e.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {content.faq.length > 0 && (
          <section aria-labelledby="faq-heading" className="max-w-3xl">
            <h2 id="faq-heading" className="t-heading text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-6">
              {content.faq.map((f) => (
                <details
                  key={f.q}
                  className="group rule py-5 last:border-b last:border-line"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-6 font-medium text-ink">
                    <h3 className="font-medium">{f.q}</h3>
                    <span
                      aria-hidden="true"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: faqJsonLd(content.faq) }}
            />
          </section>
        )}

        {guides.length > 0 && (
          <section aria-labelledby="guides-heading">
            <h2 id="guides-heading" className="t-heading text-ink">
              Guides about {tool.name}
            </h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {guides.map((p) => (
                <PostCard
                  key={p.post_id}
                  post={p}
                  categoryName={getBlogCategory(p.category_id)?.name}
                  minutes={getPostReadingMinutes(p.post_id)}
                />
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="t-heading text-ink">
              Related tools
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <ToolCard
                  key={r.tool.tool_id}
                  tool={r.tool}
                  category={r.category}
                />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
