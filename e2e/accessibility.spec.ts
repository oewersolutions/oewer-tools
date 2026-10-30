import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// Safari on a Mac skips links when you press Tab unless "Press Tab to highlight each item" is on (its own default), so
// Tab-through tests only mean something on the Linux build of the engine that CI uses.
const safariOnMac = (browserName: string) => browserName === "webkit" && process.platform === "darwin";
import { builtPaths } from "./pages";

for (const path of builtPaths()) {
  test(`no WCAG A/AA violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test(`has one h1, a landmark main and a lang: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
}

test("skip link is the first focusable element and targets main", async ({ page, browserName }) => {
  test.skip(safariOnMac(browserName), "Safari on a Mac does not Tab to links by default");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await expect(skip).toHaveAttribute("href", "#main");
});

test("search opens from the header, finds things, and closes with Escape", async ({ page }) => {
  await page.goto("/about/");
  await page.getByRole("button", { name: "Search" }).click();
  const dialog = page.getByRole("dialog", { name: "Search" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("searchbox")).toBeFocused(); // typing works straight away
  await dialog.getByRole("searchbox").fill("emi");
  await expect(dialog.getByRole("link", { name: /how emi is calculated/i }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Search" })).toBeFocused(); // focus returns to the button
});

test('the "/" key opens the search, unless you are typing in a field', async ({ page }) => {
  await page.goto("/tools/utilities/word-counter/");
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  await page.keyboard.press("Escape");
  const box = page.getByLabel("Type or paste your text");
  await box.click();
  await page.keyboard.type("a/b");
  await expect(box).toHaveValue("a/b");
  await expect(page.getByRole("dialog", { name: "Search" })).toBeHidden();
});

test("choosing a search result goes to the page and closes the search", async ({ page }) => {
  await page.goto("/about/");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("dialog", { name: "Search" }).getByRole("searchbox").fill("emi calculator");
  await page.getByRole("dialog", { name: "Search" }).getByRole("link", { name: /emi calculator/i }).first().click();
  await expect(page).toHaveURL(/emi-calculator/);
  await expect(page.getByRole("dialog", { name: "Search" })).toBeHidden();
});
