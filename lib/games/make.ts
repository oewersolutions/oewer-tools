/**
 * Tools for making puzzles: a seeded random source, a crossword grid filler, a Word Trail packer, a Hive Words letter
 * picker and a Word Guess answer picker. They only propose puzzles; every one still goes through the same checks as
 * any other puzzle when it is added to the workbook.
 */
import { entriesOf, SIZE } from "./mini-crossword";
import { wordsFor } from "./hive-words";
import { adjacent, CELLS, COLS, ROWS, spans } from "./word-trail";

export type Rng = () => number;

/** A small seeded random source, so a run can be repeated. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------------------------------------------------------------- Mini Crossword

/** Shapes that fill well: short words at the corners, longer ones through the middle. `.` is a white square. */
export const CROSSWORD_SHAPES: readonly (readonly string[])[] = [
  ["...##", "....#", ".....", "#....", "##..."],
  ["##...", "#....", ".....", "....#", "...##"],
];

export interface Grid {
  grid: string[];
  entries: { number: number; direction: "across" | "down"; answer: string }[];
}

/**
 * Fill a crossword shape with words from `words` (upper case, three to five letters), no word twice. Returns null
 * if no fill is found within `budgetMs`; try again with the same source for a different attempt.
 */
export function fillCrossword(shape: readonly string[], words: readonly string[], rng: Rng, budgetMs = 1000): Grid | null {
  const byLength = new Map<number, string[]>();
  const prefixes = new Set<string>();
  for (const w of words) {
    if (w.length < 3 || w.length > SIZE) continue;
    byLength.set(w.length, [...(byLength.get(w.length) ?? []), w]);
    for (let i = 1; i <= w.length; i++) prefixes.add(`${w.length}:${w.slice(0, i)}`);
  }
  const start = Date.now();
  const cell: (string | null)[][] = shape.map((row) => [...row].map((ch) => (ch === "#" ? "#" : null)));
  const used: string[] = [];

  const downRun = (r: number, c: number): [number, number] => {
    let top = r;
    while (top > 0 && shape[top - 1]![c] !== "#") top--;
    let bottom = r;
    while (bottom < SIZE - 1 && shape[bottom + 1]![c] !== "#") bottom++;
    return [top, bottom - top + 1];
  };
  const runsOf = (r: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let c = 0; c < SIZE; ) {
      if (shape[r]![c] === "#") {
        c++;
        continue;
      }
      const s = c;
      while (c < SIZE && shape[r]![c] !== "#") c++;
      out.push([s, c - s]);
    }
    return out;
  };
  const fits = (r: number, c: number, ch: string): boolean => {
    const [top, length] = downRun(r, c);
    if (length < 2) return true;
    let seg = "";
    for (let i = top; i < r; i++) seg += cell[i]![c];
    return prefixes.has(`${length}:${seg}${ch}`);
  };

  const row = (r: number): boolean => {
    if (Date.now() - start > budgetMs) return false;
    if (r === SIZE) return true;
    const runs = runsOf(r);
    const place = (i: number): boolean => {
      if (i === runs.length) {
        // down words that end on this row are complete: none may repeat a word already in the grid
        const done: string[] = [];
        for (let c = 0; c < SIZE; c++) {
          if (shape[r]![c] === "#") continue;
          const [top, length] = downRun(r, c);
          if (length >= 2 && top + length - 1 === r) {
            let w = "";
            for (let k = top; k <= r; k++) w += cell[k]![c];
            done.push(w);
          }
        }
        if (new Set(done).size !== done.length || done.some((w) => used.includes(w))) return false;
        used.push(...done);
        if (row(r + 1)) return true;
        used.length -= done.length;
        return false;
      }
      const [s, length] = runs[i]!;
      const candidates = shuffle((byLength.get(length) ?? []).filter((w) => !used.includes(w) && [...w].every((ch, k) => fits(r, s + k, ch))), rng).slice(0, 80);
      for (const w of candidates) {
        for (let k = 0; k < length; k++) cell[r]![s + k] = w[k]!;
        used.push(w);
        if (place(i + 1)) return true;
        used.pop();
        for (let k = 0; k < length; k++) cell[r]![s + k] = null;
        if (Date.now() - start > budgetMs) return false;
      }
      return false;
    };
    return place(0);
  };

  if (!row(0)) return null;
  const grid = cell.map((r) => r.join(""));
  return { grid, entries: entriesOf(grid).map((e) => ({ number: e.number, direction: e.direction, answer: e.answer })) };
}

// ---------------------------------------------------------------- Word Trail

const NEIGHBOURS: number[][] = Array.from({ length: CELLS }, (_, i) => Array.from({ length: CELLS }, (_, j) => j).filter((j) => adjacent(i, j)));

export interface Packed {
  grid: string[];
  words: { word: string; cells: number[]; key?: true }[];
}

/**
 * Lay words out in the 8 by 6 grid so that together they use every square exactly once and the key word crosses the
 * grid. The words' letters must add up to 48. Returns null if no layout is found within `budgetMs`.
 */
