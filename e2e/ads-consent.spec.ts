import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// Needs a build with ads switched on in a copy of the workbook (never the real one) and analytics on:
//   npx tsx scripts/make-ads-test-workbook.ts /tmp/ads-test.xlsx
//   OEWER_WORKBOOK=/tmp/ads-test.xlsx NEXT_PUBLIC_ANALYTICS_ID=G-TEST123456 npm run build
//   ADS_CONSENT_E2E=1 npx playwright test e2e/ads-consent.spec.ts
// Google's scripts are replaced with empty ones, so nothing leaves the machine.
test.skip(!process.env.ADS_CONSENT_E2E, "needs a build with ads switched on");

const TOOL = "/tools/finance-calculators/emi-calculator/";
const CLIENT = "ca-pub-1234567890123456";

test("ads, ads.txt and the account tag are all tied to the visitor's choice", async ({ page, request }) => {
  const adHits: string[] = [];
  const gaHits: string[] = [];
  await page.route("https://pagead2.googlesyndication.com/**", (r) => {
    adHits.push(r.request().url());
    return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });
  await page.route("https://www.googletagmanager.com/**", (r) => {
    gaHits.push(r.request().url());
    return r.fulfill({ status: 200, contentType: "text/javascript", body: "" });
  });

  expect(await (await request.get("/ads.txt")).text()).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");

  await page.goto(TOOL);
  await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute("content", CLIENT);
  const banner = page.getByRole("region", { name: "Privacy choices" });
  await expect(banner).toBeVisible();
  await expect(page.locator("aside[data-ad-placement]")).toHaveCount(0); // no empty box before a choice
  await page.waitForTimeout(500);
  expect([adHits, gaHits]).toEqual([[], []]);

  await banner.getByRole("button", { name: "Decline all" }).click();
  await page.reload();
  await expect(banner).toHaveCount(0);
  await expect(page.locator("aside[data-ad-placement]")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect([adHits, gaHits]).toEqual([[], []]);

  await page.getByRole("button", { name: "Privacy choices" }).click();
  await expect(banner).toBeFocused();
  await banner.getByLabel(/^Ads\./).check();
  await banner.getByRole("button", { name: "Save my choices" }).click();
  await expect(page.locator("aside[data-ad-placement='below_tool']")).toBeVisible();
  await expect.poll(() => adHits.length).toBe(1);
  expect(adHits[0]).toBe(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`);
  expect(gaHits).toEqual([]); // analytics stayed declined
  const ins = page.locator("aside[data-ad-placement='below_tool'] ins.adsbygoogle");
  await expect(ins).toHaveAttribute("data-ad-slot", "1234567890");
  await expect(ins).toHaveAttribute("data-ad-client", CLIENT);
  const state = await page.evaluate(() => {
    const a = (window as unknown as { adsbygoogle: unknown[] & { requestNonPersonalizedAds?: number } }).adsbygoogle;
    return { nonPersonalised: a.requestNonPersonalizedAds, asked: a.length };
  });
  expect(state).toEqual({ nonPersonalised: 1, asked: 1 });

  await page.getByLabel("Loan amount (₹)").fill("500000"); // the tool works with an ad on the page
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Privacy choices" }).click(); // withdraw: the page reloads and the ad is gone
  await banner.getByLabel(/^Ads\./).uncheck();
  await banner.getByRole("button", { name: "Save my choices" }).click();
  await expect(page.locator("aside[data-ad-placement]")).toHaveCount(0);
  await page.waitForLoadState("load");
  expect(await page.evaluate(() => localStorage.getItem("oewer-consent"))).toContain('"ads":false');
});

test("allow all turns both on, and the choices panel is usable on a phone and passes the accessibility checks", async ({ page }) => {
  const adHits: string[] = [];
  const gaHits: string[] = [];
  await page.route("https://pagead2.googlesyndication.com/**", (r) => (adHits.push(r.request().url()), r.fulfill({ status: 200, body: "" })));
  await page.route("https://www.googletagmanager.com/**", (r) => (gaHits.push(r.request().url()), r.fulfill({ status: 200, body: "" })));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(TOOL);
  const banner = page.getByRole("region", { name: "Privacy choices" });
  await expect(banner).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  const box = (await banner.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.height).toBeLessThan(667 * 0.7); // never takes over the whole screen

  await banner.getByRole("button", { name: "Allow all" }).click();
  await expect.poll(() => adHits.length).toBe(1);
  await expect.poll(() => gaHits.length).toBeGreaterThan(0);
});
