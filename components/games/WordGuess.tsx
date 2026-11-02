"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { prevDay, pickPuzzle, puzzleNumber } from "../../lib/games/puzzles";
import type { Puzzle, WordGuessData } from "../../lib/games/types";
import { EMPTY_STREAK, keyStates, MAX_GUESSES, outcome, recordResult, scoreGuess, shareText, type LetterState, type Streak } from "../../lib/games/word-guess";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

// A mark as well as a colour, so the result never depends on telling colours apart.
const TILE: Record<LetterState | "empty" | "typing", string> = {
  correct: "border-brand bg-brand text-white",
  present: "border-gold-500 bg-gold-300 text-ink",
  absent: "border-[#52525b] bg-[#52525b] text-white",
  empty: "border-line bg-white text-ink",
  typing: "border-ink-2 bg-white text-ink",
};
const MARK: Record<LetterState, string> = { correct: "✓", present: "•", absent: "" };
const WORD: Record<LetterState, string> = { correct: "in the right place", present: "in the word, in another place", absent: "not in the word" };

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback; // storage blocked: the game still works, it just does not remember
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // not remembered
  }
};

/** The five-letter guessing game. Everything happens in the page: the word list is fetched from this site once. */
export default function WordGuess({ name, slug, puzzles }: { name: string; slug: string; puzzles: Puzzle<WordGuessData>[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [words, setWords] = useState<Set<string> | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [copied, setCopied] = useState(false);

  useEffect(() => setDay(today()), []);
  useEffect(() => {
    let live = true;
    fetch(`${BASE_PATH}/games/words-5.txt`)
      .then((r) => r.text())
      .then((t) => live && setWords(new Set(t.split("\n").filter(Boolean))))
      .catch(() => live && setMessage("The word list could not be loaded. Check your connection and reload."));
    return () => {
      live = false;
    };
  }, []);

  const available = useMemo(() => (day ? puzzles.filter((p) => p.date <= day) : puzzles), [puzzles, day]);
  const puzzle = day ? (available.find((p) => p.date === chosen) ?? pickPuzzle(puzzles, day)) : undefined;
  const answer = puzzle?.data.answer ?? "";
  const key = `oewer-game-${slug}-${puzzle?.date}`;
  const state = outcome(guesses, answer);

  useEffect(() => {
    if (!puzzle) return;
    setGuesses(read<string[]>(key, []));
    setCurrent("");
    setMessage("");
    setStreak(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK));
  }, [key, puzzle, slug]);

  const submit = useCallback(() => {
    if (!puzzle || state !== "playing") return;
    if (current.length < 5) return setMessage("Not enough letters.");
    if (!words) return setMessage("The word list is still loading.");
    if (!words.has(current)) return setMessage(`${current} is not in the word list.`);
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    setMessage("");
    write(key, next);
    const result = outcome(next, answer);
    if (result !== "playing") {
      const updated = recordResult(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK), puzzle.date, result === "won", prevDay(puzzle.date));
      write(`oewer-game-${slug}-streak`, updated);
      setStreak(updated);
      setMessage(result === "won" ? "You got it." : `The word was ${answer}.`);
    }
  }, [puzzle, state, current, words, guesses, key, answer, slug]);

  const press = useCallback(
    (k: string) => {
      if (state !== "playing") return;
      setMessage("");
      if (k === "ENTER") submit();
      else if (k === "BACKSPACE") setCurrent((c) => c.slice(0, -1));
      else if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < 5 ? c + k : c));
    },
    [state, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "SELECT" || t.tagName === "BUTTON" || t.tagName === "A") return; // those keep their own keys
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key === "Backspace" ? "BACKSPACE" : e.key === "Enter" ? "ENTER" : "";
      if (k) press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  if (!puzzle) {
    return <div className="min-h-[34rem]" aria-busy="true">{day ? <p className="text-muted">No puzzle is ready yet. Please come back soon.</p> : null}</div>;
  }

  const keys = keyStates(guesses, answer);
  const number = puzzleNumber(puzzles, puzzle.date);
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    if (i < guesses.length) return { letters: guesses[i]!, states: scoreGuess(guesses[i]!, answer), kind: "done" as const };
    if (i === guesses.length && state === "playing") return { letters: current.padEnd(5, " "), states: [] as LetterState[], kind: "typing" as const };
    return { letters: "     ", states: [] as LetterState[], kind: "empty" as const };
  });

  async function share() {
    const text = `${shareText(name, number, guesses, answer)}\n${window.location.origin}${BASE_PATH}/games/${slug}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copying is blocked in this browser. Select the squares above and copy them by hand.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md" data-game="word_guess">
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

      <div role="grid" aria-label="Your guesses" className="mx-auto mt-4 grid w-full max-w-[20rem] gap-1.5">
        {rows.map((row, r) => (
          <div role="row" key={r} className="grid grid-cols-5 gap-1.5">
            {row.letters.split("").map((ch, c) => {
              const st = row.kind === "done" ? row.states[c]! : undefined;
              const cls = st ? TILE[st] : ch.trim() ? TILE.typing : TILE.empty;
              const label = st ? `${ch}, ${WORD[st]}` : ch.trim() ? `${ch}, typed` : "empty";
              return (
                <div key={c} role="gridcell" aria-label={label} data-state={st ?? "none"} className={`relative flex aspect-square items-center justify-center rounded-md border-2 text-2xl font-bold ${cls}`}>
                  <span aria-hidden="true">{ch.trim()}</span>
                  {st && MARK[st] && (
                    <span aria-hidden="true" className="absolute bottom-0.5 right-1 text-xs leading-none">
                      {MARK[st]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-center text-sm font-medium text-ink">
        {message}
      </p>

      {state === "playing" ? (
        <div className="mt-2 space-y-1.5" aria-label="Keyboard">
          {ROWS.map((row, i) => (
            <div key={row} className="flex justify-center gap-1">
              {i === 2 && (
                <button type="button" onClick={() => press("ENTER")} className="h-12 rounded-md bg-tint px-2.5 text-xs font-semibold text-ink">
                  Enter
                </button>
              )}
              {row.split("").map((k) => {
                const st = keys[k];
                const cls = st ? TILE[st] : "border-transparent bg-tint text-ink";
                return (
                  <button key={k} type="button" onClick={() => press(k)} aria-label={st ? `${k}, ${WORD[st]}` : k} className={`h-12 min-w-0 flex-1 rounded-md border text-sm font-semibold ${cls}`}>
                    {k}
                  </button>
                );
              })}
              {i === 2 && (
                <button type="button" onClick={() => press("BACKSPACE")} className="h-12 rounded-md bg-tint px-2.5 text-xs font-semibold text-ink">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel mt-4 space-y-3 p-5 text-center">
          <p className="t-subheading text-ink">{state === "won" ? `Solved in ${guesses.length} of ${MAX_GUESSES}` : "Better luck tomorrow"}</p>
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
