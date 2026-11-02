"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { entriesOf, entryAt, isSolved, shareText, SIZE, wrongSquares, type Direction, type Entry } from "../../lib/games/mini-crossword";
import { pickPuzzle, prevDay, puzzleNumber } from "../../lib/games/puzzles";
import type { MiniCrosswordData, Puzzle } from "../../lib/games/types";
import { EMPTY_STREAK, recordResult, type Streak } from "../../lib/games/word-guess";
import { BASE_PATH, read, today, write } from "./shared";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
interface Saved {
  letters: string[];
  checks: number;
}
const blank = (): string[] => Array(SIZE * SIZE).fill("");

/** A 5 by 5 crossword: type into the grid, use the clues, and check your letters. */
export default function MiniCrossword({ name, slug, puzzles }: { name: string; slug: string; puzzles: Puzzle<MiniCrosswordData>[] }) {
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [letters, setLetters] = useState<string[]>(blank);
  const [checks, setChecks] = useState(0);
  const [cursor, setCursor] = useState({ r: 0, c: 0 });
  const [direction, setDirection] = useState<Direction>("across");
  const [flagged, setFlagged] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [copied, setCopied] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  useEffect(() => setDay(today()), []);
  const available = useMemo(() => (day ? puzzles.filter((p) => p.date <= day) : puzzles), [puzzles, day]);
  const puzzle = day ? (available.find((p) => p.date === chosen) ?? pickPuzzle(puzzles, day)) : undefined;
  const key = `oewer-game-${slug}-${puzzle?.date}`;
  const entries = useMemo(() => (puzzle ? entriesOf(puzzle.data.grid) : []), [puzzle]);

  useEffect(() => {
    if (!puzzle) return;
    const saved = read<Saved>(key, { letters: blank(), checks: 0 });
    setLetters(saved.letters);
    setChecks(saved.checks);
    setFlagged([]);
    setMessage("");
    setStreak(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK));
    const first = entriesOf(puzzle.data.grid)[0];
    setCursor({ r: first?.row ?? 0, c: first?.col ?? 0 });
    setDirection(first?.direction ?? "across");
  }, [key, puzzle, slug]);

  // Keep the keyboard focus on the square the cursor moved to, but only when the player was already in the grid.
  useEffect(() => {
    if (!refocus.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-square="${cursor.r * SIZE + cursor.c}"]`)?.focus();
  }, [cursor]);

  const grid = puzzle?.data.grid ?? [];
  const solved = puzzle ? isSolved(grid, letters) : false;
  const isWhite = (r: number, c: number) => r >= 0 && c >= 0 && r < SIZE && c < SIZE && grid[r]?.[c] !== "#";
  const current: Entry | undefined = entryAt(entries, cursor.r, cursor.c, direction) ?? entryAt(entries, cursor.r, cursor.c, direction === "across" ? "down" : "across");

  const save = useCallback(
    (next: string[], nextChecks: number) => {
      write(key, { letters: next, checks: nextChecks } satisfies Saved);
    },
    [key],
  );

  const move = useCallback(
    (dr: number, dc: number) => {
      let { r, c } = cursor;
      do {
        r += dr;
        c += dc;
      } while (r >= 0 && c >= 0 && r < SIZE && c < SIZE && !isWhite(r, c));
      if (isWhite(r, c)) setCursor({ r, c });
    },
    [cursor, grid],
  );

  const typeLetter = useCallback(
    (k: string) => {
      if (!puzzle || solved) return;
      const idx = cursor.r * SIZE + cursor.c;
      const next = [...letters];
      next[idx] = k;
      setLetters(next);
      setFlagged([]);
      setMessage("");
      save(next, checks);
      if (isSolved(puzzle.data.grid, next)) {
        const updated = recordResult(read<Streak>(`oewer-game-${slug}-streak`, EMPTY_STREAK), puzzle.date, true, prevDay(puzzle.date));
        write(`oewer-game-${slug}-streak`, updated);
        setStreak(updated);
        setMessage("Solved!");
        return;
      }
      // on to the next square of the same word, if there is one
      const dr = direction === "down" ? 1 : 0;
      const dc = direction === "across" ? 1 : 0;
      if (isWhite(cursor.r + dr, cursor.c + dc) && entryAt(entries, cursor.r + dr, cursor.c + dc, direction)) setCursor({ r: cursor.r + dr, c: cursor.c + dc });
    },
    [puzzle, solved, cursor, letters, checks, direction, entries, save, slug],
  );

  const backspace = useCallback(() => {
    if (!puzzle || solved) return;
    const idx = cursor.r * SIZE + cursor.c;
    const next = [...letters];
    setFlagged([]);
    if (next[idx]) {
      next[idx] = "";
      setLetters(next);
      save(next, checks);
    } else {
      const dr = direction === "down" ? -1 : 0;
      const dc = direction === "across" ? -1 : 0;
      const pr = cursor.r + dr;
      const pc = cursor.c + dc;
      if (isWhite(pr, pc)) {
        next[pr * SIZE + pc] = "";
        setLetters(next);
        save(next, checks);
        setCursor({ r: pr, c: pc });
      }
    }
  }, [puzzle, solved, cursor, letters, checks, direction, save]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    refocus.current = true;
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      typeLetter(e.key.toUpperCase());
    } else if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setDirection("across");
      move(0, e.key === "ArrowRight" ? 1 : -1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setDirection("down");
      move(e.key === "ArrowDown" ? 1 : -1, 0);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    }
  }

  function goToEntry(e: Entry) {
    refocus.current = true;
    setDirection(e.direction);
    setCursor({ r: e.row, c: e.col });
    // move the keyboard focus into the grid even when the cursor did not change square
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-square="${e.row * SIZE + e.col}"]`)?.focus());
  }

  function stepClue(by: number) {
    if (!current) return;
    const i = entries.findIndex((e) => e.number === current.number && e.direction === current.direction);
    goToEntry(entries[(i + by + entries.length) % entries.length]!);
  }

  function check() {
    if (!puzzle || solved) return;
    const wrong = wrongSquares(puzzle.data.grid, letters);
    const filled = letters.filter(Boolean).length;
    if (filled === 0) return setMessage("Type some letters first.");
    const n = checks + 1;
    setChecks(n);
    save(letters, n);
    setFlagged(wrong);
    setMessage(wrong.length === 0 ? "Every letter so far is correct." : `${wrong.length} ${wrong.length === 1 ? "letter is" : "letters are"} wrong. They are marked with a cross.`);
  }

  async function share() {
    if (!puzzle) return;
    const text = `${shareText(name, puzzleNumber(puzzles, puzzle.date), checks)}\n${window.location.origin}${BASE_PATH}/games/${slug}/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copying is blocked in this browser.");
    }
  }

  if (!puzzle) return <div className="min-h-[34rem]" aria-busy="true">{day ? <p className="text-muted">No puzzle is ready yet. Please come back soon.</p> : null}</div>;

  const numbers = new Map(entries.map((e) => [`${e.row},${e.col}`, e.number]));
  const inCurrent = (r: number, c: number) => (current ? entryAt([current], r, c, current.direction) !== undefined : false);
  const clueFor = (e: Entry) => puzzle.data[e.direction][String(e.number)] ?? "";
  const number = puzzleNumber(puzzles, puzzle.date);

  const list = (dir: Direction) => (
    <section aria-labelledby={`${dir}-heading`}>
      <h3 id={`${dir}-heading`} className="t-subheading text-ink">
        {dir === "across" ? "Across" : "Down"}
      </h3>
      <ol className="mt-2 space-y-1">
        {entries
          .filter((e) => e.direction === dir)
          .map((e) => {
            const on = current?.number === e.number && current.direction === dir;
            return (
              <li key={`${e.number}${dir}`}>
                <button type="button" onClick={() => goToEntry(e)} aria-current={on ? "true" : undefined} className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${on ? "bg-brand-100 font-medium text-ink" : "text-ink-2 hover:bg-tint"}`}>
                  {e.number}. {clueFor(e)}
                </button>
              </li>
            );
          })}
      </ol>
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-2xl" data-game="mini_crossword">
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

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-tint px-3 py-2">
        <button type="button" onClick={() => stepClue(-1)} className="rounded-md px-2 py-1 text-sm font-semibold text-brand hover:bg-white">
          Previous clue
        </button>
        <p aria-live="polite" className="flex-1 text-center text-sm text-ink">
          {current && (
            <>
              <strong>
                {current.number} {current.direction === "across" ? "Across" : "Down"}:
              </strong>{" "}
              {clueFor(current)}
            </>
          )}
        </p>
        <button type="button" onClick={() => stepClue(1)} className="rounded-md px-2 py-1 text-sm font-semibold text-brand hover:bg-white">
          Next clue
        </button>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr]">
        <div
          ref={gridRef}
          role="grid"
          aria-label="Crossword grid"
          onKeyDown={onKeyDown}
          onFocus={() => (refocus.current = true)}
          onBlur={(e) => {
            if (!gridRef.current?.contains(e.relatedTarget as Node)) refocus.current = false;
          }}
          className="mx-auto grid w-[17.5rem] gap-0.5 rounded-md bg-ink p-0.5 sm:w-[19rem]"
        >
          {grid.map((row, r) => (
            <div key={r} role="row" className="grid grid-cols-5 gap-0.5">
              {[...row].map((ch, c) => {
              const idx = r * SIZE + c;
              if (ch === "#") return <div key={idx} role="gridcell" aria-label="Black square" className="aspect-square bg-ink" />;
              const here = cursor.r === r && cursor.c === c;
              const letter = letters[idx] ?? "";
              const num = numbers.get(`${r},${c}`);
              const bad = flagged.includes(idx);
              const label = `Row ${r + 1}, column ${c + 1}${num ? `, starts ${num}` : ""}, ${letter ? letter : "empty"}${bad ? ", wrong" : ""}`;
              return (
                <div key={idx} role="gridcell" className="aspect-square">
                  <button
                    type="button"
                    data-square={idx}
                    tabIndex={here ? 0 : -1}
                    aria-label={label}
                    onClick={() => {
                      refocus.current = true;
                      if (here) setDirection((d) => (d === "across" ? "down" : "across"));
                      else setCursor({ r, c });
                    }}
                    className={`relative flex size-full items-center justify-center text-xl font-bold text-ink sm:text-2xl ${here ? "bg-gold-300 ring-2 ring-inset ring-brand" : inCurrent(r, c) ? "bg-brand-100" : "bg-white"}`}
                  >
                    {num && (
                      <span aria-hidden="true" className="absolute left-0.5 top-0 text-[0.6rem] font-semibold leading-tight text-ink-2">
                        {num}
                      </span>
                    )}
                    <span aria-hidden="true">{letter}</span>
                    {bad && (
                      <span aria-hidden="true" className="absolute bottom-0 right-0.5 text-xs font-bold text-red-700">
                        ✗
                      </span>
                    )}
                  </button>
                </div>
              );
              })}
            </div>
          ))}
        </div>
        <div className="grid gap-4 text-ink">
          {list("across")}
          {list("down")}
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-center text-sm font-medium text-ink">
        {message}
      </p>

      {!solved ? (
        <>
          <div className="mt-2 space-y-1.5" aria-label="Keyboard">
            {ROWS.map((row, i) => (
              <div key={row} className="flex justify-center gap-1">
                {row.split("").map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      refocus.current = false;
                      typeLetter(k);
                    }}
                    className="h-11 min-w-0 max-w-10 flex-1 rounded-md bg-tint text-sm font-semibold text-ink"
                  >
                    {k}
                  </button>
                ))}
                {i === 2 && (
                  <button type="button" onClick={backspace} className="h-11 rounded-md bg-tint px-2.5 text-xs font-semibold text-ink">
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={check} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Check my letters
            </button>
          </div>
        </>
      ) : (
        <div className="panel mt-4 space-y-3 p-5 text-center">
          <p className="t-subheading text-ink">Solved{checks === 0 ? " with no checks" : ` with ${checks} ${checks === 1 ? "check" : "checks"}`}</p>
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
