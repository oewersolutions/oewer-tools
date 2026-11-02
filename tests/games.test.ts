import { describe, expect, it } from "vitest";
import { checkPuzzleData, isPuzzleDate, nextDay, pickPuzzle, prevDay, puzzleNumber } from "../lib/games/puzzles";
import { EMPTY_STREAK, keyStates, outcome, recordResult, scoreGuess, shareText } from "../lib/games/word-guess";
import { schema, validateWorkbook, type WorkbookData } from "../lib/workbook";

describe("scoreGuess", () => {
  it("marks right letters in the right place, and letters elsewhere", () => {
    expect(scoreGuess("CRANE", "CRANE")).toEqual(Array(5).fill("correct"));
    expect(scoreGuess("NACRE", "CRANE")).toEqual(["present", "present", "present", "present", "correct"]);
    expect(scoreGuess("PLUMB", "CRANE")).toEqual(Array(5).fill("absent"));
  });
  it("never marks a repeated letter more often than the answer has it", () => {
    // the answer has one E and the last E sits in the right place, so the other two Es are absent
    expect(scoreGuess("EERIE", "CRANE")).toEqual(["absent", "absent", "present", "absent", "correct"]);
    // a letter in the right place takes its copy first, so the earlier misplaced copy is absent
    expect(scoreGuess("LLAMA", "ALLOY")).toEqual(["present", "correct", "present", "absent", "absent"]);
    expect(scoreGuess("SPEED", "ABIDE")).toEqual(["absent", "absent", "present", "absent", "present"]);
  });
});

describe("keyStates and outcome", () => {
  it("keeps the best thing known about each letter", () => {
    const k = keyStates(["NACRE", "CRANE"], "CRANE");
    expect(k.C).toBe("correct");
    expect(k.Z).toBeUndefined();
  });
  it("wins on the answer, loses after six wrong guesses, otherwise plays on", () => {
    expect(outcome(["PLUMB", "CRANE"], "CRANE")).toBe("won");
    expect(outcome(["PLUMB"], "CRANE")).toBe("playing");
    expect(outcome(Array(6).fill("PLUMB"), "CRANE")).toBe("lost");
  });
  it("a shared result shows squares and not the letters", () => {
    const text = shareText("Word Guess", 3, ["PLUMB", "CRANE"], "CRANE");
    expect(text).toBe("Word Guess No. 3 2/6\n\n⬛⬛⬛⬛⬛\n🟩🟩🟩🟩🟩");
    expect(shareText("Word Guess", 3, Array(6).fill("PLUMB"), "CRANE")).toMatch(/X\/6/);
  });
});

describe("recordResult", () => {
  it("carries a streak only from the day before, and a loss resets it", () => {
    let s = recordResult(EMPTY_STREAK, "2026-11-01", true, "2026-10-31");
    s = recordResult(s, "2026-11-02", true, "2026-11-01");
    expect(s).toMatchObject({ played: 2, won: 2, current: 2, best: 2 });
    s = recordResult(s, "2026-11-04", true, "2026-11-03"); // a day was skipped
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
    s = recordResult(s, "2026-11-05", false, "2026-11-04");
    expect(s).toMatchObject({ current: 0, played: 4, won: 3 });
  });
  it("counts a puzzle once", () => {
    const s = recordResult(EMPTY_STREAK, "2026-11-01", true, "2026-10-31");
    expect(recordResult(s, "2026-11-01", true, "2026-10-31")).toBe(s);
  });
});

describe("dates and the puzzle of the day", () => {
  it("accepts real days only", () => {
    expect(isPuzzleDate("2026-11-03")).toBe(true);
    expect(isPuzzleDate("2028-02-29")).toBe(true);
    expect(isPuzzleDate("2026-02-29")).toBe(false);
    expect(isPuzzleDate("2026-13-01")).toBe(false);
    expect(isPuzzleDate("3 Nov 2026")).toBe(false);
  });
  it("steps by the calendar, across month and year ends", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
    expect(prevDay("2026-03-01")).toBe("2026-02-28");
  });
  const puzzles = [{ date: "2026-11-01" }, { date: "2026-11-02" }, { date: "2026-11-04" }];
  it("picks today's puzzle, else the latest before it, else the first", () => {
    expect(pickPuzzle(puzzles, "2026-11-02")?.date).toBe("2026-11-02");
    expect(pickPuzzle(puzzles, "2026-11-03")?.date).toBe("2026-11-02"); // a missed day shows the latest
    expect(pickPuzzle(puzzles, "2026-10-01")?.date).toBe("2026-11-01"); // before the games start
    expect(pickPuzzle([], "2026-11-02")).toBeUndefined();
    expect(puzzleNumber(puzzles, "2026-11-04")).toBe(3);
  });
});

describe("checkPuzzleData", () => {
  const words = new Set(["CRANE", "PLUMB"]);
  it("accepts a five-letter answer that is in the word list", () => {
    expect(checkPuzzleData("word_guess", '{"answer":"CRANE"}', words)).toBeNull();
    expect(checkPuzzleData("word_guess", '{"answer":"CRANE"}')).toBeNull();
  });
  it("explains what is wrong", () => {
    expect(checkPuzzleData("word_guess", "not json")).toMatch(/valid JSON/);
    expect(checkPuzzleData("word_guess", '{"answer":"crane"}')).toMatch(/five capital letters/);
    expect(checkPuzzleData("word_guess", '{"answer":"ZZZZZ"}', words)).toMatch(/not in the word list/);
    expect(checkPuzzleData("four_groups", "{}")).toMatch(/not supported yet/);
  });
});

describe("workbook rules for games", () => {
  const row = (n: number, values: Record<string, unknown>) => ({ row: n, values });
  const base = (): WorkbookData => ({
    games: [row(2, { game_id: "GAME0001", slug: "word-guess", name: "Word Guess", tagline: "t", game_type: "word_guess", how_to_play: "x", status: "published", sort_order: 1 })],
    game_puzzles: [row(2, { puzzle_id: "PUZ00001", game_id: "GAME0001", puzzle_date: "2026-11-01", title: "", puzzle_data: '{"answer":"CRANE"}', status: "published", author_note: "" })],
  });
  const gameIssues = (data: WorkbookData) => validateWorkbook(data, schema).filter((i) => i.sheet === "games" || i.sheet === "game_puzzles");

  it("passes a good game and puzzle", () => {
    expect(gameIssues(base())).toEqual([]);
  });
  it("rejects a bad date, bad puzzle data, and a second puzzle for the same day", () => {
    const data = base();
    data.game_puzzles!.push(row(3, { ...data.game_puzzles![0]!.values, puzzle_id: "PUZ00002", puzzle_date: "2026-02-30", puzzle_data: '{"answer":"no"}' }));
    data.game_puzzles!.push(row(4, { ...data.game_puzzles![0]!.values, puzzle_id: "PUZ00003" }));
    const codes = gameIssues(data).map((i) => i.code);
    expect(codes).toContain("invalid_value");
    expect(codes).toContain("invalid_puzzle");
    expect(codes).toContain("duplicate");
  });
  it("does not let a game that is not built be published, but allows it as a draft", () => {
    const data = base();
    data.games!.push(row(3, { ...data.games![0]!.values, game_id: "GAME0002", slug: "four-groups", game_type: "four_groups", status: "published" }));
    expect(gameIssues(data).some((i) => i.code === "unknown_game_type")).toBe(true);
    data.games![1]!.values.status = "draft";
    expect(gameIssues(data)).toEqual([]);
  });
});
