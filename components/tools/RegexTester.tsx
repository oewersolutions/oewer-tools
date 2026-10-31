"use client";

import { Fragment, useEffect, useState } from "react";
import { MAX_TEXT, runRegexSafely, type RegexMatch, type RegexOutcome } from "../../lib/tools/regex";
import { useReportResult } from "./ToolEvents";
import { TextAreaField } from "./ui";

const FLAGS: { flag: string; label: string }[] = [
  { flag: "g", label: "g: find all matches" },
  { flag: "i", label: "i: ignore case" },
  { flag: "m", label: "m: ^ and $ per line" },
  { flag: "s", label: "s: dot matches newline" },
  { flag: "u", label: "u: Unicode" },
];
const field = "mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-base text-slate-900 shadow-sm transition focus:border-brand-500 aria-[invalid=true]:border-red-700";

type State = { kind: "idle" } | { kind: "running" } | { kind: "timeout" } | { kind: "done"; outcome: RegexOutcome };

/** The text split into plain pieces and matched pieces, for highlighting. Empty matches have nothing to colour. */
function segments(text: string, matches: RegexMatch[]): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const m of matches) {
    if (m.text === "" || m.index < at) continue;
    if (m.index > at) out.push({ text: text.slice(at, m.index), hit: false });
    out.push({ text: m.text, hit: true });
    at = m.index + m.text.length;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("(\\d{4})-(\\d{2})-(\\d{2})");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Invoices were dated 2026-03-14 and 2026-10-31.");
  const [state, setState] = useState<State>({ kind: "idle" });

  const tooLong = text.length > MAX_TEXT;
  useEffect(() => {
    if (pattern === "" || tooLong) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "running" });
    let job: ReturnType<typeof runRegexSafely> | undefined;
    // Wait a moment after typing, and run in a worker that is stopped if the pattern takes too long.
    const wait = setTimeout(() => {
      job = runRegexSafely({ pattern, flags, text });
      void job.promise.then((r) => setState(r === "timeout" ? { kind: "timeout" } : { kind: "done", outcome: r }));
    }, 250);
    return () => {
      clearTimeout(wait);
      job?.cancel();
    };
  }, [pattern, flags, text, tooLong]);

  const outcome = state.kind === "done" ? state.outcome : undefined;
  const matches = outcome?.ok ? outcome.matches : [];
  useReportResult(Boolean(outcome?.ok) && pattern !== "");
  const toggle = (flag: string) => setFlags((f) => (f.includes(flag) ? f.replace(flag, "") : f + flag));

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="re-pattern" className="block text-sm font-semibold text-slate-800">
          Regular expression
        </label>
        <input id="re-pattern" type="text" value={pattern} onChange={(e) => setPattern(e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={outcome && !outcome.ok ? true : undefined} aria-describedby="re-status" className={field} />
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Flags</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-800">
          {FLAGS.map(({ flag, label }) => (
            <label key={flag} className="flex items-center gap-2">
              <input type="checkbox" checked={flags.includes(flag)} onChange={() => toggle(flag)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <TextAreaField label="Text to test" value={text} onChange={setText} rows={8} mono />
      <div id="re-status" role="status" aria-live="polite" className="min-h-6 text-sm">
        {tooLong ? (
          <p className="text-red-800">The text is longer than {MAX_TEXT.toLocaleString("en-IN")} characters. Use a shorter sample.</p>
        ) : pattern === "" ? (
          <p className="text-muted">Type a regular expression to test it.</p>
        ) : state.kind === "timeout" ? (
          <p className="text-red-800">This expression took too long and was stopped. It may have nested repeats such as (a+)+ that make the browser try an enormous number of paths. Simplify it.</p>
        ) : outcome && !outcome.ok ? (
          <p className="text-red-800">Not a valid expression: {outcome.error}</p>
        ) : outcome?.ok ? (
          <p className="font-medium text-brand">
            {matches.length === 0 ? "No matches" : `${matches.length}${outcome.truncated ? "+" : ""} match${matches.length === 1 ? "" : "es"}`}
            {outcome.truncated && <span className="font-normal text-slate-700"> (showing the first 500)</span>}
          </p>
        ) : (
          <p className="text-muted">Working…</p>
        )}
      </div>
      {matches.length > 0 && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Matches in your text</h2>
            <p className="mt-1.5 whitespace-pre-wrap break-words rounded-xl border border-line bg-white p-3 font-mono text-sm text-ink">
              {segments(text, matches).map((s, i) => (
                <Fragment key={i}>{s.hit ? <mark className="rounded bg-gold-300/60 px-0.5 text-ink">{s.text}</mark> : s.text}</Fragment>
              ))}
            </p>
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Match details">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Each match with its position and groups</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1.5 pr-4 font-medium">#</th>
                  <th scope="col" className="py-1.5 pr-4 font-medium">Match</th>
                  <th scope="col" className="py-1.5 pr-4 font-medium">Position</th>
                  <th scope="col" className="py-1.5 font-medium">Groups</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-1.5 pr-4">{i + 1}</td>
                    <td className="py-1.5 pr-4 font-mono">{m.text === "" ? "(empty)" : m.text}</td>
                    <td className="py-1.5 pr-4">{m.index}</td>
                    <td className="py-1.5 font-mono">
                      {m.groups.length === 0
                        ? "none"
                        : m.groups.map((g, j) => `${j + 1}: ${g === undefined ? "(no match)" : g}`).join("   ")}
                      {Object.entries(m.named).map(([k, v]) => (
                        <span key={k} className="ml-3">{`${k}=${v ?? "(no match)"}`}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-sm text-slate-600">This uses your browser&rsquo;s JavaScript regular expressions. Your pattern and text stay in this page.</p>
    </div>
  );
}
