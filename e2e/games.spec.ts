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
  await expect(page.getByRole("link", { name: /Four Groups/ })).toHaveCount(0); // drafts are not shown
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
