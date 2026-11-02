import type { FourGroupsData } from "./types";

export const MAX_MISTAKES = 4;
export const LEVEL_NAME = ["", "Easiest", "Easy", "Tricky", "Trickiest"] as const;
/** Emoji for each level when sharing a result: yellow, green, blue, purple. */
export const LEVEL_SQUARE = ["", "🟨", "🟩", "🟦", "🟪"] as const;

export type Verdict = { kind: "correct"; group: number } | { kind: "one_away" } | { kind: "wrong" };

/** What a guess of four words is: a whole group, one word away from a group, or wrong. */
export function checkGuess(data: FourGroupsData, picked: readonly string[]): Verdict {
  let best = 0;
  for (const [i, g] of data.groups.entries()) {
    const hits = picked.filter((w) => g.words.includes(w)).length;
    if (hits === 4) return { kind: "correct", group: i };
    best = Math.max(best, hits);
  }
  return best === 3 ? { kind: "one_away" } : { kind: "wrong" };
}

export interface Replay {
  /** Group numbers in the order they were found. */
  solved: number[];
  mistakes: number;
  state: "playing" | "won" | "lost";
}

/** Work out where a game stands from the guesses made so far, so saving only needs the guesses. */
export function replay(data: FourGroupsData, guesses: readonly (readonly string[])[]): Replay {
  const solved: number[] = [];
  let mistakes = 0;
  for (const guess of guesses) {
    const v = checkGuess(data, guess);
    if (v.kind === "correct") {
      if (!solved.includes(v.group)) solved.push(v.group);
    } else mistakes++;
  }
  return { solved, mistakes, state: solved.length === 4 ? "won" : mistakes >= MAX_MISTAKES ? "lost" : "playing" };
}

/** True when this exact set of four was already tried (the order does not matter). */
export const isRepeat = (guesses: readonly (readonly string[])[], picked: readonly string[]): boolean => {
  const key = [...picked].sort().join("|");
  return guesses.some((g) => [...g].sort().join("|") === key);
};

/** The 16 words in a fixed order for a given puzzle, so a reload does not move the tiles. */
export function startingOrder(data: FourGroupsData, seed: string): string[] {
  const words = data.groups.flatMap((g) => g.words);
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const next = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 100000) / 100000;
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  return words;
}

/** A shuffled copy (for the Shuffle button). */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The result as text to paste: a row of four squares per guess, coloured by the groups the words came from. */
export function shareText(name: string, number: number, data: FourGroupsData, guesses: readonly (readonly string[])[]): string {
  const r = replay(data, guesses);
  const rows = guesses.map((g) => g.map((w) => LEVEL_SQUARE[data.groups.find((x) => x.words.includes(w))!.level]).join(""));
  const score = r.state === "won" ? `${r.mistakes} ${r.mistakes === 1 ? "mistake" : "mistakes"}` : "not solved";
  return [`${name} No. ${number}, ${score}`, "", ...rows].join("\n");
}
