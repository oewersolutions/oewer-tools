"use client";

import { useMemo, useState } from "react";
import { analyzeText, formatDuration, READING_WPM, SPEAKING_WPM } from "../../lib/tools/text";
import { useReportResult } from "./ToolEvents";
import { TextAreaField } from "./ui";

export default function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(() => analyzeText(text), [text]);
  useReportResult(text.trim() !== "");
  const items: [string, string][] = [
    ["Words", stats.words.toLocaleString("en-IN")],
    ["Characters", stats.characters.toLocaleString("en-IN")],
    ["Characters (no spaces)", stats.charactersNoSpaces.toLocaleString("en-IN")],
    ["Sentences", stats.sentences.toLocaleString("en-IN")],
    ["Paragraphs", stats.paragraphs.toLocaleString("en-IN")],
    ["Lines", stats.lines.toLocaleString("en-IN")],
    ["Reading time", formatDuration(stats.words, READING_WPM)],
    ["Speaking time", formatDuration(stats.words, SPEAKING_WPM)],
  ];

  return (
    <div className="space-y-4">
      <TextAreaField label="Type or paste your text" value={text} onChange={setText} rows={12} placeholder="Start typing…" describedBy="word-stats" />
      <div className="flex justify-end">
        <button type="button" disabled={text === ""} onClick={() => setText("")} className="rounded-lg border border-brand px-3.5 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-50 disabled:opacity-50">
          Clear text
        </button>
      </div>
      <div id="word-stats" role="status" className="rounded-lg bg-brand-50 p-5">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-700">{label}</dt>
              <dd className="text-2xl font-bold text-brand">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-sm text-slate-600">
        Reading time assumes {READING_WPM} words per minute and speaking time {SPEAKING_WPM}. Your text stays in this page and is never sent anywhere.
      </p>
    </div>
  );
}
