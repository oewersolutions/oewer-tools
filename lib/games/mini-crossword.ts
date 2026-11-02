import type { MiniCrosswordData } from "./types";

export const SIZE = 5;
export type Direction = "across" | "down";

export interface Entry {
  number: number;
  direction: Direction;
  row: number;
  col: number;
  length: number;
  answer: string;
}

const white = (grid: readonly string[], r: number, c: number): boolean => r >= 0 && c >= 0 && r < grid.length && c < (grid[r]?.length ?? 0) && grid[r]![c] !== "#";

/**
 * The entries of a grid, numbered the usual way: a white square that starts an across or a down entry gets the next
 * number, reading left to right and top to bottom. A run of one square is not an entry.
 */
export function entriesOf(grid: readonly string[]): Entry[] {
  const out: Entry[] = [];
  let number = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r]!.length; c++) {
      if (!white(grid, r, c)) continue;
      const startsAcross = !white(grid, r, c - 1) && white(grid, r, c + 1);
      const startsDown = !white(grid, r - 1, c) && white(grid, r + 1, c);
      if (!startsAcross && !startsDown) continue;
      number++;
      for (const [direction, starts, dr, dc] of [["across", startsAcross, 0, 1], ["down", startsDown, 1, 0]] as const) {
        if (!starts) continue;
        let answer = "";
        for (let i = 0; white(grid, r + dr * i, c + dc * i); i++) answer += grid[r + dr * i]![c + dc * i];
        out.push({ number, direction, row: r, col: c, length: answer.length, answer });
      }
    }
  }
  return out;
}

/** The entry of a given direction that a square belongs to, if it has one. */
export function entryAt(entries: readonly Entry[], row: number, col: number, direction: Direction): Entry | undefined {
  return entries.find((e) => e.direction === direction && (direction === "across" ? e.row === row && col >= e.col && col < e.col + e.length : e.col === col && row >= e.row && row < e.row + e.length));
}

/** What is wrong with a crossword's data, or null. `words` (upper case) is checked for answers of four letters or more. */
export function checkMini(data: Partial<MiniCrosswordData>, words?: ReadonlySet<string>): string | null {
  const { grid, across, down } = data;
  if (!Array.isArray(grid) || grid.length !== SIZE || grid.some((row) => typeof row !== "string" || !new RegExp(`^[A-Z#]{${SIZE}}$`).test(row))) return `needs a "grid" of ${SIZE} rows, each of ${SIZE} capital letters or # for a black square`;
  const entries = entriesOf(grid);
  if (entries.length === 0) return "has no words in the grid";
  for (const e of entries) if (e.length < 3) return `has a ${e.length}-letter run (${e.answer}) at row ${e.row + 1}, column ${e.col + 1}; words need three letters or more`;
  const covered = new Set<string>();
  for (const e of entries) for (let i = 0; i < e.length; i++) covered.add(e.direction === "across" ? `${e.row},${e.col + i}` : `${e.row + i},${e.col}`);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r]![c] !== "#" && !covered.has(`${r},${c}`)) return `has a letter on its own at row ${r + 1}, column ${c + 1}`;
  for (const [direction, clues] of [["across", across], ["down", down]] as const) {
    if (typeof clues !== "object" || clues === null || Array.isArray(clues)) return `needs "${direction}" clues, like {"1": "A clue"}`;
    const wanted = entries.filter((e) => e.direction === direction);
    for (const e of wanted) {
      const clue = (clues as Record<string, unknown>)[String(e.number)];
      if (typeof clue !== "string" || clue.trim() === "" || clue.length > 120) return `needs a clue of up to 120 characters for ${e.number} ${direction}`;
      if (new RegExp(`\\b${e.answer}\\b`, "i").test(clue)) return `the clue for ${e.number} ${direction} gives the answer away`;
      if (words && e.length >= 4 && !words.has(e.answer)) return `the answer ${e.answer} (${e.number} ${direction}) is not in the word list`;
    }
    const extra = Object.keys(clues as object).filter((k) => !wanted.some((e) => String(e.number) === k));
    if (extra.length > 0) return `has a clue for ${extra[0]} ${direction}, which is not a word in the grid`;
  }
  return null;
}

/** The squares whose letter is filled in and wrong. */
export function wrongSquares(grid: readonly string[], letters: readonly string[]): number[] {
  const out: number[] = [];
  grid.forEach((row, r) => [...row].forEach((ch, c) => {
    const typed = letters[r * SIZE + c];
    if (ch !== "#" && typed && typed !== ch) out.push(r * SIZE + c);
  }));
  return out;
}

export const isSolved = (grid: readonly string[], letters: readonly string[]): boolean => grid.every((row, r) => [...row].every((ch, c) => ch === "#" || letters[r * SIZE + c] === ch));

export const shareText = (name: string, number: number, checks: number): string => `${name} No. ${number}: solved${checks > 0 ? ` with ${checks} ${checks === 1 ? "check" : "checks"}` : " with no checks"}`;
