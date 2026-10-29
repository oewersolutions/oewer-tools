import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ToolIcon } from "../components/icons";
import { CategoryCard, PostCard, ToolCard } from "../components/Cards";
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
import {
  BadgeCheck,
  BookOpen,
  CircleHelp,
  Gauge,
  LockKeyhole,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

export function generateMetadata(): Metadata {
  return { ...pageMetadata({ title: getSetting("site_name"), description: getSetting("site_tagline"), path: "/" }), title: { absolute: `${getSetting("site_name")}: ${getSetting("site_tagline")}` } };
}

const WHY = [
  { icon: LockKeyhole, title: "Private by design", text: "Files and numbers are processed in your browser. Nothing you type or choose is uploaded to a server." },
  { icon: Zap, title: "Instant results", text: "No sign-up, no queues and no waiting. Results update as you type, and large jobs run on your own device." },
  { icon: BadgeCheck, title: "Explained, not just answered", text: "Every tool comes with the formula, worked examples and answers to common questions, so you can trust the result." },
  { icon: Smartphone, title: "Works everywhere", text: "Designed for phones, tablets and desktops. Use keyboard, touch or a screen reader." },
];

const STEPS = [
  { icon: MousePointerClick, title: "Pick a tool", text: "Search or browse the categories to find what you need." },
  { icon: Sparkles, title: "Enter or choose your data", text: "Type your numbers or text, or choose an image. It never leaves your device." },
  { icon: Gauge, title: "Get the answer", text: "See the result straight away, then copy it or download the file." },
];

const FAQ = [
  { q: "Are the tools really free?", a: "Yes. Every tool is free to use with no sign-up and no limits on how often you use it." },
  { q: "Are my files or text uploaded anywhere?", a: "No. The tools run in your browser on your own device. Your images, text and numbers are never sent to our servers." },
  { q: "Do I need to create an account?", a: "No. Open a tool and use it. There is nothing to install and no account to make." },
  { q: "How accurate are the calculators?", a: "They use the standard formulas, which are shown on each tool page along with worked examples. Banks and tax authorities may round differently, so treat results as close estimates." },
  { q: "Which browsers and devices work?", a: "Current versions of Chrome, Edge, Firefox and Safari on phones, tablets and computers. A few features, such as creating WebP images, depend on the browser." },
];

export default function HomePage() {
  const name = getSetting("site_name");
  const categories = getToolCategories();
  const featured = getFeaturedTools();
  const allTools = getPublishedTools();
  const posts = getPublishedPosts().slice(0, 3);
  const toolsWithCategory = allTools.flatMap((t) => {
    const c = getToolCategory(t.category_id);
    return c ? [{ tool: t, category: c }] : [];
  });
  const popular = toolsWithCategory.filter((x) => x.tool.featured).slice(0, 4);
  const faqJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  }).replace(/</g, "\\u003c");

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="hero-bg relative isolate overflow-hidden text-white">
        <div className="hero-grid absolute inset-0 -z-10" aria-hidden="true" />
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 backdrop-blur">
              <ShieldCheck aria-hidden="true" className="size-4 text-gold-300" />
              Free · No sign-up · Private by design
            </p>
            <h1 id="hero-heading" className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Free online tools that <span className="gradient-text">respect your privacy</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100 sm:text-xl">
              Compress images, work out loan EMIs, format JSON, make QR codes and more. Everything runs in your browser, so your files and numbers never leave your device.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tools/" className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3 font-semibold text-brand-950 shadow-lift transition hover:bg-gold-300">
                Explore all tools
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/blog/" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/15">
                <BookOpen aria-hidden="true" className="size-4" />
                Read the guides
              </Link>
            </div>
            <div className="mt-10">
              <SearchBox large />
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-brand-200">
                <span>Popular:</span>
                {popular.map(({ tool, category }) => (
                  <Link key={tool.tool_id} href={toolUrl(category.slug, tool.slug)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-brand-50 transition hover:bg-white/15">
                    {tool.name}
                  </Link>
                ))}
              </p>
            </div>
          </div>

          {/* A sample of what the tools look like. Decorative: the numbers are an example, not live. */}
          <div aria-hidden="true" className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-[2rem] bg-gold-400/10 blur-2xl" />
            <div className="relative rotate-2 rounded-3xl border border-white/15 bg-white p-6 text-ink shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-gold-300">
                  <ToolIcon componentKey="emi-calculator" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">EMI Calculator</p>
                  <p className="text-xs text-slate-600">Sample result</p>
                </div>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-baseline justify-between"><dt className="text-slate-600">Loan amount</dt><dd className="font-medium">₹10,00,000</dd></div>
                <div className="flex items-baseline justify-between"><dt className="text-slate-600">Interest rate</dt><dd className="font-medium">9% a year</dd></div>
                <div className="flex items-baseline justify-between"><dt className="text-slate-600">Tenure</dt><dd className="font-medium">5 years</dd></div>
              </dl>
              <div className="mt-5 rounded-2xl bg-brand-50 p-5">
                <p className="text-xs text-slate-600">Monthly EMI</p>
                <p className="font-display text-4xl font-semibold text-brand">₹20,758</p>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full w-[80%] rounded-full bg-gradient-to-r from-brand-700 to-gold-500" />
                </div>
                <p className="mt-2 flex justify-between text-xs text-slate-600"><span>Principal</span><span>Interest ₹2,45,501</span></p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 flex -rotate-3 items-center gap-3 rounded-2xl border border-white/15 bg-brand-900/90 px-4 py-3 shadow-xl backdrop-blur">
              <LockKeyhole className="size-5 text-gold-300" />
              <p className="text-sm font-medium text-white">0 bytes uploaded</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section aria-label="At a glance" className="border-b border-brand-100 bg-white">
        <Container>
          <dl className="grid grid-cols-2 gap-6 py-8 text-center lg:grid-cols-4">
            {[
              [String(allTools.length), "free tools"],
              [String(categories.length), "categories"],
              ["0", "files uploaded"],
              ["0", "accounts needed"],
            ].map(([value, label]) => (
              <div key={label}>
                <dd className="font-display text-4xl font-semibold text-brand">{value}</dd>
                <dt className="mt-1 text-sm text-slate-700">{label}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="py-20">
        <Container>
          <SectionHeading id="categories-heading" eyebrow="Browse" title="Find the right tool" description="Four groups of tools for everyday jobs." href="/tools/" hrefLabel="All tools" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <CategoryCard key={c.category_id} category={c} toolCount={getToolsInCategory(c.category_id).length} />
            ))}
          </div>
        </Container>
      </section>

      {/* Featured tools */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="border-y border-brand-100 bg-white py-20">
          <Container>
            <SectionHeading id="featured-heading" eyebrow="Most used" title="Featured tools" description="Start with these favourites." />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((t) => (
                <ToolCard key={t.tool_id} tool={t} category={getToolCategory(t.category_id)!} />
              ))}
            </div>
            <div className="mt-12">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-600">Every tool</h3>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {toolsWithCategory.map(({ tool, category }) => (
                  <li key={tool.tool_id}>
                    <Link href={toolUrl(category.slug, tool.slug)} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-cream px-4 py-2 text-sm font-medium text-brand-800 transition hover:border-brand-300 hover:bg-brand-50">
                      <ToolIcon componentKey={tool.component_key} className="size-4 text-brand-600" />
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      {/* Why */}
      <section aria-labelledby="why-heading" className="py-20">
        <Container>
          <SectionHeading id="why-heading" eyebrow={`Why ${name}`} title="Built to be fast, clear and private" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-gold-300">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="hero-bg relative isolate overflow-hidden py-20 text-white">
        <div className="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-300">How it works</p>
            <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Three steps, no sign-up
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <span aria-hidden="true" className="font-display text-5xl font-semibold text-gold-400/70">
                  {i + 1}
                </span>
                <h3 className="mt-3 flex items-center gap-2 text-lg font-semibold">
                  <Icon aria-hidden="true" className="size-5 text-gold-300" />
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-100">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Articles */}
      {posts.length > 0 && (
        <section aria-labelledby="articles-heading" className="py-20">
          <Container>
            <SectionHeading id="articles-heading" eyebrow="Guides" title="Latest articles" description="Plain-language explainers to go with the tools." href="/blog/" hrefLabel="All articles" />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.post_id} post={p} categoryName={getBlogCategory(p.category_id)?.name} minutes={getPostReadingMinutes(p.post_id)} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="border-y border-brand-100 bg-white py-20">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-600">
              <CircleHelp aria-hidden="true" className="size-4" />
              Questions
            </p>
            <h2 id="faq-heading" className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-lg text-slate-700">Short answers about how the tools work and what happens to your data.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-brand-100 bg-cream p-5 open:bg-white open:shadow-soft">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink">
                  {f.q}
                  <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJson }} />
      </section>

      {/* Final call to action */}
      <section aria-labelledby="cta-heading" className="py-20">
        <Container>
          <div className="hero-bg relative isolate overflow-hidden rounded-3xl px-6 py-14 text-center text-white shadow-lift sm:px-12">
            <div className="hero-grid absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
            <h2 id="cta-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to get something done?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-brand-100">Pick a tool and have your answer in seconds. It is free, and your data stays with you.</p>
            <Link href="/tools/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 font-semibold text-brand-950 shadow-lift transition hover:bg-gold-300">
              Browse all tools
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
