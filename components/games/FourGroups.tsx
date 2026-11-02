"use client";

import { useEffect, useMemo, useState } from "react";
import { checkGuess, isRepeat, LEVEL_NAME, MAX_MISTAKES, replay, shareText, shuffled, startingOrder } from "../../lib/games/four-groups";
import { pickPuzzle, prevDay, puzzleNumber } from "../../lib/games/puzzles";
import type { FourGroupsData, Puzzle } from "../../lib/games/types";
import { EMPTY_STREAK, recordResult, type Streak } from "../../lib/games/word-guess";
import { BASE_PATH, read, today, write } from "./shared";

// Each level has its own colour and its own name on the row, so the colour is never the only sign.
const ROW: Record<number, string> = { 1: "bg-[#f3df9a]", 2: "bg-[#b9e0c2]", 3: "bg-[#bcd3f2]", 4: "bg-[#d8c3ef]" };

/** Sort sixteen words into four groups of four. */
export default function FourGroups({ name, slug, puzzles }: { name: string; slug: string; puzzles: Puzzle<FourGroupsData>[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [copied, setCopied] = useState(false);

  useEffect(() => setDay(today()), []);
  const available = useMemo(() => (day ? puzzles.filter((p) => p.date <= day) : puzzles), [puzzles, day]);
  const puzzle = day ? (available.find((p) => p.date === chosen) ?? pickPuzzle(puzzles, day)) : undefined;
  const key = `oewer-game-${slug}-${puzzle?.date}`;

  useEffect(() => {
    if (!puzzle) return;
    const saved = read<string[][]>(key, []);
    setGuesses(saved);
    setPicked([]);
    setMessage("");
    setOrder(startingOrder(puzzle.data, puzzle.date));
    setStreak(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK));
  }, [key, puzzle, slug]);

  if (!puzzle) return <div className="min-h-[30rem]" aria-busy="true">{day ? <p className="text-muted">No puzzle is ready yet. Please come back soon.</p> : null}</div>;

  const data = puzzle.data;
  const r = replay(data, guesses);
  const over = r.state !== "playing";
  const number = puzzleNumber(puzzles, puzzle.date);
  // Found groups come first, in the order found; when the game is lost the rest are shown too, easiest first.
  const shownGroups = over ? [...r.solved, ...[0, 1, 2, 3].filter((g) => !r.solved.includes(g)).sort((a, b) => data.groups[a]!.level - data.groups[b]!.level)] : r.solved;
  const solvedWords = new Set(shownGroups.flatMap((g) => data.groups[g]!.words));
  const tiles = order.filter((w) => !solvedWords.has(w));

  function toggle(word: string) {
    if (over) return;
    setMessage("");
    setPicked((p) => (p.includes(word) ? p.filter((w) => w !== word) : p.length < 4 ? [...p, word] : p));
  }

  function submit() {
    if (picked.length !== 4 || over) return;
    if (isRepeat(guesses, picked)) return setMessage("You already tried that group.");
    const next = [...guesses, picked];
    const verdict = checkGuess(data, picked);
    setGuesses(next);
    setPicked([]);
    write(key, next);
    const after = replay(data, next);
    if (after.state !== "playing") {
      const updated = recordResult(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK), puzzle!.date, after.state === "won", prevDay(puzzle!.date));
      write(`oewer-game-${slug}-streak`, updated);
      setStreak(updated);
      setMessage(after.state === "won" ? "You found all four groups." : "Out of mistakes. The groups are shown below.");
    } else if (verdict.kind === "correct") setMessage(`Found: ${data.groups[verdict.group]!.title}.`);
    else setMessage(verdict.kind === "one_away" ? "One away." : "Not a group.");
  }

  async function share() {
    const text = `${shareText(name, number, data, guesses)}\n${window.location.origin}${BASE_PATH}/games/${slug}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copying is blocked in this browser. Select the squares and copy them by hand.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg" data-game="four_groups">
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

      <div className="mt-4 space-y-2">
        {shownGroups.map((g) => {
          const group = data.groups[g]!;
          const found = r.solved.includes(g);
          return (
            <div key={g} data-level={group.level} className={`rounded-lg px-3 py-3 text-center text-ink ${ROW[group.level]}`}>
              <p className="text-sm font-bold uppercase tracking-wide">{group.title}</p>
              <p className="mt-0.5 text-sm">{group.words.join(", ")}</p>
              <p className="mt-1 text-xs font-medium">
                {LEVEL_NAME[group.level]}
                {!found && " · not found"}
              </p>
            </div>
          );
        })}
        {tiles.length > 0 && (
          <div role="group" aria-label="Words" className="grid grid-cols-4 gap-2">
            {tiles.map((w) => {
              const on = picked.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(w)}
                  className={`flex h-[4.25rem] items-center justify-center rounded-lg border-2 px-1 text-[0.7rem] font-bold uppercase leading-tight [overflow-wrap:anywhere] sm:text-sm ${on ? "border-brand bg-brand text-white" : "border-transparent bg-tint text-ink hover:border-brand-300"}`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-center text-sm font-medium text-ink">
        {message}
      </p>

      {!over ? (
        <>
          <p className="mt-1 text-center text-sm text-ink-2">
            Mistakes left: <span className="font-semibold">{MAX_MISTAKES - r.mistakes}</span> of {MAX_MISTAKES}
            <span aria-hidden="true" className="ml-2 tracking-widest text-brand">
              {"●".repeat(MAX_MISTAKES - r.mistakes)}
              <span className="text-line">{"●".repeat(r.mistakes)}</span>
            </span>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={() => setOrder((o) => shuffled(o))} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
              Shuffle
            </button>
            <button type="button" onClick={() => setPicked([])} disabled={picked.length === 0} className="rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50 disabled:opacity-50">
              Deselect all
            </button>
            <button type="button" onClick={submit} disabled={picked.length !== 4} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              Submit
            </button>
          </div>
        </>
      ) : (
        <div className="panel mt-4 space-y-3 p-5 text-center">
          <p className="t-subheading text-ink">{r.state === "won" ? (r.mistakes === 0 ? "Perfect, no mistakes" : `Solved with ${r.mistakes} ${r.mistakes === 1 ? "mistake" : "mistakes"}`) : "Better luck tomorrow"}</p>
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
    </div>
  );
}
