"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { checkWord, isPangram, MIN_WORD, rankFor, RANKS, shareText, totalPoints } from "../../lib/games/hive-words";
import { shuffled } from "../../lib/games/four-groups";
import { pickPuzzle, puzzleNumber } from "../../lib/games/puzzles";
import type { HiveWordsData, Puzzle } from "../../lib/games/types";
import { BASE_PATH, read, today, write } from "./shared";

const HEX = "[clip-path:polygon(25%_4%,75%_4%,100%_50%,75%_96%,25%_96%,0_50%)]";

/** Make words of four letters or more from seven letters, always using the centre one. */
export default function HiveWords({ name, slug, puzzles }: { name: string; slug: string; puzzles: Puzzle<HiveWordsData>[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [outer, setOuter] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setDay(today()), []);
  const available = useMemo(() => (day ? puzzles.filter((p) => p.date <= day) : puzzles), [puzzles, day]);
  const puzzle = day ? (available.find((p) => p.date === chosen) ?? pickPuzzle(puzzles, day)) : undefined;
  const key = `oewer-game-${slug}-${puzzle?.date}`;

  useEffect(() => {
    if (!puzzle) return;
    setFound(read<string[]>(key, []));
    setTyped("");
    setMessage("");
    setOuter(puzzle.data.outer);
  }, [key, puzzle]);

  const submit = useCallback(() => {
    if (!puzzle) return;
    const result = checkWord(puzzle.data, typed, found);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    const next = [...found, result.word];
    setFound(next);
    setTyped("");
    write(key, next);
    setMessage(result.pangram ? `Pangram! +${result.points} points.` : `+${result.points} ${result.points === 1 ? "point" : "points"}.`);
  }, [puzzle, typed, found, key]);

  const press = useCallback(
    (k: string) => {
      if (!puzzle) return;
      if (k === "ENTER") return submit();
      if (k === "BACKSPACE") return setTyped((t) => t.slice(0, -1));
      if (!/^[A-Z]$/.test(k)) return;
      if (![puzzle.data.center, ...puzzle.data.outer].includes(k)) return setMessage("That letter is not in the hive.");
      setMessage("");
      setTyped((t) => (t.length < 19 ? t + k : t));
    },
    [puzzle, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "SELECT" || t.tagName === "BUTTON" || t.tagName === "A") return;
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key === "Backspace" ? "BACKSPACE" : e.key === "Enter" ? "ENTER" : "";
      if (k) press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  if (!puzzle) return <div className="min-h-[34rem]" aria-busy="true">{day ? <p className="text-muted">No puzzle is ready yet. Please come back soon.</p> : null}</div>;

  const data = puzzle.data;
  const max = totalPoints(data, data.words);
  const score = totalPoints(data, found);
  const rank = rankFor(score, max);
  const next = RANKS[rank.index + 1];
  const number = puzzleNumber(puzzles, puzzle.date);
  const sorted = [...found].sort();
  const ring = outer.length === 6 ? outer : data.outer; // the shuffled order, or the puzzle's own before it is set

  const letter = (l: string, center = false) => (
    <button
      key={l}
      type="button"
      onClick={() => press(l)}
      aria-label={center ? `${l}, centre letter` : l}
      className={`flex size-[5.25rem] items-center justify-center text-2xl font-bold sm:size-24 ${HEX} ${center ? "bg-gold-400 text-ink" : "bg-tint text-ink hover:bg-brand-100"}`}
    >
      {l}
    </button>
  );

  async function share() {
    const text = `${shareText(name, number, data, found)}\n${window.location.origin}${BASE_PATH}/games/${slug}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copying is blocked in this browser.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md" data-game="hive_words">
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

      <div className="panel mt-4 p-4">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm text-ink-2">
          <span>
            Rank: <strong className="text-base text-ink">{rank.name}</strong>
          </span>
          <span>
            <strong className="text-base text-ink">{score}</strong> of {max} points
          </span>
        </p>
        <div aria-hidden="true" className="mt-3 flex gap-1">
          {RANKS.map((r, i) => (
            <span key={r.name} className={`h-1.5 flex-1 rounded-full ${i <= rank.index ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
        {next && <p className="mt-2 text-xs text-muted">Next rank: {next.name} at {Math.ceil(max * next.from)} points.</p>}
      </div>

      <p className="mt-5 flex min-h-[3rem] items-center justify-center text-3xl font-bold tracking-widest text-ink">
        <span className="sr-only">Your word: </span>
        {typed || <span className="text-line">&nbsp;</span>}
        <span aria-hidden="true" className="ml-0.5 inline-block h-8 w-px animate-pulse bg-brand" />
      </p>
      <p role="status" aria-live="polite" className="min-h-[1.5rem] text-center text-sm font-medium text-ink">
        {message}
      </p>

      <div className="mt-2 flex flex-col items-center gap-1" role="group" aria-label="Letters">
        <div className="flex gap-1">{ring.slice(0, 2).map((l) => letter(l))}</div>
        <div className="flex gap-1">
          {letter(ring[2]!)}
          {letter(data.center, true)}
          {letter(ring[3]!)}
        </div>
        <div className="flex gap-1">{ring.slice(4, 6).map((l) => letter(l))}</div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={() => press("BACKSPACE")} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
          Delete
        </button>
        <button type="button" onClick={() => setOuter((o) => shuffled(o))} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
          Shuffle
        </button>
        <button type="button" onClick={() => press("ENTER")} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Enter
        </button>
      </div>

      <section aria-labelledby="found-heading" className="mt-8">
        <h3 id="found-heading" className="t-subheading text-ink">
          Words found: {found.length} of {data.words.length}
        </h3>
        {sorted.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink">
            {sorted.map((w) => (
              <li key={w} className={isPangram(data, w) ? "font-bold text-brand" : ""}>
                {w.charAt(0) + w.slice(1).toLowerCase()}
                {isPangram(data, w) && " (pangram)"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Your words appear here. Words need {MIN_WORD} letters or more and must use the centre letter.</p>
        )}
        {found.length > 0 && (
          <button type="button" onClick={share} className="mt-5 rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
            {copied ? "Copied" : "Copy my result"}
          </button>
        )}
      </section>
    </div>
  );
}
