import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Safari on a Mac skips links when you press Tab unless "Press Tab to highlight each item" is on (its own default), so
// Tab-through tests only mean something on the Linux build of the engine that CI uses.
const safariOnMac = (browserName: string) => browserName === "webkit" && process.platform === "darwin";

// Everything a visitor needs must work without a mouse, and keyboard focus must always be visible.
async function visibleFocus(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return true;
    const s = getComputedStyle(el);
    return (parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== "none") || s.boxShadow !== "none";
  });
}

/** Press Tab until `target` has focus; fails if it is never reached (a keyboard trap or an unreachable control). */
async function tabTo(page: Page, target: ReturnType<Page["locator"]>, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Could not reach the control with the Tab key.");
}

test("every control on the home page can be reached, shows a focus ring, and nothing traps the keyboard", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/");
  const seen = new Set<string>();
  const missing: string[] = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el === document.body ? "BODY" : `${el.tagName}:${el.textContent?.trim().slice(0, 30)}:${el.getAttribute("href") ?? ""}`;
    });
    if (!(await visibleFocus(page))) missing.push(id);
    seen.add(id);
    if (id === "BODY") break; // focus left the page: it moved on instead of getting stuck
  }
  expect(missing, "controls with no visible focus").toEqual([]);
  expect(seen.size, "the tab key keeps moving through different controls").toBeGreaterThan(15);
});

test("the skip link jumps to the main content", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/tools/utilities/word-counter/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("main"))).toBe(true); // next stop is inside the content
});

test("the EMI calculator works with the keyboard alone", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/tools/finance-calculators/emi-calculator/");
  const loan = page.getByLabel("Loan amount (₹)");
  await tabTo(page, loan);
  expect(await visibleFocus(page)).toBe(true);
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("2000000");
  const emi = page.getByText("Monthly EMI", { exact: true }).locator("xpath=following-sibling::dd");
  const before = await emi.innerText();
  await page.keyboard.press("Tab"); // interest rate
  await page.keyboard.press("Tab"); // tenure
  await page.keyboard.press("Tab"); // unit
  await expect(page.getByLabel("Tenure unit")).toBeFocused();
  await page.keyboard.type("M"); // type-ahead picks "Months", with the keyboard
  await expect(page.getByLabel("Tenure unit")).toHaveValue("months");
  expect(await emi.innerText()).not.toBe(before);
});

test("the word counter and its Clear button work with the keyboard alone", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/tools/utilities/word-counter/");
  const box = page.getByLabel("Type or paste your text");
  await tabTo(page, box);
  await page.keyboard.type("one two three");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Clear text" })).toBeFocused();
  expect(await visibleFocus(page)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(box).toHaveValue("");
});

test("site search works with the keyboard and results can be opened with Enter", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/");
  await tabTo(page, page.getByRole("button", { name: "Search" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("searchbox").first()).toBeFocused();
  await page.keyboard.type("emi");
  const result = page.getByRole("dialog", { name: "Search" }).getByRole("link", { name: /emi/i }).first();
  await expect(result).toBeVisible();
  await result.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/tools\/|\/blog\//);
});
