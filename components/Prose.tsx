import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { parseInline, parseMarkdown } from "../lib/markdown";
import type { PostBlock } from "../lib/content";
import { buildOutline, headingId } from "../lib/posts";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        switch (part.type) {
          case "strong":
            return <strong key={i}>{part.text}</strong>;
          case "em":
            return <em key={i}>{part.text}</em>;
          case "code":
            return (
              <code
                key={i}
                className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[0.9em] text-brand-900"
              >
                {part.text}
              </code>
            );
          case "link":
            return part.href.startsWith("/") ? (
              <Link
                key={i}
                href={part.href}
                className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
              >
                {part.text}
              </Link>
            ) : (
              <a
                key={i}
                href={part.href}
                rel="noopener noreferrer"
                className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
              >
                {part.text}
              </a>
            );
          default:
            return <Fragment key={i}>{part.text}</Fragment>;
        }
      })}
    </>
  );
}

const PROSE =
  "max-w-prose space-y-5 text-[1.0625rem] leading-[1.85] text-ink-2";
const H2 = "t-heading mt-12 text-ink";
const H3 = "t-subheading mt-8 text-ink";
const UL = "list-disc space-y-2 pl-6 marker:text-brand";

/** Renders restricted-Markdown text (static pages). */
export function Prose({ source }: { source: string }) {
  const used = new Set<string>();
  return (
    <div className={PROSE}>
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "heading") {
          return block.level === 1 ? (
            <h2 key={i} id={headingId(block.text, used)} className={`${H2} scroll-mt-28`}>
              <Inline text={block.text} />
            </h2>
          ) : (
            <h3 key={i} className={H3}>
              <Inline text={block.text} />
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className={UL}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function renderBlock(block: PostBlock, ids: Map<string, string>) {
  switch (block.block_type) {
    case "heading":
      return (
        <h2
          key={block.block_id}
          id={ids.get(block.block_id)}
          className={`${H2} scroll-mt-24`}
        >
          {block.content}
        </h2>
      );
    case "list":
      return (
        <ul key={block.block_id} className={UL}>
          {block.content.split("\n").map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "image": {
      const info = block.image;
      const srcSet = info?.srcSet
        ? info.srcSet
            .split(", ")
            .map((entry) => `${BASE_PATH}${entry}`)
            .join(", ")
        : undefined;
      return (
        <figure key={block.block_id} className="!my-8">
          {/* A plain <img>: static export has no image optimizer. Width and height keep the space while it loads. */}
          <img
            src={`${BASE_PATH}${block.asset_path}`}
            srcSet={srcSet}
            sizes={srcSet ? "(min-width: 768px) 42rem, 100vw" : undefined}
            width={info?.width}
            height={info?.height}
            alt={block.content}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-2xl"
          />
          {block.caption && (
            <figcaption className="t-meta mt-3 text-center">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote
          key={block.block_id}
          className="border-l-2 border-brand pl-6 text-xl font-medium leading-relaxed tracking-tight text-ink"
        >
          <Inline text={block.content} />
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={block.block_id}
          className="overflow-x-auto rounded-2xl bg-ink p-5 text-sm text-white"
        >
          <code>{block.content}</code>
        </pre>
      );
    case "callout":
      return (
        <aside
          key={block.block_id}
          className="rounded-2xl bg-tint p-6 text-ink"
        >
          <Inline text={block.content} />
        </aside>
      );
    default:
      return (
        <p key={block.block_id}>
          <Inline text={block.content} />
        </p>
      );
  }
}

/**
 * Renders a blog article from its ordered post_blocks. `adAfter` puts something (an ad slot) after the block at that
 * position, never after the last block.
 */
export function PostBody({
  blocks,
  adAfter,
}: {
  blocks: PostBlock[];
  adAfter?: { index: number; node: ReactNode };
}) {
  const ids = new Map(buildOutline(blocks).map((h) => [h.blockId, h.id]));
  return (
    <div className={PROSE}>
      {blocks.map((block, index) => (
        <Fragment key={block.block_id}>
          {renderBlock(block, ids)}
          {adAfter && adAfter.index === index && index < blocks.length - 1
            ? adAfter.node
            : null}
        </Fragment>
      ))}
    </div>
  );
}
