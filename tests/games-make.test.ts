import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { puzzleStock } from "../lib/admin/dashboard";
import { addDays, CROSSWORD_SHAPES, fillCrossword, hiveKey, packTrail, pickAnswers, pickHive, seeded, shuffle, stockFrom, trailSubsets } from "../lib/games/make";
import { checkPuzzleData } from "../lib/games/puzzles";
import { entriesOf } from "../lib/games/mini-crossword";
import { checkTrail } from "../lib/games/word-trail";
import type { WorkbookData } from "../lib/workbook";

const lines = (f: string) => readFileSync(f, "utf-8").split("\n").filter(Boolean);
const common = lines("content/games/common-words.txt");
const frequent = lines("content/games/frequent-words.txt");

describe("seeded random and shuffle", () => {
  it("repeats for the same seed and differs for another", () => {
    const a = seeded(1);
    const b = seeded(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seeded(2)()).not.toBe(seeded(1)());
    const x = shuffle([1, 2, 3, 4, 5, 6], seeded(3));
    expect([...x].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("fillCrossword", () => {
  it("fills a shape with real, different words and valid numbering", () => {
    const rng = seeded(7);
    let filled = null;
    for (let i = 0; i < 40 && !filled; i++) filled = fillCrossword(CROSSWORD_SHAPES[i % 2]!, frequent, rng, 1500);
    expect(filled).not.toBeNull();
    const answers = filled!.entries.map((e) => e.answer);
    expect(new Set(answers).size).toBe(answers.length);
    for (const a of answers) expect(frequent).toContain(a);
    expect(filled!.entries.map((e) => e.answer)).toEqual(entriesOf(filled!.grid).map((e) => e.answer));
    // with a clue for every entry the puzzle passes the same check as any other
    const across: Record<string, string> = {};
    const down: Record<string, string> = {};
    for (const e of filled!.entries) (e.direction === "across" ? across : down)[String(e.number)] = "Something";
    expect(checkPuzzleData("mini_crossword", JSON.stringify({ grid: filled!.grid, across, down }), new Set(common))).toBeNull();
  });
  it("gives up with null when the words cannot fill the shape", () => {
    expect(fillCrossword(CROSSWORD_SHAPES[0]!, ["CAT", "DOG"], seeded(1), 200)).toBeNull();
  });
});

describe("Word Trail packing", () => {
  const pool = "WICKET BOWLER BATSMAN STUMPS BAILS YORKER GOOGLY FIELDER INNINGS OVERS".split(" ");
  it("finds word mixes of exactly 48 letters that include the key word", () => {
    const subsets = trailSubsets(["CRICKET", ...pool], "CRICKET", seeded(1));
    expect(subsets.length).toBeGreaterThan(0);
    for (const s of subsets) {
      expect(s[0]).toBe("CRICKET");
      expect(s.join("").length).toBe(48);
    }
  });
  it("lays a mix out as a puzzle that passes the checks", () => {
    const rng = seeded(2);
    let packed = null;
    for (const words of trailSubsets(["CRICKET", ...pool], "CRICKET", rng)) {
      packed = packTrail(words, "CRICKET", rng, 4000);
      if (packed) break;
    }
    expect(packed).not.toBeNull();
    expect(checkTrail({ theme: "On the field", grid: packed!.grid, words: packed!.words })).toBeNull();
  });
  it("refuses words that do not add up to the grid", () => {
    expect(packTrail(["CRICKET", "WICKET"], "CRICKET", seeded(1))).toBeNull();
  });
});

describe("Hive Words and Word Guess pickers", () => {
  it("picks letters that make a valid puzzle, and skips sets already used", () => {
    const rng = seeded(4);
    const pick = pickHive(common, new Set(), rng)!;
    expect(pick.outer).toHaveLength(6);
    const again = pickHive(common, new Set([hiveKey(pick)]), seeded(4))!;
    expect(hiveKey(again)).not.toBe(hiveKey(pick));
  });
  it("picks answers that have not been used", () => {
    const five = frequent.filter((w) => w.length === 5);
    const used = new Set(five.slice(0, 20));
    const picked = pickAnswers(five, used, 10, seeded(1));
    expect(picked).toHaveLength(10);
    expect(picked.some((w) => used.has(w))).toBe(false);
    expect(pickAnswers(["CRANE"], new Set(["CRANE"]), 3, seeded(1))).toEqual([]);
  });
});

describe("how many days of puzzles are ready", () => {
  it("counts days in a row from today", () => {
    const dates = new Set(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-06"]);
    expect(stockFrom(dates, "2026-11-02")).toEqual({ days: 3, nextMissing: "2026-11-05" });
    expect(stockFrom(dates, "2026-11-05")).toEqual({ days: 0, nextMissing: "2026-11-05" }); // none today, whatever comes later
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  const row = (values: Record<string, unknown>) => ({ row: 2, values });
  const data = (): WorkbookData => ({
    games: [
      row({ game_id: "GAME0001", name: "Word Guess", status: "published", sort_order: 1 }),
      row({ game_id: "GAME0002", name: "Four Groups", status: "published", sort_order: 2 }),
      row({ game_id: "GAME0003", name: "Draft game", status: "draft", sort_order: 3 }),
    ],
    game_puzzles: [
      ...Array.from({ length: 7 }, (_, i) => row({ game_id: "GAME0001", status: "published", puzzle_date: addDays("2026-11-02", i) })),
      row({ game_id: "GAME0002", status: "published", puzzle_date: "2026-11-02" }),
      row({ game_id: "GAME0002", status: "draft", puzzle_date: "2026-11-03" }),
    ],
  });
  it("warns for a game with fewer than five days, and for none today", () => {
    expect(puzzleStock(data(), "2026-11-02")).toEqual([
      { game: "Word Guess", days: 7, nextMissing: "2026-11-09", tone: "good" },
      { game: "Four Groups", days: 1, nextMissing: "2026-11-03", tone: "warn" }, // a draft does not count
    ]);
    expect(puzzleStock(data(), "2026-11-20").map((s) => s.tone)).toEqual(["bad", "bad"]);
  });
});
