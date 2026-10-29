import { expect, test, type Page } from "@playwright/test";
import { upload } from "./helpers";
import { builtPaths } from "./pages";

// The tools promise that files and text never leave the visitor's device. These tests watch the network
// while each tool is used and fail if anything is sent anywhere, or any request goes to another site.
const published = new Set(builtPaths());

/** Run `action`, and return every http(s) request the page made while it ran and shortly after. */
async function requestsDuring(page: Page, action: () => Promise<void>): Promise<string[]> {
  const seen: string[] = [];
  const listener = (r: { url(): string; method(): string }) => {
    if (/^https?:/.test(r.url())) seen.push(`${r.method()} ${r.url()}`);
  };
  page.on("request", listener);
  await action();
  await page.waitForTimeout(800);
  page.off("request", listener);
  return seen;
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const IMAGE_TOOLS = ["/tools/image-tools/image-compressor/", "/tools/image-tools/image-resizer/", "/tools/image-tools/image-converter/"];
for (const path of IMAGE_TOOLS) {
  test(`choosing and processing an image sends nothing: ${path}`, async ({ page }) => {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(page, async () => {
      await upload(page);
      await expect(page.getByRole("link", { name: "Download image" })).toBeVisible();
    });
    expect(requests).toEqual([]);
  });
}

const TEXT_TOOLS: [path: string, label: string, text: string][] = [
  ["/tools/developer-tools/json-formatter/", "Your JSON", '{"secret":"do not send me"}'],
  ["/tools/utilities/word-counter/", "Type or paste your text", "private words that stay here"],
  ["/tools/utilities/qr-code-generator/", "Text or link", "https://private.example/token=abc123"],
];
for (const [path, label, text] of TEXT_TOOLS) {
  test(`typing text sends nothing: ${path}`, async ({ page }) => {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(page, async () => {
      await page.getByLabel(label).fill(text);
    });
    expect(requests).toEqual([]);
  });
}

test("calculators send nothing while you type", async ({ page }) => {
  const path = "/tools/finance-calculators/emi-calculator/";
  test.skip(!published.has(path), "tool is not published");
  await open(page, path);
  const requests = await requestsDuring(page, async () => {
    await page.getByLabel("Loan amount (₹)").fill("2500000");
    await page.getByLabel("Interest rate (% per year)").fill("8.5");
  });
  expect(requests).toEqual([]);
});

test("every page loads only from its own site, with no uploads", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  for (const path of builtPaths()) {
    const bad: string[] = [];
    const listener = (r: { url(): string; method(): string }) => {
      if (/^https?:/.test(r.url()) && (new URL(r.url()).origin !== origin || !["GET", "HEAD"].includes(r.method()))) bad.push(`${r.method()} ${r.url()}`);
    };
    page.on("request", listener);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    page.off("request", listener);
    expect(bad, path).toEqual([]);
  }
});
