import { expect, test } from "./fixtures";

// The games pick the day's puzzle from the visitor's own date, so these tests fix the clock. 1 November 2026 is the
// first puzzle (the answer is PLANT), and every build includes it.
const DAY = new Date("2026-11-01T10:00:00");

test("the Games menu leads to a hub that lists the playable games", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Games" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Daily word games" })).toBeVisible();
  const card = page.getByRole("link", { name: /Word Guess/ }).first();
  await expect(card).toHaveAttribute("href", /\/games\/word-guess\/$/);
  await expect(page.getByRole("link", { name: /Four Groups/ }).first()).toHaveAttribute("href", /\/games\/four-groups\/$/);
  await expect(page.getByRole("link", { name: /Word Trail/ }).first()).toHaveAttribute("href", /\/games\/word-trail\/$/);
});

test("Word Guess: rejects a non-word, marks letters, wins, and remembers the result", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/word-guess/");
  const board = page.getByRole("grid", { name: "Your guesses" });
  await expect(board).toBeVisible();
  await expect(page.getByText("No. 1 · 2026-11-01")).toBeVisible();

  await page.keyboard.type("zzzzz");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("ZZZZZ is not in the word list.");

  for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("crane");
  await page.keyboard.press("Enter");
  // CRANE against PLANT: C and R are absent, A and N are in the right place, E is absent
  await expect(board.getByRole("gridcell").nth(0)).toHaveAttribute("aria-label", "C, not in the word");
  await expect(board.getByRole("gridcell").nth(2)).toHaveAttribute("aria-label", "A, in the right place");
  await expect(board.getByRole("gridcell").nth(3)).toHaveAttribute("aria-label", "N, in the right place");

  await page.keyboard.type("plant");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Solved in 2 of 6")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy my result" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Solved in 2 of 6")).toBeVisible(); // saved in this browser
  await expect(board.getByRole("gridcell").nth(9)).toHaveAttribute("aria-label", "T, in the right place");
});

test("Word Guess works with the on-screen keyboard", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/word-guess/");
  for (const letter of "PLANT") await page.getByRole("button", { name: letter, exact: true }).click();
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByText("Solved in 1 of 6")).toBeVisible();
});

test("Word Guess makes no request to any other site while it is played", async ({ page }) => {
  const origin = new URL(page.url() === "about:blank" ? "http://localhost:4174" : page.url()).origin;
  const other: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (/^https?:/.test(r.url()) && u.origin !== origin && !/googlesyndication|doubleclick|adtrafficquality|google\.com/.test(u.hostname)) other.push(r.url());
  });
  await page.clock.install({ time: DAY });
  await page.goto("/games/word-guess/");
  await page.keyboard.type("plant");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Solved in 1 of 6")).toBeVisible();
  expect(other).toEqual([]);
});

// Four Groups: the first puzzle (1 November 2026) is fruits, fielding positions, ___ fish and words that start with a body part.
const FRUITS = ["MANGO", "GUAVA", "PAPAYA", "LYCHEE"];
const FIELDING = ["SLIP", "GULLY", "POINT", "COVER"];
const FISH = ["GOLD", "CAT", "SWORD", "JELLY"];
const BODY = ["ARMOUR", "LEGEND", "SHINGLE", "CHINA"];

async function pick(page: import("@playwright/test").Page, words: string[]) {
  for (const w of words) await page.getByRole("button", { name: w, exact: true }).click();
}

test("Four Groups: says one away, finds groups, and finishes with no mistakes", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/four-groups/");
  await expect(page.getByText("No. 1 · 2026-11-01")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();

  await pick(page, ["MANGO", "GUAVA", "PAPAYA", "SLIP"]);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toHaveText("One away.");
  await expect(page.getByText("Mistakes left: 3 of 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deselect all" })).toBeDisabled(); // a guess clears the selection

  await pick(page, FRUITS);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toHaveText("Found: Fruits.");
  await expect(page.locator('[data-level="1"]')).toContainText("Easiest");
  await expect(page.getByRole("button", { name: "MANGO", exact: true })).toHaveCount(0);

  for (const words of [FIELDING, FISH, BODY]) {
    await pick(page, words);
    await page.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("Solved with 1 mistake")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy my result" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Solved with 1 mistake")).toBeVisible(); // saved in this browser
});

