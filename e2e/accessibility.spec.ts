import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
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

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await expect(skip).toHaveAttribute("href", "#main");
});

test("search is usable by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").or(page.getByRole("combobox")).first().fill("emi");
  await expect(page.getByRole("link", { name: /how emi is calculated/i }).first()).toBeVisible();
});
