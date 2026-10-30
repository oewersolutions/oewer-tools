import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Layout checks for the ad placements on desktop and mobile. The normal build shows no ads, so these need a preview
// build where every supported placement shows an "Ad space" box (never deployed):
//   OEWER_PREVIEW_ADS=1 OEWER_PREVIEW_ALL_TOOLS=1 npm run build && ADS_E2E=1 npx playwright test e2e/ads.spec.ts
test.skip(!process.env.ADS_E2E, "needs a build with OEWER_PREVIEW_ADS=1");

const slots = (page: Page) => page.locator("aside[aria-label='Advertisement']");

const PAGES: [path: string, placements: string[]][] = [
  ["/", ["top_banner", "mid_page"]],
  ["/tools/finance-calculators/", ["list_bottom"]],
  ["/tools/finance-calculators/emi-calculator/", ["below_tool"]],
  ["/blog/", ["list_bottom"]],
];

for (const [path, placements] of PAGES) {
  test(`${path} shows ${placements.join(" and ")}, labelled, inside the screen and not sticky`, async ({ page }) => {
    await page.goto(path);
    await expect(slots(page)).toHaveCount(placements.length);
    for (const name of placements) {
      const slot = page.locator(`aside[data-ad-placement='${name}']`);
      await slot.scrollIntoViewIfNeeded();
      await expect(slot).toContainText("Advertisement");
      const box = (await slot.boundingBox())!;
      const width = page.viewportSize()!.width;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeGreaterThanOrEqual(250); // space is reserved, so nothing jumps when an ad loads
      expect(await slot.evaluate((el) => getComputedStyle(el).position)).toBe("static");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("the tool ad is below the tool and far from its buttons and fields", async ({ page }) => {
  await page.goto("/tools/finance-calculators/emi-calculator/");
  const tool = (await page.locator("section[data-component]").boundingBox())!;
  const slot = (await slots(page).boundingBox())!;
  expect(slot.y).toBeGreaterThanOrEqual(tool.y + tool.height + 32);
  const controls = await page.locator("section[data-component] :is(button, input, select, a, textarea)").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ bottom: r.bottom + window.scrollY })));
  const slotTop = slot.y + (await page.evaluate(() => window.scrollY));
  for (const c of controls) expect(slotTop - c.bottom).toBeGreaterThanOrEqual(32);
});

test("an article ad sits between paragraphs, not at the start or end, and never right after a heading", async ({ page }) => {
  await page.goto("/blog/gst-explained-add-and-remove-gst/"); // a long article; short ones (under 6 blocks) get no ad
  const body = page.locator("div.space-y-5").filter({ has: page.locator("aside[data-ad-placement='in_article']") });
  const children = body.locator("> *");
  const count = await children.count();
  const index = await children.evaluateAll((els) => els.findIndex((e) => e.matches("aside[data-ad-placement='in_article']")));
  expect(index).toBeGreaterThan(1);
  expect(index).toBeLessThan(count - 2);
  expect(await children.nth(index - 1).evaluate((e) => e.tagName)).not.toBe("H2");
});

test("the ad boxes have no accessibility violations", async ({ page }) => {
  for (const [path] of PAGES) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations, path).toEqual([]);
  }
});

test("no ads on the legal pages, the contact page or the admin", async ({ page }) => {
  for (const path of ["/about/", "/contact/", "/privacy-policy/", "/terms/", "/admin/"]) {
    await page.goto(path);
    await expect(slots(page), path).toHaveCount(0);
  }
});
