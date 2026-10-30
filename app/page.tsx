import AdSlot from "../components/AdSlot";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "../components/icons";
import { PostCard, ToolCard } from "../components/Cards";
import { Container, SectionHeading } from "../components/layout";
import SearchBox from "../components/SearchBox";
import {
  getBlogCategory,
  getFeaturedTools,
  getPostReadingMinutes,
  getPublishedPosts,
  getPublishedTools,
  getSetting,
  getToolCategories,
  getToolCategory,
  getToolsInCategory,
} from "../lib/content";
import { pageMetadata } from "../lib/metadata";
import { toolUrl } from "../lib/search";
import { BadgeCheck, LockKeyhole, Smartphone, Zap } from "lucide-react";

export function generateMetadata(): Metadata {
  return {
    ...pageMetadata({
      title: getSetting("site_name"),
      description: `${getSetting("site_tagline")}. Compress images, work out a loan EMI, tidy JSON and more, all in your browser, with no uploads and no sign-up.`,
      path: "/",
    }),
    title: {
      absolute: `${getSetting("site_name")}: ${getSetting("site_tagline")}`,
    },
  };
}

const WHY = [
  {
    icon: LockKeyhole,
    title: "Private by design",
    text: "Files and numbers are processed in your browser. Nothing you type or choose is uploaded to a server.",
  },
  {
    icon: Zap,
    title: "Instant results",
    text: "No sign-up, no queues and no waiting. Results update as you type, and large jobs run on your own device.",
  },
  {
    icon: BadgeCheck,
    title: "Explained, not just answered",
    text: "Every tool comes with the formula, worked examples and answers to common questions, so you can trust the result.",
  },
  {
    icon: Smartphone,
    title: "Works everywhere",
    text: "Designed for phones, tablets and desktops. Use keyboard, touch or a screen reader.",
  },
];