export function packTrail(words: readonly string[], key: string, rng: Rng, budgetMs = 4000): Packed | null {
  if (words.reduce((n, w) => n + w.length, 0) !== CELLS || !words.includes(key)) return null;
  const start = Date.now();
  const letters: (string | null)[] = Array(CELLS).fill(null);
  const placed = new Map<string, number[]>();
  const remaining = [...words];

  const pathsThrough = (cell: number, word: string, at: number): number[][] => {
    const out: number[][] = [];
    const forward = (chain: number[], used: Set<number>, j: number) => {
      if (j >= word.length) return void out.push(chain);
      for (const nb of NEIGHBOURS[chain[chain.length - 1]!]!) if (!used.has(nb) && letters[nb] === null) forward([...chain, nb], new Set(used).add(nb), j + 1);
    };
    const back = (chain: number[], used: Set<number>, j: number) => {
      if (j < 0) return forward(chain, used, at + 1);
      for (const nb of NEIGHBOURS[chain[0]!]!) if (!used.has(nb) && letters[nb] === null) back([nb, ...chain], new Set(used).add(nb), j - 1);
    };
    back([cell], new Set([cell]), at - 1);
    return out;
  };

  const rec = (): boolean => {
    if (Date.now() - start > budgetMs) return false;
    if (remaining.length === 0) return letters.every((l) => l !== null);
    const empty = letters.findIndex((l) => l === null);
    if (empty < 0) return false;
    const options: [string, number][] = [];
    for (const w of remaining) for (let i = 0; i < w.length; i++) options.push([w, i]);
    for (const [w, i] of shuffle(options, rng)) {
      for (const p of shuffle(pathsThrough(empty, w, i), rng).slice(0, 12)) {
        if (w === key && !spans(p)) continue;
        p.forEach((c, k) => (letters[c] = w[k]!));
        placed.set(w, p);
        remaining.splice(remaining.indexOf(w), 1);
        if (rec()) return true;
        remaining.push(w);
        placed.delete(w);
        for (const c of p) letters[c] = null;
        if (Date.now() - start > budgetMs) return false;
      }
    }
    return false;
  };

  if (!rec()) return null;
  const grid = Array.from({ length: ROWS }, (_, r) => letters.slice(r * COLS, (r + 1) * COLS).join(""));
  return { grid, words: words.map((w) => ({ word: w, cells: placed.get(w)!, ...(w === key ? { key: true as const } : {}) })) };
}

/** Subsets of `pool` that include `key` and have exactly 48 letters in all (the grid size), in random order. */
export function trailSubsets(pool: readonly string[], key: string, rng: Rng, limit = 60): string[][] {
  const others = [...new Set(pool)].filter((w) => w !== key && w.length >= 4);
  const need = CELLS - key.length;
  const found: string[][] = [];
  const walk = (i: number, sum: number, chosen: string[]) => {
    if (found.length >= 4000) return;
    if (sum === need) return void found.push([key, ...chosen]);
    if (sum > need || i >= others.length || chosen.length >= 9) return;
    walk(i + 1, sum + others[i]!.length, [...chosen, others[i]!]);
    walk(i + 1, sum, chosen);
  };
  walk(0, 0, []);
  return shuffle(found, rng).slice(0, limit);
}

// ---------------------------------------------------------------- Hive Words

/**
 * Seven letters for a Hive Words puzzle: a word that uses seven different letters (none of S, Q, J, X, Z), with a
 * centre letter chosen so the puzzle has a good number of words. Sets in `used` (their letters sorted, as a string)
 * are skipped. Returns null if none is found.
 */
export function pickHive(common: readonly string[], used: ReadonlySet<string>, rng: Rng): { center: string; outer: string[] } | null {
  const sets = new Map<string, true>();
  for (const w of common) {
    const letters = [...new Set(w)].sort().join("");
    if (letters.length === 7 && !/[SQJXZ]/.test(letters) && !used.has(letters)) sets.set(letters, true);
  }
  for (const letters of shuffle([...sets.keys()], rng)) {
    for (const center of shuffle([...letters], rng)) {
      const outer = [...letters].filter((l) => l !== center);
      const words = wordsFor(center, outer, common);
      const points = words.reduce((n, w) => n + (w.length === 4 ? 1 : w.length) + (new Set(w).size === 7 ? 7 : 0), 0);
      if (words.length >= 28 && words.length <= 60 && points <= 190) return { center, outer };
    }
  }
  return null;
}

/** Letter set of a Hive Words puzzle as the string used to avoid repeats. */
export const hiveKey = (data: { center: string; outer: string[] }): string => [data.center, ...data.outer].sort().join("");

// ---------------------------------------------------------------- Word Guess

/** `count` answers from `candidates` not already in `used`, in random order. */
export function pickAnswers(candidates: readonly string[], used: ReadonlySet<string>, count: number, rng: Rng): string[] {
  return shuffle(
    candidates.filter((w) => !used.has(w)),
    rng,
  ).slice(0, count);
}

// ---------------------------------------------------------------- Stock

/** The day after `date` (YYYY-MM-DD), by the calendar. */
const addDays = (date: string, n: number): string => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + n)).toISOString().slice(0, 10);

/**
 * How many days in a row, starting today, have a published puzzle, and the first day that does not. A game with no
 * puzzle today has 0 days ready, however many come later.
 */
export function stockFrom(dates: ReadonlySet<string>, today: string): { days: number; nextMissing: string } {
  let day = today;
  let days = 0;
  while (dates.has(day)) {
    days++;
    day = addDays(day, 1);
  }
  return { days, nextMissing: day };
}

export { addDays };
