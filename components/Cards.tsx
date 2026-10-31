import Link from "next/link";
import type { Post, Tool, ToolCategory } from "../lib/content";
import { formatDate } from "../lib/format";
import { postUrl, toolUrl } from "../lib/search";
import { getCoverInfo } from "../lib/content";
import { toolExample } from "../lib/tool-examples";
import ArticleImage from "./ArticleImage";
import Cover from "./Cover";
import { ArrowRight, CategoryIcon, ToolIcon } from "./icons";

const ICON_CHIP =
  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white";

/** A tool: a thin outline, the category, the name and, leading the bottom of the card, a real example result. */
export function ToolCard({
  tool,
  category,
  heading: Heading = "h3",
}: {
  tool: Tool;
  category: ToolCategory;
  heading?: "h2" | "h3";
}) {
  const example = toolExample(tool.component_key);
  return (
    <Link prefetch={false}
      href={toolUrl(category.slug, tool.slug)}
      className="card card-link group flex h-full flex-col p-6"
    >
      <span className="flex items-start justify-between gap-3">
        <span className={ICON_CHIP}>
          <ToolIcon componentKey={tool.component_key} className="size-5" />
        </span>
        <span className="pill">{category.name}</span>
      </span>
      <Heading className="t-subheading mt-5 text-ink">{tool.name}</Heading>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {tool.description}
      </p>
      <span className="mt-auto block pt-6">
        {example ? (
          <>
            <span className="t-meta block">{example.note}</span>
            <span className="mt-0.5 block whitespace-nowrap text-2xl font-semibold tracking-tight text-ink">
              {example.value}
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-brand">
            Open
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        )}
      </span>
    </Link>
  );
}

export function CategoryCard({
  category,
  toolCount,
}: {
  category: ToolCategory;
  toolCount: number;
}) {
  return (
    <Link prefetch={false}
      href={`/tools/${category.slug}/`}
      className="card card-link group flex h-full flex-col p-6"
    >
      <span className={ICON_CHIP}>
        <CategoryIcon slug={category.slug} className="size-5" />
      </span>
      <h3 className="t-subheading mt-5 text-ink">{category.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
        {category.description}
      </p>
      <p className="mt-5 flex items-center justify-between text-sm">
        <span className="text-muted">
          {toolCount === 1 ? "1 tool" : `${toolCount} tools`}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-brand transition-transform group-hover:translate-x-1"
        />
      </p>
    </Link>
  );
}

/** An article: the cover first, then the date and reading time, the title and a two-line summary. */
/** `priority` is for the first card of a list that starts near the top of the page: its picture loads at once, not lazily. */
export function PostCard({
  post,
  categoryName,
  minutes,
  heading: Heading = "h3",
  priority = false,
}: {
  post: Post;
  categoryName?: string;
  minutes?: number;
  heading?: "h2" | "h3";
  priority?: boolean;
}) {
  return (
    <Link prefetch={false}
      href={postUrl(post.slug)}
      className="card card-link group flex h-full flex-col overflow-hidden"
    >
      {post.cover_image ? (
        <ArticleImage
          src={post.cover_image}
          alt=""
          info={getCoverInfo(post)}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          priority={priority} className="aspect-[16/10] w-full object-cover"
        />
      ) : (
        <Cover
          seed={post.slug}
          number={Number(post.post_id.replace(/\D/g, "")) || undefined}
          className="aspect-[16/10]"
        />
      )}
      <div className="flex flex-1 flex-col p-5 pb-6">
        <p className="t-meta flex flex-wrap items-center gap-x-2.5">
          {categoryName && (
            <span className="font-medium text-brand">{categoryName}</span>
          )}
          {categoryName && <span aria-hidden="true">·</span>}
          <span>{formatDate(post.published_at)}</span>
          {minutes ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{minutes} min read</span>
            </>
          ) : null}
        </p>
        <Heading className="t-subheading mt-2.5 text-ink">{post.title}</Heading>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {post.excerpt}
        </p>
      </div>
    </Link>
  );
}
