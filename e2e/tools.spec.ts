import { expect, test } from "./fixtures";
import { upload } from "./helpers";
import { builtPaths } from "./pages";

// Tool pages only exist once a tool is published in the workbook; each test skips until then.
const published = new Set(builtPaths());
const EMI = "/tools/finance-calculators/emi-calculator/";
const SIP = "/tools/finance-calculators/sip-calculator/";
const LUMPSUM = "/tools/finance-calculators/lumpsum-calculator/";
const COMPRESSOR = "/tools/image-tools/image-compressor/";
const RESIZER = "/tools/image-tools/image-resizer/";
const CONVERTER = "/tools/image-tools/image-converter/";

test("EMI calculator shows the monthly EMI and rejects bad input", async ({ page }) => {
  test.skip(!published.has(EMI), "EMI calculator is not published");
  await page.goto(EMI);
  await page.getByLabel("Loan amount (₹)").fill("1000000");
  await page.getByLabel("Interest rate (% per year)").fill("10");
  await page.getByLabel("Loan tenure").fill("1");
  await expect(page.getByRole("status")).toContainText("87,915.89");
  await page.getByLabel("Interest rate (% per year)").fill("abc");
  await expect(page.getByText("Interest rate must be a number.")).toBeVisible();
});

test("SIP calculator shows the estimated value and rejects bad input", async ({ page }) => {
  test.skip(!published.has(SIP), "SIP calculator is not published");
  await page.goto(SIP);
  await page.getByLabel("Monthly investment (₹)").fill("5000");
  await page.getByLabel("Expected return (% per year)").fill("12");
  await page.getByLabel("Time period (years)").fill("10");
  await expect(page.getByRole("status")).toContainText("11,61,695");
  await expect(page.getByRole("status")).toContainText("6,00,000");
  await page.getByLabel("Expected return (% per year)").fill("0");
  await expect(page.getByRole("status")).toContainText("6,00,000");
  await page.getByLabel("Time period (years)").fill("abc");
  await expect(page.getByText("Time period must be a number.")).toBeVisible();
});

test("lumpsum calculator shows the estimated value and rejects bad input", async ({ page }) => {
  test.skip(!published.has(LUMPSUM), "Lumpsum calculator is not published");
  await page.goto(LUMPSUM);
  await page.getByLabel("Investment amount (₹)").fill("100000");
  await page.getByLabel("Expected return (% per year)").fill("12");
  await page.getByLabel("Time period (years)").fill("10");
  await expect(page.getByRole("status")).toContainText("3,10,584.82");
  await page.getByLabel("Investment amount (₹)").fill("-5");
  await expect(page.getByText("Investment amount cannot be less than 0.")).toBeVisible();
});

test("image compressor makes a WebP and offers a download", async ({ page, browserName }) => {
  test.skip(!published.has(COMPRESSOR), "Image compressor is not published");
  test.skip(browserName === "webkit", "Safari cannot create WebP files; the tool shows a message instead");
  await page.goto(COMPRESSOR);
  await upload(page);
  await page.getByLabel("Output format").selectOption("image/webp");
  await expect(page.getByRole("link", { name: "Download image" })).toHaveAttribute("download", "sample-compressed.webp");
  await expect(page.getByText("New file")).toBeVisible();
});

test("image resizer keeps proportions and applies the new size", async ({ page }) => {
  test.skip(!published.has(RESIZER), "Image resizer is not published");
  await page.goto(RESIZER);
  await upload(page);
  await expect(page.getByLabel("Width (px)")).toHaveValue("200");
  await page.getByLabel("Width (px)").fill("100");
  await expect(page.getByLabel("Height (px)")).toHaveValue("50");
  await expect(page.getByText("100 × 50")).toBeVisible();
});

test("image converter converts PNG to JPG", async ({ page }) => {
  test.skip(!published.has(CONVERTER), "Image converter is not published");
  await page.goto(CONVERTER);
  await upload(page);
  await page.getByLabel("Convert to").selectOption("image/jpeg");
  await expect(page.getByRole("link", { name: "Download image" })).toHaveAttribute("download", "sample-converted.jpg");
});

test("a file that is not an image is rejected with a message", async ({ page }) => {
  test.skip(!published.has(COMPRESSOR), "Image compressor is not published");
  await page.goto(COMPRESSOR);
  await page.getByLabel(/choose an image/i).setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(page.getByText("Please choose a JPG, PNG or WebP image.")).toBeVisible();
});

const JSON_TOOL = "/tools/developer-tools/json-formatter/";
const QR = "/tools/utilities/qr-code-generator/";
const WORDS = "/tools/utilities/word-counter/";

test("JSON formatter formats, minifies and reports errors with a location", async ({ page }) => {
  test.skip(!published.has(JSON_TOOL), "JSON formatter is not published");
  await page.goto(JSON_TOOL);
  await page.getByLabel("Your JSON").fill('{"b":1,"a":[1,2]}');
  await expect(page.getByText("Valid JSON", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Formatted JSON")).toHaveValue('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
  await page.getByLabel("Sort keys A to Z").check();
  await page.getByLabel("Action").selectOption("minify");
  await expect(page.getByLabel("Minified JSON")).toHaveValue('{"a":[1,2],"b":1}');
  await page.getByLabel("Your JSON").fill('{"a": }');
  await expect(page.getByText(/Invalid JSON/)).toBeVisible();
});

test("word counter counts as you type", async ({ page }) => {
  test.skip(!published.has(WORDS), "Word counter is not published");
  await page.goto(WORDS);
  await page.getByLabel("Type or paste your text").fill("Hello world. This is a test.");
  await expect(page.locator("#word-stats")).toContainText("Words");
  await expect(page.locator("#word-stats div", { hasText: /^Words/ })).toContainText("6");
  await expect(page.locator("#word-stats div", { hasText: /^Sentences/ })).toContainText("2");
});

test("QR generator shows a code and rejects text that is too long", async ({ page }) => {
  test.skip(!published.has(QR), "QR code generator is not published");
  await page.goto(QR);
  await page.getByLabel("Text or link").fill("https://oewer.example/tools");
  await expect(page.getByRole("img", { name: "QR code for your text" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  await page.getByLabel("Text or link").fill("x".repeat(1001));
  await expect(page.getByText(/too long for a QR code/)).toBeVisible();
});

test("tool pages show help, FAQ and related tools", async ({ page }) => {
  test.skip(!published.has(EMI), "EMI calculator is not published");
  await page.goto(EMI);
  await expect(page.getByRole("heading", { name: /^How to use/, level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related tools" })).toBeVisible();
  await expect(page.getByRole("link", { name: /FD Interest Calculator/ })).toBeVisible();
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThanOrEqual(2); // breadcrumbs + FAQ
});
