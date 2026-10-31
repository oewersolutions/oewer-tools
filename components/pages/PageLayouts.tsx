import Link from "next/link";
import type { ReactNode } from "react";
import { parseMarkdown, type MarkdownBlock } from "../../lib/markdown";
import { pageOutline } from "../../lib/posts";
import { ArticleToc } from "../blog/ArticleToc";
import Breadcrumbs from "../Breadcrumbs";
import { ArrowRight } from "../icons";
import { Container, PageBand } from "../layout";
import { Inline, Prose } from "../Prose";

/** Source text with its first paragraph taken off, and that paragraph (or "" when the text starts with something else). */
function splitFirstParagraph(
  source: string,
  only?: RegExp,
): { first: string; rest: string } {
  const [head, ...tail] = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const text = (head ?? "").trim();
  if (
    text === "" ||
    text.startsWith("#") ||
    /^[-*]\s/.test(text) ||
    (only && !only.test(text))
  )
    return { first: "", rest: source };
  return { first: text.replace(/\s+/g, " "), rest: tail.join("\n\n") };
}

/** Privacy, Terms and other plain pages: a calm reading column, with a contents list beside long ones. */
export function ReadingPage({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const { first: updated, rest } = splitFirstParagraph(
    content,
    /^last updated/i,
  );
  const outline = pageOutline(rest);
  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: title }]} />}
        title={title}
      >
        {updated && <p className="t-meta mt-4 !text-sm">{updated}</p>}
      </PageBand>
      <Container className="py-12 sm:py-16">
        <div
          className={`grid justify-center gap-x-16 ${outline.length >= 3 ? "lg:grid-cols-[13rem_minmax(0,44rem)]" : "lg:grid-cols-[minmax(0,44rem)]"}`}
        >
          {outline.length >= 3 && (
            <aside aria-label="On this page" className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-28">
                <p className="t-eyebrow mb-3">On this page</p>
                <ArticleToc items={outline} />
              </nav>
            </aside>
          )}
          <div className="min-w-0">
            <Prose source={rest} />
          </div>
        </div>
      </Container>
    </>
  );
}

/** Contact: the page's own text, with the email address as a prominent card beside it. */
export function ContactPage({
  title,
  content,
  email,
}: {
  title: string;
  content: string;
  email: string;
}) {
  const { first, rest } = splitFirstParagraph(content);
  // The intro already says "Email us at …"; keep it out of the body so the address is not repeated three times.
  return (
    <>
      <PageBand
        breadcrumbs={<Breadcrumbs trail={[{ label: title }]} />}
        title={title}
        description={first || undefined}
      />
      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,40rem)_1fr] lg:gap-20">
          <div className="min-w-0">
            <Prose source={rest.replace(/^Email us at [^\n]*(\n\n|$)/, "")} />
          </div>
          {email && (
            <aside
              aria-label="Email us"
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <div className="hero-bg on-dark rounded-3xl p-8 text-white">
                <p className="t-eyebrow !text-white/70">Email</p>
                <p className="t-heading mt-3 break-words">{email}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  We read every message. Tell us the tool, what you tried and
                  what happened, and we will get back to you.
                </p>
                <a href={`mailto:${email}`} className="btn btn-light mt-6">
                  Write an email
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </div>
            </aside>
          )}
        </div>
      </Container>
    </>
  );
}

interface Section {
  title: string;
  blocks: MarkdownBlock[];
}

/** A list whose every item starts with **a bold lead**, shown as small cards: the bold part is the card's title. */
function leadItems(items: string[]): { lead: string; text: string }[] | null {
  const parsed = items.map((i) => /^\*\*(.+?)\*\*\.?\s*(.*)$/.exec(i));
  return parsed.every(Boolean)
    ? parsed.map((m) => ({ lead: m![1]!.replace(/\.$/, ""), text: m![2]! }))
    : null;
}

function SectionBlocks({ blocks }: { blocks: MarkdownBlock[] }): ReactNode {
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <h3 key={i} className="t-subheading text-ink">
              <Inline text={b.text} />
            </h3>
          );
        }
        if (b.type === "list") {
          const cards = leadItems(b.items);
          return cards ? (
            <ul key={i} className="grid gap-4 sm:grid-cols-2">
              {cards.map((c) => (
                <li key={c.lead} className="card p-6">
                  <p className="t-subheading text-ink">{c.lead}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    <Inline text={c.text} />
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <ul
              key={i}
              className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-ink-2 marker:text-brand"
            >
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-lg leading-relaxed text-ink-2">
            <Inline text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * About: an editorial page made from the page's own text. A huge title, the opening paragraphs as large type, then each
 * "# section" as a row (its heading on the left, its text on the right), with bold-led bullet lists shown as cards.
 * Editing the page in the admin changes it; nothing here is fixed text.
 */
export function AboutPage({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const blocks = parseMarkdown(content);
  const firstHeading = blocks.findIndex(
    (b) => b.type === "heading" && b.level === 1,
  );
  const intro = (
    firstHeading === -1 ? blocks : blocks.slice(0, firstHeading)
  ).filter(
    (b): b is Extract<MarkdownBlock, { type: "paragraph" }> =>
      b.type === "paragraph",
  );
  const sections: Section[] = [];
  if (firstHeading !== -1) {
    for (const b of blocks.slice(firstHeading)) {
      if (b.type === "heading" && b.level === 1)
        sections.push({ title: b.text, blocks: [] });
      else sections[sections.length - 1]!.blocks.push(b);
    }
  }
  const [lead, ...more] = intro;
  return (
    <>
      <Container className="pt-8 sm:pt-10">
        <Breadcrumbs trail={[{ label: title }]} />
        <h1 className="t-display mt-4 max-w-4xl text-ink">{title}</h1>
        {lead && (
          <p className="mt-8 max-w-3xl text-2xl font-medium leading-snug tracking-tight text-ink sm:text-3xl">
            <Inline text={lead.text} />
          </p>
        )}
        {more.map((p, i) => (
          <p key={i} className="t-lead mt-5 max-w-2xl">
            <Inline text={p.text} />
          </p>
        ))}
      </Container>
      <Container className="mt-16">
        {sections.map((s) => (
          <section
            key={s.title}
            className="rule grid gap-6 py-12 lg:grid-cols-[1fr_2fr] lg:gap-16"
          >
            <h2 className="t-heading text-ink lg:sticky lg:top-28 lg:self-start">
              {s.title}
            </h2>
            <SectionBlocks blocks={s.blocks} />
          </section>
        ))}
      </Container>
      <Container className="mt-8">
        <div className="hero-bg on-dark rounded-[2rem] px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <h2 className="t-title mx-auto max-w-2xl">
            Try a tool, or tell us what to build next.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/tools/" className="btn btn-light">
              Browse the tools
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/contact/"
              className="btn border-white/30 bg-transparent text-white hover:bg-white/10 hover:border-white"
            >
              Contact us
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
