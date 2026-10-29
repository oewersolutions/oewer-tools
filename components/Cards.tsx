import Link from "next/link";
import type { Post, Tool, ToolCategory } from "../lib/content";
import { formatDate } from "../lib/format";
import { postUrl, toolUrl } from "../lib/search";

const CARD = "block rounded-lg border border-slate-200 p-4 transition hover:border-brand-400 hover:shadow-sm";

export function ToolCard({ tool, category }: { tool: Tool; category: ToolCategory }) {
  return (
    <Link href={toolUrl(category.slug, tool.slug)} className={CARD}>
      <h3 className="font-semibold text-brand">{tool.name}</h3>
      <p className="mt-1 text-sm text-slate-700">{tool.description}</p>
    </Link>
  );
}

export function CategoryCard({ category, toolCount }: { category: ToolCategory; toolCount: number }) {
  return (
    <Link href={`/tools/${category.slug}/`} className={CARD}>
      <h3 className="font-semibold text-brand">{category.name}</h3>
      <p className="mt-1 text-sm text-slate-700">{category.description}</p>
      <p className="mt-2 text-xs text-slate-600">{toolCount === 1 ? "1 tool" : `${toolCount} tools`}</p>
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={postUrl(post.slug)} className={CARD}>
      <h3 className="font-semibold text-brand">{post.title}</h3>
      <p className="mt-1 text-sm text-slate-700">{post.excerpt}</p>
      <p className="mt-2 text-xs text-slate-600">{formatDate(post.published_at)}</p>
    </Link>
  );
}
