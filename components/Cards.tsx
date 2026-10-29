import Link from "next/link";
import type { Post, Tool, ToolCategory } from "../lib/content";
import { formatDate } from "../lib/format";
import { postUrl, toolUrl } from "../lib/search";
import { ArrowRight, CategoryIcon, ToolIcon } from "./icons";

const CARD =
  "group relative flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift";

const ICON_CHIP = "flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand group-hover:text-gold-300";

export function ToolCard({ tool, category }: { tool: Tool; category: ToolCategory }) {
  return (
    <Link href={toolUrl(category.slug, tool.slug)} className={CARD}>
      <span className={ICON_CHIP}>
        <ToolIcon componentKey={tool.component_key} className="size-6" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{tool.description}</p>
      <p className="mt-5 flex items-center justify-between text-sm">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{category.name}</span>
        <span className="inline-flex items-center gap-1 font-medium text-brand-700">
          Open
          <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
        </span>
      </p>
    </Link>
  );
}

export function CategoryCard({ category, toolCount }: { category: ToolCategory; toolCount: number }) {
  return (
    <Link href={`/tools/${category.slug}/`} className={CARD}>
      <span className={ICON_CHIP}>
        <CategoryIcon slug={category.slug} className="size-6" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">{category.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{category.description}</p>
      <p className="mt-5 flex items-center justify-between text-sm">
        <span className="text-slate-600">{toolCount === 1 ? "1 tool" : `${toolCount} tools`}</span>
        <ArrowRight aria-hidden="true" className="size-4 text-brand-700 transition group-hover:translate-x-1" />
      </p>
    </Link>
  );
}

export function PostCard({ post, categoryName, minutes }: { post: Post; categoryName?: string; minutes?: number }) {
  return (
    <Link href={postUrl(post.slug)} className={CARD}>
      <p className="flex items-center gap-2 text-xs">
        {categoryName && <span className="rounded-full bg-gold-300/40 px-2.5 py-0.5 font-medium text-gold-700">{categoryName}</span>}
        <span className="text-slate-600">{formatDate(post.published_at)}</span>
      </p>
      <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-ink">{post.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{post.excerpt}</p>
      <p className="mt-5 flex items-center justify-between text-sm">
        <span className="text-slate-600">{minutes ? `${minutes} min read` : ""}</span>
        <span className="inline-flex items-center gap-1 font-medium text-brand-700">
          Read
          <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
        </span>
      </p>
    </Link>
  );
}