test("Four Groups: four mistakes end the game and show the groups", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/four-groups/");
  const wrong = [
    ["MANGO", "SLIP", "GOLD", "ARMOUR"],
    ["GUAVA", "GULLY", "CAT", "LEGEND"],
    ["PAPAYA", "POINT", "SWORD", "SHINGLE"],
    ["LYCHEE", "COVER", "JELLY", "CHINA"],
  ];
  for (const words of wrong) {
    await pick(page, words);
    await page.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("Better luck tomorrow")).toBeVisible();
  await expect(page.getByText("Fruits", { exact: true })).toBeVisible();
  await expect(page.getByText("Trickiest · not found")).toBeVisible();
});

// Hive Words: the first puzzle (1 November 2026) has O in the middle with A, D, I, R, T and U around it.
test("Hive Words: scores words, finds the pangram and explains refusals", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/hive-words/");
  await expect(page.getByText("No. 1 · 2026-11-01")).toBeVisible();
  await expect(page.getByRole("button", { name: "O, centre letter" })).toBeVisible();

  const word = async (w: string) => {
    await page.keyboard.type(w);
    await page.keyboard.press("Enter");
  };
  await word("oat");
  await expect(page.getByRole("status")).toContainText("Too short");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await word("tart");
  await expect(page.getByRole("status")).toContainText("centre letter, O");
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("z");
  await expect(page.getByRole("status")).toHaveText("That letter is not in the hive.");

  await word("audio");
  await expect(page.getByRole("status")).toHaveText("+5 points.");
  await word("auditor");
  await expect(page.getByRole("status")).toHaveText("Pangram! +14 points.");
  await expect(page.getByText("Audio", { exact: true })).toBeVisible();
  await expect(page.getByText("Auditor (pangram)")).toBeVisible();
  await expect(page.getByText(/Words found: 2 of \d+/)).toBeVisible();
  await word("audio");
  await expect(page.getByRole("status")).toContainText("already found");

  await page.reload();
  await expect(page.getByText(/Words found: 2 of/)).toBeVisible(); // saved in this browser
  await expect(page.getByRole("button", { name: "Copy my result" })).toBeVisible();
});

test("Hive Words works with the on-screen letters", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/hive-words/");
  for (const l of "DOOR") await page.getByRole("button", { name: l === "O" ? "O, centre letter" : l, exact: true }).click();
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("status")).toHaveText("+1 point.");
});

// Mini Crossword: the first puzzle (1 November 2026) is
//   AGO## / ROLL# / MEDIA / #SEND / ##RED   (the across answers cover every white square)
test("Mini Crossword: types answers by clue, marks wrong letters, and is solved", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/mini-crossword/");
  await expect(page.getByText("No. 1 · 2026-11-01")).toBeVisible();
  await expect(page.getByRole("grid", { name: "Crossword grid" })).toBeVisible();
  await expect(page.getByText("1 Across:")).toBeVisible();

  await page.getByRole("button", { name: /^1\. Gone by/ }).click();
  await page.keyboard.type("agx");
  await page.getByRole("button", { name: "Check my letters" }).click();
  await expect(page.getByRole("status")).toContainText("1 letter is wrong");
  await expect(page.getByRole("button", { name: /Row 1, column 3.*wrong/ })).toBeVisible();

  await page.getByRole("button", { name: /^1\. Gone by/ }).click();
  await page.keyboard.type("ago");
  const across: [string, string][] = [["4", "roll"], ["6", "media"], ["8", "send"], ["9", "red"]];
  for (const [n, word] of across) {
    await page.getByRole("button", { name: new RegExp(`^${n}\\. `) }).first().click();
    await page.keyboard.type(word);
  }
  await expect(page.getByText("Solved with 1 check")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy my result" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Solved with 1 check")).toBeVisible(); // saved in this browser
});

