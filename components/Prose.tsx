import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { parseInline, parseMarkdown } from "../lib/markdown";
import type { PostBlock } from "../lib/content";
import { buildOutline } from "../lib/posts";

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
                className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700"
              >
                {part.text}
              </Link>
            ) : (
              <a
                key={i}
                href={part.href}
                rel="noopener noreferrer"
                className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700"
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

const PROSE = "max-w-prose space-y-5 text-[1.0625rem] leading-8 text-slate-800";
const H2 =
  "mt-10 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl";
const H3 = "mt-8 font-display text-xl font-semibold text-ink";
const UL = "list-disc space-y-2 pl-6 marker:text-brand-400";

/** Renders restricted-Markdown text (static pages). */
export function Prose({ source }: { source: string }) {
  return (
    <div className={PROSE}>
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "heading") {
          return block.level === 1 ? (
            <h2 key={i} className={H2}>
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
    case "image":
      return (
        // Plain <img>: static export has no image optimizer.
        <img
          key={block.block_id}
          src={`${BASE_PATH}${block.asset_path}`}
          alt={block.content}
          loading="lazy"
          decoding="async"
          className="h-auto max-w-full rounded-2xl"
        />
      );
    case "quote":
      return (
        <blockquote
          key={block.block_id}
          className="border-l-4 border-gold-400 pl-5 font-display text-xl italic leading-relaxed text-ink"
        >
          <Inline text={block.content} />
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={block.block_id}
          className="overflow-x-auto rounded-xl bg-brand-950 p-5 text-sm text-brand-50"
        >
          <code>{block.content}</code>
        </pre>
      );
    case "callout":
      return (
        <aside
          key={block.block_id}
          className="rounded-2xl border border-brand-200 bg-brand-50 p-5"
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
