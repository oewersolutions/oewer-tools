import type { WordTrailData } from "./types";

export const ROWS = 8;
export const COLS = 6;
export const CELLS = ROWS * COLS;

export const rowOf = (i: number): number => Math.floor(i / COLS);
export const colOf = (i: number): number => i % COLS;

/** Two squares are neighbours when they touch, diagonals included. */
export const adjacent = (a: number, b: number): boolean => a !== b && Math.abs(rowOf(a) - rowOf(b)) <= 1 && Math.abs(colOf(a) - colOf(b)) <= 1;

/** True when the squares form a connected path: each one touches the one before, and none is used twice. */
export const isPath = (cells: readonly number[]): boolean => new Set(cells).size === cells.length && cells.every((c, i) => i === 0 || adjacent(cells[i - 1]!, c));

/** The key word runs from one side of the grid to the opposite: top to bottom, or left to right. */
export const spans = (cells: readonly number[]): boolean => {
  const rows = cells.map(rowOf);
  const cols = cells.map(colOf);
  return (rows.includes(0) && rows.includes(ROWS - 1)) || (cols.includes(0) && cols.includes(COLS - 1));
};

/** What is wrong with a Word Trail puzzle's data, or null. */
export function checkTrail(data: Partial<WordTrailData>): string | null {
  const { theme, grid, words } = data;
  if (typeof theme !== "string" || theme.trim() === "" || theme.length > 80) return "needs a \"theme\" of up to 80 characters";
  if (!Array.isArray(grid) || grid.length !== ROWS || grid.some((r) => typeof r !== "string" || !new RegExp(`^[A-Z]{${COLS}}$`).test(r))) return `needs a "grid" of ${ROWS} rows of ${COLS} capital letters`;
  if (!Array.isArray(words) || words.length < 3 || words.length > 12) return "needs between 3 and 12 words";
  const letters = grid.join("");
  const covered = new Set<number>();
  const seen = new Set<string>();
  let keys = 0;
  for (const w of words) {
    if (typeof w?.word !== "string" || !/^[A-Z]{4,}$/.test(w.word)) return `has a word that is not four or more capital letters (${JSON.stringify(w?.word)})`;
    if (seen.has(w.word)) return `the word ${w.word} is used twice`;
    seen.add(w.word);
    if (!Array.isArray(w.cells) || w.cells.length !== w.word.length || w.cells.some((c) => !Number.isInteger(c) || c < 0 || c >= CELLS)) return `${w.word} needs one square number (0 to ${CELLS - 1}) for each letter`;
    if (!isPath(w.cells)) return `${w.word} does not follow squares that touch one after another`;
    for (const [i, c] of w.cells.entries()) {
      if (letters[c] !== w.word[i]) return `${w.word} does not match the letters in the grid (square ${c})`;
      if (covered.has(c)) return `square ${c} is used by two words`;
      covered.add(c);
    }
    if (w.key) {
      keys++;
      if (!spans(w.cells)) return `the key word ${w.word} must run from one side of the grid to the opposite side`;
    }
  }
  if (keys !== 1) return "needs exactly one key word (\"key\": true)";
  if (covered.size !== CELLS) return `leaves ${CELLS - covered.size} squares unused; every square must belong to a word`;
  return null;
}

export type Pick = { kind: "found"; index: number } | { kind: "elsewhere"; index: number } | { kind: "none" };

/**
 * What a chosen path of squares is. `found` when it is exactly a theme word's squares (either way round);
 * `elsewhere` when it spells a theme word with other squares, so the player is nudged to look again.
 */
export function judge(data: WordTrailData, cells: readonly number[]): Pick {
  const text = cells.map((c) => data.grid[rowOf(c)]![colOf(c)]).join("");
  const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();
  for (const [index, w] of data.words.entries()) if (same(w.cells, cells) && (text === w.word || [...text].reverse().join("") === w.word)) return { kind: "found", index };
  for (const [index, w] of data.words.entries()) if (text === w.word || [...text].reverse().join("") === w.word) return { kind: "elsewhere", index };
  return { kind: "none" };
}

export const shareText = (name: string, number: number, data: WordTrailData, order: readonly number[], hints: number): string => {
  const marks = order.map((i) => (data.words[i]!.key ? "🟡" : "🔵")).join("");
  return [`${name} No. ${number}`, `"${data.theme}"`, marks, hints === 0 ? "No hints" : `${hints} ${hints === 1 ? "hint" : "hints"}`].join("\n");
};
