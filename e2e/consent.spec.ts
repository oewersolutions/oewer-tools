import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// These tests need a build with analytics switched on, which the normal build is not:
//   NEXT_PUBLIC_ANALYTICS_ID=G-TEST123456 npm run build && CONSENT_E2E=1 npx playwright test e2e/consent.spec.ts
// Google's script is replaced with an empty one, so nothing leaves the machine.
test.skip(!process.env.CONSENT_E2E, "needs a build with NEXT_PUBLIC_ANALYTICS_ID set");

const TOOL = "/tools/finance-calculators/emi-calculator/";

async function watchGoogle(page: Page) {
  const asked: string[] = [];
  await page.route("https://www.googletagmanager.com/**", (r) => {
    asked.push(r.request().url());
    return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  return asked;
}
const events = (page: Page) =>
  page.evaluate(() => ((window.dataLayer as unknown[]) ?? []).map((a) => Array.from(a as ArrayLike<unknown>)).filter((a) => a[0] === "event").map((a) => a[1] as string));
const banner = (page: Page) => page.getByRole("region", { name: "Analytics choice" });

test("a first-time visitor is asked, and nothing is loaded until they accept", async ({ page }) => {
  const asked = await watchGoogle(page);
  await page.goto(TOOL);
  await expect(banner(page)).toBeVisible();
  await page.getByLabel("Loan amount (₹)").fill("500000"); // the tool works while the question is open
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");

  await banner(page).getByRole("button", { name: "Allow analytics" }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect.poll(() => asked.length).toBe(1);
  await expect.poll(() => events(page)).toContain("page_view");
  expect(await page.evaluate(() => localStorage.getItem("oewer-consent"))).toContain('"analytics":true');
});

test("declining loads nothing, is remembered, and the site works the same", async ({ page }) => {
  const asked = await watchGoogle(page);
  await page.goto(TOOL);
  await banner(page).getByRole("button", { name: "Decline" }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.getByLabel("Loan amount (₹)").fill("750000");
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();
  await page.reload();
  await expect(banner(page)).toHaveCount(0); // not asked again
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
});

test("the choice can be changed from the footer, and withdrawing stops events and removes the cookies", async ({ page }) => {
  const asked = await watchGoogle(page);
  await page.addInitScript(() => localStorage.setItem("oewer-consent", JSON.stringify({ analytics: true })));
  await page.goto(TOOL);
  await expect.poll(() => asked.length).toBe(1);
  await expect(banner(page)).toHaveCount(0);
  await page.evaluate(() => (document.cookie = "_ga=GA1.1.1.1; path=/"));

  await page.getByRole("button", { name: "Analytics settings" }).click();
  await expect(banner(page)).toBeFocused();
  await expect(banner(page)).toContainText("analytics allowed");
  await banner(page).getByRole("button", { name: "Decline" }).click();
  expect(await page.evaluate(() => document.cookie)).not.toContain("_ga");
  const before = (await events(page)).length;
  await page.getByLabel("Loan amount (₹)").fill("900000");
  await page.waitForTimeout(300);
  expect(await events(page)).toHaveLength(before);
  expect(await page.evaluate(() => localStorage.getItem("oewer-consent"))).toContain('"analytics":false');
});

test("the banner is hidden on the admin page and has no accessibility violations", async ({ page }) => {
  await watchGoogle(page);
  await page.goto(TOOL);
  await expect(banner(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.goto("/admin/");
  await expect(banner(page)).toHaveCount(0);
});
