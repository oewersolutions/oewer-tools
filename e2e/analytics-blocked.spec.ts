import { expect, test, type Page } from "@playwright/test";
import { upload } from "./helpers";

// The site must work exactly the same when analytics cannot run: an ad blocker, Google down or slow, or a browser
// that blocks storage. Like consent.spec.ts these need a build with analytics switched on:
//   NEXT_PUBLIC_ANALYTICS_ID=G-TEST123456 npm run build && CONSENT_E2E=1 npx playwright test e2e/analytics-blocked.spec.ts
test.skip(!process.env.CONSENT_E2E, "needs a build with NEXT_PUBLIC_ANALYTICS_ID set");

const GOOGLE = "https://www.googletagmanager.com/**";
/** Route Google's script and count how often the page asked for it, so a test proves the block really happened. */
async function routeGoogle(page: Page, handler: Parameters<Page["route"]>[1]) {
  const hits = { count: 0 };
  await page.route(GOOGLE, (route, request) => {
    hits.count++;
    return handler(route, request);
  });
  return hits;
}
const accepted = () => localStorage.setItem("oewer-consent", JSON.stringify({ analytics: true }));

/** Collect anything that would show a visitor, or a console, that something broke. */
function watchErrors(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // The browser itself logs the failed request for a blocked script; that is the block, not a site error.
    if (m.type() === "error" && !/googletagmanager|ERR_BLOCKED|ERR_FAILED|ERR_CONNECTION|Failed to load resource/i.test(m.text())) problems.push(`console: ${m.text()}`);
  });
  return problems;
}

/** Use the tools that matter most and check they work. */
async function useTheSite(page: Page, problems: string[]) {
  await page.goto("/tools/finance-calculators/emi-calculator/");
  await page.getByLabel("Loan amount (₹)").fill("500000");
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();
  await page.goto("/tools/utilities/word-counter/");
  await page.getByLabel("Type or paste your text").fill("one two three");
  await expect(page.getByText("Words").first()).toBeVisible();
  await page.goto("/tools/image-tools/image-compressor/");
  await upload(page);
  await expect(page.getByRole("link", { name: "Download image" })).toBeVisible();
  await page.goto("/blog/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(problems).toEqual([]);
}

test("an ad blocker stops the Google script: the site works and shows no errors", async ({ page }) => {
  const problems = watchErrors(page);
  const hits = await routeGoogle(page, (r) => r.abort("blockedbyclient"));
  await page.addInitScript(accepted);
  await useTheSite(page, problems);
  expect(hits.count).toBeGreaterThan(0);
});

test("Google answering with an error does not break anything", async ({ page }) => {
  const problems = watchErrors(page);
  const hits = await routeGoogle(page, (r) => r.fulfill({ status: 503, body: "unavailable" }));
  await page.addInitScript(accepted);
  await useTheSite(page, problems);
  expect(hits.count).toBeGreaterThan(0);
});

test("a Google script that never arrives does not hold up the page", async ({ page }) => {
  const problems = watchErrors(page);
  const hits = await routeGoogle(page, () => new Promise(() => undefined)); // never answers
  await page.addInitScript(accepted);
  const started = Date.now();
  await page.goto("/tools/finance-calculators/emi-calculator/", { waitUntil: "load" });
  await page.getByLabel("Loan amount (₹)").fill("500000");
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(5000);
  expect(hits.count).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test("a script that loads but breaks (no gtag) is harmless", async ({ page }) => {
  const problems = watchErrors(page);
  const hits = await routeGoogle(page, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "window.gtag = undefined; window.dataLayer = undefined;" }));
  await page.addInitScript(accepted);
  await useTheSite(page, problems);
  expect(hits.count).toBeGreaterThan(0);
});

test("a browser that blocks storage: the banner shows, the choice works for the visit, nothing throws", async ({ page }) => {
  const problems = watchErrors(page);
  await page.route(GOOGLE, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.goto("/tools/finance-calculators/emi-calculator/");
  const banner = page.getByRole("region", { name: "Analytics choice" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Decline" }).click();
  await expect(banner).toHaveCount(0);
  await page.getByLabel("Loan amount (₹)").fill("500000");
  await expect(page.getByText("Monthly EMI", { exact: true })).toBeVisible();
  expect(problems).toEqual([]);
});

test("without consent, blocking changes nothing because nothing was ever asked of Google", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (r) => /googletagmanager|google-analytics/.test(r.url()) && asked.push(r.url()));
  const problems = watchErrors(page);
  await page.goto("/tools/utilities/word-counter/");
  await page.getByLabel("Type or paste your text").fill("hello there");
  await expect(page.getByText("Words").first()).toBeVisible();
  expect(asked).toEqual([]);
  expect(problems).toEqual([]);
});
