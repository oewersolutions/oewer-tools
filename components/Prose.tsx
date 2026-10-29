import Link from "next/link";
import { Fragment } from "react";
import { parseInline, parseMarkdown } from "../lib/markdown";
import type { PostBlock } from "../lib/content";

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
              <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">
                {part.text}
              </code>
            );
          case "link":
            return part.href.startsWith("/") ? (
              <Link key={i} href={part.href} className="text-brand-700 underline">
                {part.text}
              </Link>
            ) : (
              <a key={i} href={part.href} rel="noopener noreferrer" className="text-brand-700 underline">
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

const PROSE = "max-w-prose space-y-4 text-base leading-7 text-slate-800";

/** Renders restricted-Markdown text (static pages). */
export function Prose({ source }: { source: string }) {
  return (
    <div className={PROSE}>
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "heading") {
          return block.level === 1 ? (
            <h2 key={i} className="mt-8 text-2xl font-bold text-brand">
              <Inline text={block.text} />
            </h2>
          ) : (
            <h3 key={i} className="mt-6 text-xl font-semibold text-brand">
              <Inline text={block.text} />
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
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

/** Renders a blog article from its ordered post_blocks. */
export function PostBody({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className={PROSE}>
      {blocks.map((block) => {
        switch (block.block_type) {
          case "heading":
            return (
              <h2 key={block.block_id} className="mt-8 text-2xl font-bold text-brand">
                {block.content}
              </h2>
            );
          case "list":
            return (
              <ul key={block.block_id} className="list-disc space-y-1 pl-6">
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
              <img key={block.block_id} src={`${BASE_PATH}${block.asset_path}`} alt={block.content} className="h-auto max-w-full rounded" />
            );
          case "quote":
            return (
              <blockquote key={block.block_id} className="border-l-4 border-brand-300 pl-4 italic">
                <Inline text={block.content} />
              </blockquote>
            );
          case "code":
            return (
              <pre key={block.block_id} className="overflow-x-auto rounded bg-slate-900 p-4 text-sm text-slate-50">
                <code>{block.content}</code>
              </pre>
            );
          case "callout":
            return (
              <aside key={block.block_id} className="rounded border border-brand-200 bg-brand-50 p-4">
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
      })}
    </div>
  );
}
