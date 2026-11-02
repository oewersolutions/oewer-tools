import type { GameType, Puzzle, WordGuessData } from "./types";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as YYYY-MM-DD (so 2026-02-30 is not one). */
export function isPuzzleDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** The day after `date` (YYYY-MM-DD), by the calendar, so time zones cannot move it. */
export function nextDay(date: string): string {
  const m = DATE.exec(date)!;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1)).toISOString().slice(0, 10);
}

/** The day before `date` (YYYY-MM-DD). */
export function prevDay(date: string): string {
  const m = DATE.exec(date)!;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 1)).toISOString().slice(0, 10);
}

/**
 * Today's puzzle: the one dated `today`; failing that the latest one before it (a day was missed); failing that the
 * earliest one there is (the games start in the future). Puzzles must be sorted by date, oldest first.
 */
export function pickPuzzle<T extends { date: string }>(puzzles: readonly T[], today: string): T | undefined {
  if (puzzles.length === 0) return undefined;
  const past = puzzles.filter((p) => p.date <= today);
  return past.length > 0 ? past[past.length - 1] : puzzles[0];
}

/** Position of a puzzle in its game's run, starting at 1 (the number shown as "No. 12"). */
export const puzzleNumber = (puzzles: readonly { date: string }[], date: string): number => puzzles.findIndex((p) => p.date === date) + 1;

/**
 * Returns what is wrong with a puzzle's data for its game type, or null when it is playable. `words` is the list of
 * words the game accepts as guesses (upper case); the answer must be one of them.
 */
export function checkPuzzleData(type: GameType, text: string, words?: ReadonlySet<string>): string | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return "must be valid JSON";
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return "must be a JSON object, like {\"answer\":\"CRANE\"}";
  switch (type) {
    case "word_guess": {
      const answer = (data as Partial<WordGuessData>).answer;
      if (typeof answer !== "string" || !/^[A-Z]{5}$/.test(answer)) return "needs an \"answer\" of exactly five capital letters, like {\"answer\":\"CRANE\"}";
      if (words && !words.has(answer)) return `the answer ${answer} is not in the word list, so players could not guess it`;
      return null;
    }
    case "four_groups": {
      const groups = (data as { groups?: unknown }).groups;
      if (!Array.isArray(groups) || groups.length !== 4) return "needs four groups, like {\"groups\":[{\"title\":\"Fruits\",\"level\":1,\"words\":[\"MANGO\",...]}]}";
      const seenWords = new Set<string>();
      const levels = new Set<number>();
      for (const [i, g] of groups.entries()) {
        const group = g as { title?: unknown; level?: unknown; words?: unknown };
        const name = `group ${i + 1}`;
        if (typeof group.title !== "string" || group.title.trim() === "" || group.title.length > 60) return `${name} needs a title of up to 60 characters`;
        if (!Number.isInteger(group.level) || (group.level as number) < 1 || (group.level as number) > 4) return `${name} needs a level from 1 to 4`;
        levels.add(group.level as number);
        if (!Array.isArray(group.words) || group.words.length !== 4) return `${name} needs exactly four words`;
        for (const w of group.words) {
          if (typeof w !== "string" || !/^[A-Z][A-Z' -]{0,13}$/.test(w)) return `${name} has a word that is not in capital letters, up to 14 characters (${JSON.stringify(w)})`;
          if (seenWords.has(w)) return `the word ${w} is used twice`;
          seenWords.add(w);
        }
      }
      if (levels.size !== 4) return "each group needs a different level, 1 to 4";
      return null;
    }
    default:
      return `puzzles for '${type}' games are not supported yet`;
  }
}

/** Parse the rows of one game into puzzles, oldest first. Rows whose data is unreadable are left out. */
export function toPuzzles<T>(rows: { puzzle_id: string; puzzle_date: string; title: string; puzzle_data: string }[]): Puzzle<T>[] {
  const out: Puzzle<T>[] = [];
  for (const r of rows) {
    try {
      out.push({ id: r.puzzle_id, date: r.puzzle_date, title: r.title, data: JSON.parse(r.puzzle_data) as T });
    } catch {
      // validation reports this at build time; never break a page over it
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