const FAQ = [
  {
    q: "Are the tools really free?",
    a: "Yes. Every tool is free to use with no sign-up and no limits on how often you use it.",
  },
  {
    q: "Are my files or text uploaded anywhere?",
    a: "No. The tools run in your browser on your own device. Your images, text and numbers are never sent to our servers.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Open a tool and use it. There is nothing to install and no account to make.",
  },
  {
    q: "How accurate are the calculators?",
    a: "They use the standard formulas, which are shown on each tool page along with worked examples. Banks and tax authorities may round differently, so treat results as close estimates.",
  },
  {
    q: "Which browsers and devices work?",
    a: "Current versions of Chrome, Edge, Firefox and Safari on phones, tablets and computers. A few features, such as creating WebP images, depend on the browser.",
  },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const TILES = ["tile-1", "tile-2", "tile-3", "tile-4"];

export default function HomePage() {
  const name = getSetting("site_name");
  const categories = getToolCategories();
  // Four cards: the featured tools first, then others to fill the row.
  const featured = [
    ...getFeaturedTools(),
    ...getPublishedTools().filter((t) => !t.featured),
  ].slice(0, 4);
  const allTools = getPublishedTools();
  const posts = getPublishedPosts().slice(0, 3);
  const popular = allTools
    .flatMap((t) => {
      const c = getToolCategory(t.category_id);
      return c && t.featured ? [{ tool: t, category: c }] : [];
    })
    .slice(0, 3);
  const faqJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }).replace(/</g, "\\u003c");

  return (
    <>
      {/* Hero: one headline, one search field */}
      <section
        aria-labelledby="hero-heading"
        className="hero-bg on-dark relative isolate overflow-hidden text-white"
      >
        <div className="hero-grid absolute inset-0 -z-10" aria-hidden="true" />
        <Container className="py-20 text-center sm:py-28">
          <p className="t-eyebrow !text-white/70">
            Free · Private · No sign-up
          </p>
          <h1 id="hero-heading" className="t-display mx-auto mt-5 max-w-4xl">
            Tools that do the job and keep your files to yourself.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            Compress an image, work out a loan EMI, tidy JSON or make a QR code.
            Everything runs in your browser, so nothing you type or choose ever
            leaves your device.
          </p>
          <div className="mx-auto mt-10 flex max-w-2xl justify-center">
            <SearchBox large />
          </div>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-white/70">
            <span>Popular:</span>
            {popular.map(({ tool, category }) => (
              <Link
                key={tool.tool_id}
                href={toolUrl(category.slug, tool.slug)}
                className="rounded-full border border-white/20 px-3.5 py-1 text-white transition-colors hover:bg-white/10"
              >
                {tool.name}
              </Link>
            ))}
          </p>
          <ul
            className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-white/70"
            aria-label="What to expect"
          >
            {["Nothing is uploaded", "No accounts", "Works on any device"].map(
              (f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-gold-300"
                  />
                  {f}
                </li>
              ),
            )}
          </ul>
        </Container>
      </section>

      {/* Featured tools */}
      <section aria-labelledby="featured-heading" className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            id="featured-heading"
            eyebrow="Featured"
            title="Start with the favourites"
            href="/tools/"
            hrefLabel="See all tools"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((t) => {
              const c = getToolCategory(t.category_id);
              return c ? (
                <ToolCard key={t.tool_id} tool={t} category={c} />
              ) : null;
            })}
          </div>
        </Container>
      </section>

      <Container>
        <AdSlot placement="top_banner" pageType="home" />
      </Container>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="pb-20 sm:pb-24">
        <Container>
          <SectionHeading
            id="categories-heading"
            eyebrow="Browse"
            title="Find the right tool"
            description="Four collections, each a few clicks from the answer."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <Link
                key={c.category_id}
                href={`/tools/${c.slug}/`}
                className={`${TILES[i % TILES.length]} group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-black/60"
                />
                <h3 className="t-subheading !text-xl">{c.name}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {plural(getToolsInCategory(c.category_id).length, "tool")} ·{" "}
                  {c.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium transition-[gap] group-hover:gap-3">
                  Explore <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Why: four plain columns */}
      <section
        aria-labelledby="why-heading"
        className="bg-surface py-20 sm:py-24"
      >
        <Container>
          <SectionHeading
            id="why-heading"
            eyebrow={`Why ${name}`}
            title="Built to be fast, clear and private"
          />
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rule pt-6">
                <Icon aria-hidden="true" className="size-6 text-brand" />
                <h3 className="t-subheading mt-4 text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {text}
                </p>
              </div>
            ))}
          </div>
          <dl
            className="rule mt-14 grid grid-cols-2 gap-6 pt-10 lg:grid-cols-4"
            aria-label="At a glance"
          >
            {[
              [String(allTools.length), "free tools"],
              [String(categories.length), "categories"],
              ["0", "files uploaded"],
              ["0", "accounts needed"],
            ].map(([value, label]) => (
              <div key={label}>
                <dd className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                  {value}
                </dd>
                <dt className="mt-1 text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container>
        <AdSlot placement="mid_page" pageType="home" />
      </Container>

      {/* Articles */}
      {posts.length > 0 && (
        <section aria-labelledby="articles-heading" className="py-20 sm:py-24">
          <Container>
            <SectionHeading
              id="articles-heading"
              eyebrow="Guides"
              title="Learn the maths behind the tools"
              href="/blog/"
              hrefLabel="All articles"
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard
                  key={p.post_id}
                  post={p}
                  categoryName={getBlogCategory(p.category_id)?.name}
                  minutes={getPostReadingMinutes(p.post_id)}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="pb-20 sm:pb-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
          <div>
            <p className="t-eyebrow">Questions</p>
            <h2 id="faq-heading" className="t-heading mt-2 text-ink">
              Good to know
            </h2>
            <p className="mt-3 max-w-sm text-muted">
              Short answers about how the tools work and what happens to your
              data.
            </p>
          </div>
          <div>
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group rule py-5 last:border-b last:border-line"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-6 font-medium text-ink">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-lg leading-none transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-xl leading-relaxed text-muted">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqJson }}
        />
      </section>

      {/* Closing call to action */}
      <section aria-labelledby="cta-heading" className="pb-4">
        <Container>
          <div className="hero-bg on-dark relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <h2 id="cta-heading" className="t-title mx-auto max-w-2xl">
              Find the tool you need.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-white/80">
              Free, fast and private. No sign-up, no uploads.
            </p>
            <Link href="/tools/" className="btn btn-light mt-8">
              Browse all tools
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
