"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pickPuzzle, prevDay, puzzleNumber } from "../../lib/games/puzzles";
import type { Puzzle, WordTrailData } from "../../lib/games/types";
import { EMPTY_STREAK, recordResult, type Streak } from "../../lib/games/word-guess";
import { adjacent, CELLS, COLS, colOf, judge, ROWS, rowOf, shareText } from "../../lib/games/word-trail";
import { BASE_PATH, read, today, write } from "./shared";

interface Saved {
  found: number[];
  hints: number;
}

/** Find the words hidden in a grid of letters. Every letter belongs to exactly one word, and one word crosses the whole grid. */
export default function WordTrail({ name, slug, puzzles }: { name: string; slug: string; puzzles: Puzzle<WordTrailData>[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [found, setFound] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [focus, setFocus] = useState(0);
  const [message, setMessage] = useState("");
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [copied, setCopied] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  useEffect(() => setDay(today()), []);
  const available = useMemo(() => (day ? puzzles.filter((p) => p.date <= day) : puzzles), [puzzles, day]);
  const puzzle = day ? (available.find((p) => p.date === chosen) ?? pickPuzzle(puzzles, day)) : undefined;
  const key = `oewer-game-${slug}-${puzzle?.date}`;

  useEffect(() => {
    if (!puzzle) return;
    const saved = read<Saved>(key, { found: [], hints: 0 });
    setFound(saved.found);
    setHints(saved.hints);
    setHint(null);
    setPath([]);
    setMessage("");
    setFocus(0);
    setStreak(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK));
  }, [key, puzzle, slug]);

  useEffect(() => {
    if (refocus.current) gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${focus}"]`)?.focus();
  }, [focus]);

  if (!puzzle) return <div className="min-h-[34rem]" aria-busy="true">{day ? <p className="text-muted">No puzzle is ready yet. Please come back soon.</p> : null}</div>;

  const data = puzzle.data;
  const solved = found.length === data.words.length;
  const owner = new Map<number, number>(); // square -> word index, for found words
  for (const i of found) for (const c of data.words[i]!.cells) owner.set(c, i);
  const hinted = new Set(hint !== null && !found.includes(hint) ? data.words[hint]!.cells : []);
  const letter = (c: number) => data.grid[rowOf(c)]![colOf(c)]!;
  const typed = path.map(letter).join("");
  const number = puzzleNumber(puzzles, puzzle.date);

  function persist(nextFound: number[], nextHints: number) {
    write(key, { found: nextFound, hints: nextHints } satisfies Saved);
  }

  function submit() {
    if (path.length < 4) return setMessage("Words need four letters or more.");
    const verdict = judge(data, path);
    if (verdict.kind === "found" && !found.includes(verdict.index)) {
      const next = [...found, verdict.index];
      setFound(next);
      setPath([]);
      persist(next, hints);
      if (hint === verdict.index) setHint(null);
      const w = data.words[verdict.index]!;
      if (next.length === data.words.length) {
        const updated = recordResult(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK), puzzle!.date, true, prevDay(puzzle!.date));
        write(`oewer-game-${slug}-streak`, updated);
        setStreak(updated);
        setMessage(`${w.word}${w.key ? ", the key word" : ""}. That is every word. Well done!`);
      } else setMessage(w.key ? `${w.word}: you found the key word that crosses the grid!` : `${w.word}: found.`);
    } else if (verdict.kind === "elsewhere") {
      setPath([]);
      setMessage("That word is in this puzzle, but it is hidden in different letters. Look again.");
    } else {
      setPath([]);
      setMessage("Not one of today's words.");
    }
  }

  function tap(c: number) {
    if (solved || owner.has(c)) return;
    setMessage("");
    if (path.length === 0) return setPath([c]);
    const last = path[path.length - 1]!;
    if (c === last) return submit();
    const at = path.indexOf(c);
    if (at >= 0) return setPath(path.slice(0, at + 1));
    if (adjacent(last, c)) return setPath([...path, c]);
    setPath([c]);
  }

  function useHint() {
    if (solved) return;
    const open = data.words.map((w, i) => ({ w, i })).filter(({ i }) => !found.includes(i));
    const target = (open.find(({ w }) => !w.key) ?? open[0])!;
    setHint(target.i);
    setHints(hints + 1);
    persist(found, hints + 1);
    setPath([]);
    setMessage("Hint: the letters of one of the words are outlined.");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    const step = moves[e.key];
    if (step === undefined) return;
    e.preventDefault();
    refocus.current = true;
    const horizontal = Math.abs(step) === 1;
    const next = focus + step;
    if (next < 0 || next >= CELLS || (horizontal && rowOf(next) !== rowOf(focus))) return;
    setFocus(next);
  }

  async function share() {
    const text = `${shareText(name, number, data, found, hints)}\n${window.location.origin}${BASE_PATH}/games/${slug}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copying is blocked in this browser.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md" data-game="word_trail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-meta">
          No. {number} · {puzzle.date}
        </p>
        {available.length > 1 && (
          <label className="text-sm text-ink-2">
            <span className="sr-only">Choose a puzzle</span>
            <select value={puzzle.date} onChange={(e) => setChosen(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
              {[...available].reverse().map((p) => (
                <option key={p.date} value={p.date}>
                  {p.date === day ? `Today (${p.date})` : p.date}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="panel mt-4 p-4 text-center">
        <p className="t-meta">Today&rsquo;s theme</p>
        <p className="t-subheading mt-1 text-ink">{data.theme}</p>
        <p className="mt-1 text-sm text-ink-2">
          {found.length} of {data.words.length} words found
        </p>
      </div>

      <p className="mt-3 flex min-h-[2rem] items-center justify-center text-2xl font-bold tracking-widest text-ink">
        <span className="sr-only">Your word: </span>
        {typed || <span className="text-line">&nbsp;</span>}
      </p>
      <p role="status" aria-live="polite" className="min-h-[2.5rem] text-center text-sm font-medium text-ink">
        {message}
      </p>

      <div
        ref={gridRef}
        role="grid"
        aria-label="Letter grid"
        onKeyDown={onKeyDown}
        onFocus={() => (refocus.current = true)}
        onBlur={(e) => {
          if (!gridRef.current?.contains(e.relatedTarget as Node)) refocus.current = false;
        }}
        className="mx-auto grid w-full max-w-[19rem] gap-1.5"
      >
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} role="row" className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: COLS }, (_, c) => {
              const i = r * COLS + c;
              const word = owner.get(i);
              const selected = path.indexOf(i);
              const isKey = word !== undefined && data.words[word]!.key;
              const label = `${letter(i)}, row ${r + 1}, column ${c + 1}${word !== undefined ? `, part of ${data.words[word]!.word}` : ""}${selected >= 0 ? `, selected, number ${selected + 1}` : ""}${hinted.has(i) ? ", hint" : ""}`;
              const tone = word !== undefined ? (isKey ? "bg-gold-300 text-ink" : "bg-brand-200 text-ink") : selected >= 0 ? "bg-brand text-white" : "bg-tint text-ink hover:bg-brand-100";
              return (
                <div key={i} role="gridcell">
                  <button
                    type="button"
                    data-cell={i}
                    tabIndex={focus === i ? 0 : -1}
                    aria-label={label}
                    aria-pressed={selected >= 0}
                    onFocus={() => setFocus(i)}
                    onClick={() => {
                      refocus.current = true;
                      setFocus(i);
                      tap(i);
                    }}
                    className={`flex aspect-square w-full items-center justify-center rounded-full text-lg font-bold ${tone} ${hinted.has(i) ? "ring-2 ring-dashed ring-offset-2 ring-brand" : ""}`}
                  >
                    <span aria-hidden="true">{letter(i)}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!solved ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => setPath([])} disabled={path.length === 0} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50 disabled:opacity-50">
            Clear
          </button>
          <button type="button" onClick={useHint} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
            Hint{hints > 0 ? ` (${hints} used)` : ""}
          </button>
          <button type="button" onClick={submit} disabled={path.length < 4} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            Submit
          </button>
        </div>
      ) : (
        <div className="panel mt-5 space-y-3 p-5 text-center">
          <p className="t-subheading text-ink">Solved{hints === 0 ? " with no hints" : ` with ${hints} ${hints === 1 ? "hint" : "hints"}`}</p>
          <dl className="grid grid-cols-4 gap-2 text-sm">
            {[
              ["Played", streak.played],
              ["Won", streak.won],
              ["Streak", streak.current],
              ["Best", streak.best],
            ].map(([k, v]) => (
              <div key={k}>
                <dd className="text-xl font-semibold text-ink">{v}</dd>
                <dt className="text-muted">{k}</dt>
              </div>
            ))}
          </dl>
          <button type="button" onClick={share} className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
            {copied ? "Copied" : "Copy my result"}
          </button>
        </div>
      )}

      {found.length > 0 && (
        <section aria-labelledby="trail-found" className="mt-6">
          <h3 id="trail-found" className="t-subheading text-ink">
            Words found
          </h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink">
            {found.map((i) => (
              <li key={i} className={data.words[i]!.key ? "font-bold" : ""}>
                {data.words[i]!.word.charAt(0) + data.words[i]!.word.slice(1).toLowerCase()}
                {data.words[i]!.key && " (key word)"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
