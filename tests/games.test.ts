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
    expect(checkPuzzleData("word_trail", "{}")).toMatch(/not supported yet/);
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
    data.games!.push(row(3, { ...data.games![0]!.values, game_id: "GAME0002", slug: "word-trail", game_type: "word_trail", status: "published" }));
    expect(gameIssues(data).some((i) => i.code === "unknown_game_type")).toBe(true);
    data.games![1]!.values.status = "draft";
    expect(gameIssues(data)).toEqual([]);
  });
});

import { checkGuess, isRepeat, replay, shareText as groupsShare, shuffled, startingOrder } from "../lib/games/four-groups";
import type { FourGroupsData } from "../lib/games/types";

const groups: FourGroupsData = {
  groups: [
    { title: "Fruits", level: 1, words: ["MANGO", "GUAVA", "PAPAYA", "LYCHEE"] },
    { title: "Fielding", level: 2, words: ["SLIP", "GULLY", "POINT", "COVER"] },
    { title: "___ fish", level: 3, words: ["GOLD", "CAT", "SWORD", "JELLY"] },
    { title: "Body parts first", level: 4, words: ["ARMOUR", "LEGEND", "SHINGLE", "CHINA"] },
  ],
};

describe("Four Groups", () => {
  it("tells a group, one away and a wrong guess apart", () => {
    expect(checkGuess(groups, ["LYCHEE", "MANGO", "GUAVA", "PAPAYA"])).toEqual({ kind: "correct", group: 0 });
    expect(checkGuess(groups, ["MANGO", "GUAVA", "PAPAYA", "SLIP"])).toEqual({ kind: "one_away" });
    expect(checkGuess(groups, ["MANGO", "GUAVA", "SLIP", "GOLD"])).toEqual({ kind: "wrong" });
  });
  it("works out the state from the guesses alone", () => {
    const fruit = ["MANGO", "GUAVA", "PAPAYA", "LYCHEE"];
    const wrong = ["MANGO", "SLIP", "GOLD", "CHINA"];
    expect(replay(groups, [])).toEqual({ solved: [], mistakes: 0, state: "playing" });
    expect(replay(groups, [fruit, wrong])).toEqual({ solved: [0], mistakes: 1, state: "playing" });
    expect(replay(groups, [wrong, ["MANGO", "SLIP", "GOLD", "ARMOUR"], ["GUAVA", "SLIP", "CAT", "CHINA"], ["PAPAYA", "GULLY", "CAT", "LEGEND"]]).state).toBe("lost");
    const all = groups.groups.map((g) => g.words);
    expect(replay(groups, all)).toMatchObject({ solved: [0, 1, 2, 3], mistakes: 0, state: "won" });
  });
  it("spots a repeated guess whatever the order", () => {
    expect(isRepeat([["A", "B", "C", "D"]], ["D", "C", "B", "A"])).toBe(true);
    expect(isRepeat([["A", "B", "C", "D"]], ["A", "B", "C", "E"])).toBe(false);
  });
  it("starts in the same order every time for a puzzle, with every word once", () => {
    const a = startingOrder(groups, "2026-11-01");
    expect(startingOrder(groups, "2026-11-01")).toEqual(a);
    expect(startingOrder(groups, "2026-11-02")).not.toEqual(a);
    expect([...a].sort()).toEqual(groups.groups.flatMap((g) => g.words).sort());
    expect([...shuffled(a)].sort()).toEqual([...a].sort());
  });
  it("shares colours and not the words", () => {
    const text = groupsShare("Four Groups", 1, groups, [["MANGO", "GUAVA", "PAPAYA", "SLIP"], ["MANGO", "GUAVA", "PAPAYA", "LYCHEE"]]);
    expect(text).toBe("Four Groups No. 1, not solved\n\n🟨🟨🟨🟩\n🟨🟨🟨🟨");
  });
  it("checks the puzzle data", () => {
    expect(checkPuzzleData("four_groups", JSON.stringify(groups))).toBeNull();
    expect(checkPuzzleData("four_groups", JSON.stringify({ groups: groups.groups.slice(0, 3) }))).toMatch(/four groups/);
    const dup = structuredClone(groups);
    dup.groups[1]!.words[0] = "MANGO";
    expect(checkPuzzleData("four_groups", JSON.stringify(dup))).toMatch(/MANGO is used twice|used twice/);
    const sameLevel = structuredClone(groups);
    sameLevel.groups[1]!.level = 1;
    expect(checkPuzzleData("four_groups", JSON.stringify(sameLevel))).toMatch(/different level/);
    const lower = structuredClone(groups);
    lower.groups[0]!.words[0] = "mango";
    expect(checkPuzzleData("four_groups", JSON.stringify(lower))).toMatch(/capital letters/);
  });
});

