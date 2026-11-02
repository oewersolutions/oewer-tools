export type LetterState = "correct" | "present" | "absent";

/**
 * Mark each letter of a guess against the answer. Letters in the right place are correct; a letter elsewhere is
 * present only as many times as it still appears in the answer after the correct ones are taken out, so a repeated
 * letter is never marked more often than it occurs.
 */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(guess.length).fill("absent");
  const left = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) result[i] = "correct";
    else left.set(answer[i]!, (left.get(answer[i]!) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const n = left.get(guess[i]!) ?? 0;
    if (n > 0) {
      result[i] = "present";
      left.set(guess[i]!, n - 1);
    }
  }
  return result;
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/** The best thing known about each letter so far, for colouring the keyboard. */
export function keyStates(guesses: readonly string[], answer: string): Record<string, LetterState> {
  const out: Record<string, LetterState> = {};
  for (const g of guesses) {
    scoreGuess(g, answer).forEach((s, i) => {
      const letter = g[i]!;
      if (!out[letter] || RANK[s] > RANK[out[letter]!]) out[letter] = s;
    });
  }
  return out;
}

export const MAX_GUESSES = 6;

export type Outcome = "playing" | "won" | "lost";

export function outcome(guesses: readonly string[], answer: string): Outcome {
  if (guesses.includes(answer)) return "won";
  return guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

const SQUARE: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬛" };

/** The result as text to paste, with a square per letter and no letters, so it does not give the answer away. */
export function shareText(name: string, number: number, guesses: readonly string[], answer: string): string {
  const score = outcome(guesses, answer) === "won" ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const rows = guesses.map((g) => scoreGuess(g, answer).map((s) => SQUARE[s]).join(""));
  return [`${name} No. ${number} ${score}`, "", ...rows].join("\n");
}

export interface Streak {
  played: number;
  won: number;
  current: number;
  best: number;
  /** The date of the last finished puzzle, to tell whether the streak carried on. */
  last: string;
}

export const EMPTY_STREAK: Streak = { played: 0, won: 0, current: 0, best: 0, last: "" };

/** Record a finished puzzle. The streak carries on only if the last finished puzzle was the day before. */
export function recordResult(streak: Streak, date: string, won: boolean, previousDate: string): Streak {
  if (streak.last === date) return streak;
  const carries = won && streak.last === previousDate;
  const current = won ? (carries ? streak.current + 1 : 1) : 0;
  return { played: streak.played + 1, won: streak.won + (won ? 1 : 0), current, best: Math.max(streak.best, current), last: date };
}
