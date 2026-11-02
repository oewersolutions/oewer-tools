import type { HiveWordsData } from "./types";

export const MIN_WORD = 4;

/** The ranks, with the share of the possible points needed to reach each. */
export const RANKS: readonly { name: string; from: number }[] = [
  { name: "Beginner", from: 0 },
  { name: "Getting going", from: 0.02 },
  { name: "Moving up", from: 0.05 },
  { name: "Good", from: 0.08 },
  { name: "Solid", from: 0.15 },
  { name: "Nice", from: 0.25 },
  { name: "Great", from: 0.4 },
  { name: "Amazing", from: 0.5 },
  { name: "Hive Master", from: 0.7 },
];

export const letters = (data: HiveWordsData): string[] => [data.center, ...data.outer];

/** True when the word uses every one of the seven letters. */
export const isPangram = (data: HiveWordsData, word: string): boolean => letters(data).every((l) => word.includes(l));

/** One point for a four-letter word, one per letter above that, and seven extra for a word using all seven letters. */
export const points = (data: HiveWordsData, word: string): number => (word.length === MIN_WORD ? 1 : word.length) + (isPangram(data, word) ? 7 : 0);

export const totalPoints = (data: HiveWordsData, words: readonly string[]): number => words.reduce((n, w) => n + points(data, w), 0);

export function rankFor(score: number, max: number): { name: string; index: number } {
  const share = max === 0 ? 0 : score / max;
  let index = 0;
  RANKS.forEach((r, i) => {
    if (share >= r.from) index = i;
  });
  return { name: RANKS[index]!.name, index };
}

/** Every word in `list` that can be made from the puzzle's letters, always uses the centre one, and is at least four letters. */
export function wordsFor(center: string, outer: readonly string[], list: Iterable<string>): string[] {
  const allowed = new Set([center, ...outer]);
  const out: string[] = [];
  for (const w of list) if (w.length >= MIN_WORD && w.includes(center) && [...w].every((c) => allowed.has(c))) out.push(w);
  return out.sort();
}

export type WordCheck = { ok: true; word: string; pangram: boolean; points: number } | { ok: false; reason: string };

/** What happens when a visitor enters `typed`. */
export function checkWord(data: HiveWordsData, typed: string, found: readonly string[]): WordCheck {
  const word = typed.toUpperCase();
  if (word.length < MIN_WORD) return { ok: false, reason: "Too short. Words need four letters or more." };
  const allowed = new Set(letters(data));
  if ([...word].some((c) => !allowed.has(c))) return { ok: false, reason: "That word uses a letter that is not in the hive." };
  if (!word.includes(data.center)) return { ok: false, reason: `Every word needs the centre letter, ${data.center}.` };
  if (found.includes(word)) return { ok: false, reason: "You already found that word." };
  if (!data.words.includes(word)) return { ok: false, reason: "Not in the word list." };
  return { ok: true, word, pangram: isPangram(data, word), points: points(data, word) };
}

/** The result as text to paste: the rank and the score, not the words. */
export function shareText(name: string, number: number, data: HiveWordsData, found: readonly string[]): string {
  const max = totalPoints(data, data.words);
  const score = totalPoints(data, found);
  const rank = rankFor(score, max);
  const pangrams = found.filter((w) => isPangram(data, w)).length;
  return [`${name} No. ${number}: ${rank.name}`, `${score} of ${max} points, ${found.length} of ${data.words.length} words${pangrams ? `, ${pangrams} pangram${pangrams > 1 ? "s" : ""}` : ""}`].join("\n");
}