import { checkWord, isPangram, points, rankFor, shareText as hiveShare, totalPoints, wordsFor } from "../lib/games/hive-words";
import type { HiveWordsData } from "../lib/games/types";

const hive: HiveWordsData = { center: "O", outer: ["A", "D", "I", "R", "T", "U"], words: ["AUDIO", "AUDITOR", "DOOR", "RADIO", "ROAD", "TOAD", "TOUR", "TRIO", "AUTO", "ROOT"] };

describe("Hive Words", () => {
  it("scores a word and a pangram", () => {
    expect(points(hive, "DOOR")).toBe(1);
    expect(points(hive, "AUDIO")).toBe(5);
    expect(isPangram(hive, "AUDITOR")).toBe(true);
    expect(points(hive, "AUDITOR")).toBe(14);
    expect(totalPoints(hive, ["DOOR", "AUDIO"])).toBe(6);
  });
  it("gives the rank for a share of the points", () => {
    expect(rankFor(0, 100).name).toBe("Beginner");
    expect(rankFor(25, 100).name).toBe("Nice");
    expect(rankFor(70, 100).name).toBe("Hive Master");
    expect(rankFor(0, 0).name).toBe("Beginner");
  });
  it("accepts a word, and says why it refuses the others", () => {
    expect(checkWord(hive, "audio", [])).toEqual({ ok: true, word: "AUDIO", pangram: false, points: 5 });
    expect(checkWord(hive, "auditor", [])).toMatchObject({ ok: true, pangram: true, points: 14 });
    const reason = (w: string, found: string[] = []) => (checkWord(hive, w, found) as { reason: string }).reason;
    expect(reason("oat")).toMatch(/Too short/);
    expect(reason("zoom")).toMatch(/not in the hive/);
    expect(reason("tart")).toMatch(/centre letter, O/);
    expect(reason("audio", ["AUDIO"])).toMatch(/already found/);
    expect(reason("orad")).toMatch(/Not in the word list/);
  });
  it("lists the words a set of letters can make", () => {
    expect(wordsFor("O", ["A", "D", "I", "R", "T", "U"], ["DOOR", "DART", "TO", "DOORS", "ROTA", "AUDITOR"])).toEqual(["AUDITOR", "DOOR", "ROTA"]);
  });
  it("shares the rank and score and not the words", () => {
    expect(hiveShare("Hive Words", 4, hive, ["AUDIO", "AUDITOR"])).toBe("Hive Words No. 4: Amazing\n19 of 31 points, 2 of 10 words, 1 pangram");
  });
  it("checks the puzzle data", () => {
    expect(checkPuzzleData("hive_words", JSON.stringify(hive))).toBeNull();
    expect(checkPuzzleData("hive_words", JSON.stringify({ ...hive, center: "o" }))).toMatch(/centre|center/);
    expect(checkPuzzleData("hive_words", JSON.stringify({ ...hive, outer: ["A", "D", "I", "R", "T", "O"] }))).toMatch(/seven different/);
    expect(checkPuzzleData("hive_words", JSON.stringify({ ...hive, words: [...hive.words.slice(1), "ZOO!"] }))).toMatch(/capital letters/);
    expect(checkPuzzleData("hive_words", JSON.stringify({ ...hive, words: [...hive.words.slice(0, 9), "TART"] }))).toMatch(/centre letter/);
    expect(checkPuzzleData("hive_words", JSON.stringify({ ...hive, words: hive.words.filter((w) => w !== "AUDITOR") }))).toMatch(/uses all seven|at least ten/);
    expect(checkPuzzleData("hive_words", JSON.stringify(hive), new Set(["AUDIO"]))).toMatch(/not in the word list/);
  });
});