test("Mini Crossword: arrow keys move, space turns, backspace rubs out", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/mini-crossword/");
  await page.getByRole("button", { name: /^1\. Gone by/ }).click();
  await page.keyboard.type("a");
  await expect(page.getByRole("button", { name: /Row 1, column 1.*, A$/ })).toBeVisible();
  await page.keyboard.press("Backspace"); // moved on to column 2, which is empty, so this rubs out column 1
  await expect(page.getByRole("button", { name: /Row 1, column 1.*empty/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: /Row 2, column 1/ })).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Space");
  await page.keyboard.type("r");
  await expect(page.getByRole("button", { name: /Row 2, column 1.*, R$/ })).toBeVisible();
});

test("Mini Crossword works with the on-screen keyboard", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/mini-crossword/");
  await page.getByRole("button", { name: /^1\. Gone by/ }).click();
  for (const l of "AGO") await page.getByRole("button", { name: l, exact: true }).click();
  await expect(page.getByRole("button", { name: /Row 1, column 3.*, O$/ })).toBeVisible();
});

// Word Trail: the first puzzle (1 November 2026) is "In the fruit bowl". Squares are numbered from 0, row by row.
const TRAIL: { word: string; cells: number[] }[] = [{"word": "FRUITBOWL", "cells": [32, 37, 36, 42, 43, 44, 45, 46, 47]}, {"word": "MANGO", "cells": [14, 8, 2, 9, 3]}, {"word": "GUAVA", "cells": [6, 13, 7, 0, 1]}, {"word": "LYCHEE", "cells": [38, 31, 30, 24, 18, 12]}, {"word": "APRICOT", "cells": [25, 19, 20, 21, 27, 34, 39]}, {"word": "PEACH", "cells": [5, 4, 11, 16, 10]}, {"word": "CHERRY", "cells": [17, 23, 29, 35, 40, 41]}, {"word": "MELON", "cells": [15, 22, 28, 33, 26]}];

async function trace(page: import("@playwright/test").Page, cells: number[]) {
  for (const c of cells) await page.locator(`[data-cell="${c}"]`).click();
}

test("Word Trail: finds words, the key word, refuses wrong paths, and gives a hint", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/word-trail/");
  await expect(page.getByText("No. 1 · 2026-11-01")).toBeVisible();
  await expect(page.getByText("In the fruit bowl")).toBeVisible();
  await expect(page.getByText("0 of 8 words found")).toBeVisible();

  await trace(page, [0, 1, 2, 3]); // not a word
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toHaveText("Not one of today's words.");

  const mango = TRAIL.find((w) => w.word === "MANGO")!;
  await trace(page, mango.cells);
  await expect(page.getByText("Your word:")).toBeVisible();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toHaveText("MANGO: found.");
  await expect(page.getByText("1 of 8 words found")).toBeVisible();

  const key = TRAIL.find((w) => w.word === "FRUITBOWL")!;
  await trace(page, key.cells);
  await page.locator(`[data-cell="${key.cells.at(-1)}"]`).click(); // tapping the last letter again submits
  await expect(page.getByRole("status")).toContainText("key word");
  await expect(page.getByText("Fruitbowl (key word)")).toBeVisible();

  await page.getByRole("button", { name: "Hint" }).click();
  await expect(page.getByRole("status")).toContainText("outlined");
  await expect(page.getByRole("button", { name: /Hint \(1 used\)/ })).toBeVisible();

  for (const w of TRAIL.filter((w) => w.word !== "MANGO" && w.word !== "FRUITBOWL")) {
    await trace(page, w.cells);
    await page.getByRole("button", { name: "Submit" }).click();
  }
  await expect(page.getByText("Solved with 1 hint")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy my result" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Solved with 1 hint")).toBeVisible(); // saved in this browser
});

test("Word Trail: a word traced backwards counts, and arrow keys move between letters", async ({ page }) => {
  await page.clock.install({ time: DAY });
  await page.goto("/games/word-trail/");
  const mango = TRAIL.find((w) => w.word === "MANGO")!;
  await trace(page, [...mango.cells].reverse());
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toHaveText("MANGO: found.");
  await page.locator('[data-cell="0"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-cell="1"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-cell="7"]')).toBeFocused();
});