import { checkMini, entriesOf, entryAt, isSolved as miniSolved, shareText as miniShare, wrongSquares } from "../lib/games/mini-crossword";
import type { MiniCrosswordData } from "../lib/games/types";

const mini: MiniCrosswordData = {
  grid: ["#MAIN", "CONDO", "ANGER", "STEAM", "TELL#"],
  across: { "1": "Principal, as a road or idea", "5": "Flat in a tower block", "6": "Fury", "7": "What a kettle gives off", "8": "Say, as a story" },
  down: { "1": "Italian city of a famous Carlo, or Cristo", "2": "Heavenly messenger", "3": "Perfect", "4": "Standard or average", "5": "Throw an actor in a play" },
};

describe("Mini Crossword", () => {
  it("numbers the entries the usual way", () => {
    const label = (e: { number: number; direction: string; answer: string }) => `${e.number}${e.direction[0]}:${e.answer}`;
    expect(entriesOf(mini.grid).map(label)).toEqual(["1a:MAIN", "1d:MONTE", "2d:ANGEL", "3d:IDEAL", "4d:NORM", "5a:CONDO", "5d:CAST", "6a:ANGER", "7a:STEAM", "8a:TELL"]);
    expect(entriesOf(mini.grid)[0]).toMatchObject({ number: 1, direction: "across", row: 0, col: 1, length: 4 });
  });
  it("finds the entry a square belongs to", () => {
    const entries = entriesOf(mini.grid);
    expect(entryAt(entries, 0, 3, "across")?.answer).toBe("MAIN");
    expect(entryAt(entries, 0, 0, "across")).toBeUndefined(); // a black square
    expect(entryAt(entries, 2, 1, "down")?.answer).toBe("MONTE");
  });
  it("marks wrong letters and knows when it is solved", () => {
    const full = mini.grid.join("").split("").map((ch) => (ch === "#" ? "" : ch));
    expect(miniSolved(mini.grid, full)).toBe(true);
    const off = [...full];
    off[1] = "Z";
    expect(wrongSquares(mini.grid, off)).toEqual([1]);
    expect(miniSolved(mini.grid, off)).toBe(false);
    expect(wrongSquares(mini.grid, Array(25).fill(""))).toEqual([]); // blanks are not wrong
  });
  it("shares the result without the answers", () => {
    expect(miniShare("Mini Crossword", 3, 0)).toBe("Mini Crossword No. 3: solved with no checks");
    expect(miniShare("Mini Crossword", 3, 2)).toBe("Mini Crossword No. 3: solved with 2 checks");
    expect(miniShare("Mini Crossword", 3, 1)).toBe("Mini Crossword No. 3: solved with 1 check");
  });
  it("accepts a good crossword and explains a bad one", () => {
    expect(checkMini(mini)).toBeNull();
    expect(checkMini({ ...mini, grid: ["#MAIN", "CONDO"] })).toMatch(/grid/);
    expect(checkMini({ ...mini, grid: ["#MAIN", "CONDO", "ANGER", "STEAM", "TELLo"] })).toMatch(/grid/);
    expect(checkMini({ ...mini, across: { ...mini.across, "5": "" } })).toMatch(/clue .*5 across/);
    expect(checkMini({ ...mini, across: { ...mini.across, "6": "Fury or ANGER" } })).toMatch(/gives the answer away/);
    expect(checkMini({ ...mini, down: { ...mini.down, "9": "Extra" } })).toMatch(/not a word in the grid/);
    expect(checkMini({ ...mini, grid: ["##AIN", "CONDO", "ANGER", "STEAM", "TELL#"] })).toMatch(/needs a clue|letter on its own|three letters/);
    expect(checkMini({ ...mini, grid: ["MA###", "CONDO", "ANGER", "STEAM", "TELL#"] })).toMatch(/three letters or more|on its own/);
    expect(checkMini(mini, new Set(["MAIN"]))).toMatch(/not in the word list/);
  });
});
