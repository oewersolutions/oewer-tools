import { expect, test } from "./fixtures";
import { upload } from "./helpers";
import { builtPaths } from "./pages";

// Tool pages only exist once a tool is published in the workbook; each test skips until then.
const published = new Set(builtPaths());
const EMI = "/tools/finance-calculators/emi-calculator/";
const SIP = "/tools/finance-calculators/sip-calculator/";
const LUMPSUM = "/tools/finance-calculators/lumpsum-calculator/";
const COMPOUND = "/tools/finance-calculators/compound-interest-calculator/";
const SIMPLE = "/tools/finance-calculators/simple-interest-calculator/";
const RD = "/tools/finance-calculators/rd-calculator/";
const DISCOUNT = "/tools/finance-calculators/discount-calculator/";
const AGE = "/tools/utilities/age-calculator/";
const DAYS = "/tools/utilities/days-between-dates/";
const UNITS = "/tools/utilities/unit-converter/";
const PASSWORD = "/tools/utilities/password-generator/";
const BASE64 = "/tools/developer-tools/base64-encoder-decoder/";
const URLTOOL = "/tools/developer-tools/url-encoder-decoder/";
const UUID = "/tools/developer-tools/uuid-generator/";
const HASH = "/tools/developer-tools/hash-generator/";
const COLOUR = "/tools/developer-tools/colour-converter/";
const TIMESTAMP = "/tools/developer-tools/timestamp-converter/";
const REGEX = "/tools/developer-tools/regex-tester/";
const JWT = "/tools/developer-tools/jwt-decoder/";
const SAMPLE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
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

test("compound interest calculator shows the amount and a year-by-year table", async ({ page }) => {
  test.skip(!published.has(COMPOUND), "Compound interest calculator is not published");
  await page.goto(COMPOUND);
  await page.getByLabel("Principal (₹)").fill("100000");
  await page.getByLabel("Interest rate (% per year)").fill("8");
  await page.getByLabel("Time period (years)").fill("10");
  await expect(page.getByRole("status")).toContainText("2,15,892");
  await expect(page.getByRole("region", { name: "Year by year" }).getByRole("row")).toHaveCount(11); // header + 10 years
  await page.getByLabel("Interest added").selectOption("12");
  await expect(page.getByRole("status")).toContainText("2,21,964");
  await page.getByLabel("Time period (years)").fill("51");
  await expect(page.getByText("Time period cannot be more than 50.")).toBeVisible();
});

test("simple interest calculator handles years, months and days", async ({ page }) => {
  test.skip(!published.has(SIMPLE), "Simple interest calculator is not published");
  await page.goto(SIMPLE);
  await page.getByLabel("Principal (₹)").fill("100000");
  await page.getByLabel("Interest rate (% per year)").fill("8");
  await page.getByLabel("Time period").fill("3");
  await expect(page.getByRole("status")).toContainText("24,000");
  await page.getByLabel("Time unit").selectOption("months");
  await page.getByLabel("Time period").fill("6");
  await expect(page.getByRole("status")).toContainText("4,000");
  await page.getByLabel("Time period").fill("abc");
  await expect(page.getByText("Time period must be a number.")).toBeVisible();
});

test("RD calculator shows the maturity amount and rejects bad input", async ({ page }) => {
  test.skip(!published.has(RD), "RD calculator is not published");
  await page.goto(RD);
  await page.getByLabel("Monthly deposit (₹)").fill("2000");
  await page.getByLabel("Interest rate (% per year)").fill("7");
  await page.getByLabel("Tenure", { exact: true }).fill("2");
  await expect(page.getByRole("status")).toContainText("51,639.56");
  await expect(page.getByRole("status")).toContainText("48,000");
  await page.getByLabel("Tenure unit").selectOption("months");
  await page.getByLabel("Tenure", { exact: true }).fill("6.5");
  await expect(page.getByText("Tenure must be a whole number.")).toBeVisible();
});

test("discount calculator combines two discounts", async ({ page }) => {
  test.skip(!published.has(DISCOUNT), "Discount calculator is not published");
  await page.goto(DISCOUNT);
  await page.getByLabel("Original price (₹)").fill("1000");
  await page.getByLabel("Discount (%)", { exact: true }).fill("20");
  await page.getByLabel(/Second discount/).fill("10");
  await expect(page.getByRole("status")).toContainText("720");
  await expect(page.getByRole("status")).toContainText("28%");
  await page.getByLabel(/Second discount/).fill("");
  await expect(page.getByRole("status")).toContainText("800");
  await page.getByLabel("Discount (%)", { exact: true }).fill("101");
  await expect(page.getByText("Discount cannot be more than 100.")).toBeVisible();
});

test("age calculator gives years, months and days, and the next birthday", async ({ page }) => {
  test.skip(!published.has(AGE), "Age calculator is not published");
  await page.goto(AGE);
  await page.getByLabel("Date of birth").fill("1990-05-15");
  await page.getByLabel("Age on").fill("2026-10-31");
  await expect(page.getByRole("status")).toContainText("36 years, 5 months, 16 days");
  await expect(page.getByRole("status")).toContainText("13,318");
  await expect(page.getByRole("status")).toContainText("15 May 2027");
  await page.getByLabel("Date of birth").fill("2000-02-29");
  await page.getByLabel("Age on").fill("2025-02-28");
  await expect(page.getByRole("status")).toContainText("25 years, 0 months, 0 days");
  await page.getByLabel("Date of birth").fill("2030-01-01");
  await expect(page.getByText("The date of birth cannot be after the date you are measuring to.")).toBeVisible();
});

test("days between dates counts the gap and, on request, the end date", async ({ page }) => {
  test.skip(!published.has(DAYS), "Days between dates is not published");
  await page.goto(DAYS);
  await page.getByLabel("Start date").fill("2026-01-01");
  await page.getByLabel("End date", { exact: true }).fill("2026-01-10");
  await expect(page.getByRole("status")).toContainText("9");
  await expect(page.getByRole("status")).toContainText("Days between");
  await page.getByLabel(/Count the end date too/).check();
  await expect(page.getByRole("status")).toContainText("Days, including the end date");
  await expect(page.getByRole("status")).toContainText("10");
  await page.getByLabel("Start date").fill("2026-12-31");
  await expect(page.getByRole("status")).toContainText("Counted from");
});

test("unit converter shows a value in every unit of the chosen measure", async ({ page }) => {
  test.skip(!published.has(UNITS), "Unit converter is not published");
  await page.goto(UNITS);
  await page.getByLabel("Value").fill("1");
  await page.getByLabel("From", { exact: true }).selectOption("in");
  await page.getByLabel("To", { exact: true }).selectOption("mm");
  await expect(page.getByRole("status")).toContainText("25.4 mm");
  await expect(page.getByRole("status")).toContainText("2.54 cm");
  await page.getByLabel("Measure").selectOption("temperature");
  await page.getByLabel("Value").fill("98.6");
  await page.getByLabel("From", { exact: true }).selectOption("f");
  await page.getByLabel("To", { exact: true }).selectOption("c");
  await expect(page.getByRole("status")).toContainText("37 °C");
  await expect(page.getByRole("status")).toContainText("310.15 K");
  await page.getByLabel("Value").fill("-500"); // in Fahrenheit, which is below absolute zero
  await expect(page.getByText("That is below absolute zero")).toBeVisible();
  await page.getByLabel("Measure").selectOption("area");
  await page.getByLabel("Value").fill("1");
  await page.getByLabel("From", { exact: true }).selectOption("acre");
  await page.getByLabel("To", { exact: true }).selectOption("sqft");
  await expect(page.getByRole("status")).toContainText("43,560 ft²");
});

test("password generator follows the length and the kinds of character chosen", async ({ page }) => {
  test.skip(!published.has(PASSWORD), "Password generator is not published");
  await page.goto(PASSWORD);
  const shown = page.getByTestId("generated-password");
  await expect(shown).toHaveText(/^.{16}$/);
  await page.getByLabel("Length").fill("30");
  await expect(shown).toHaveText(/^.{30}$/);
  await page.getByLabel("Uppercase letters (A–Z)").uncheck();
  await page.getByLabel("Symbols (!@#$…)").uncheck();
  await page.getByLabel("Numbers (0–9)").uncheck();
  await expect(shown).toHaveText(/^[a-z]{30}$/);
  await expect(page.getByRole("status")).toContainText("Very strong");
  const before = await shown.textContent();
  await page.getByRole("button", { name: "Generate another" }).click();
  await expect(shown).not.toHaveText(before ?? "");
  await page.getByLabel("Lowercase letters (a–z)").uncheck();
  await expect(page.getByText("Choose at least one kind of character.")).toBeVisible();
  await page.getByLabel("Lowercase letters (a–z)").check();
  await page.getByLabel("Numbers (0–9)").check();
  await page.getByLabel(/Avoid look-alike characters/).check();
  await expect(shown).toHaveText(/^[a-km-np-z2-9]{30}$/);
  await page.getByLabel("Length").fill("5");
  await expect(page.getByText("Length cannot be less than 8.")).toBeVisible();
});

test("Base64 tool encodes, decodes and explains bad input", async ({ page }) => {
  test.skip(!published.has(BASE64), "Base64 tool is not published");
  await page.goto(BASE64);
  await page.getByLabel("Your text").fill("hello नमस्ते");
  await expect(page.getByLabel("Base64", { exact: true })).toHaveValue("aGVsbG8g4KSo4KSu4KS44KWN4KSk4KWH");
  await page.getByLabel("Alphabet").selectOption("url-unpadded");
  await page.getByLabel("Your text").fill("??>>");
  await expect(page.getByLabel("Base64", { exact: true })).toHaveValue("Pz8-Pg");
  await page.getByLabel("Action").selectOption("decode");
  await page.getByLabel("Your Base64").fill("Zm9vYmFy");
  await expect(page.getByLabel("Decoded text")).toHaveValue("foobar");
  await page.getByLabel("Your Base64").fill("Zm9v!");
  await expect(page.getByText("This is not valid Base64.")).toBeVisible();
  await page.getByLabel("Your Base64").fill("/9j/4AAQ");
  await expect(page.getByText("does not decode to text")).toBeVisible();
});

test("URL tool encodes parts, whole addresses and form data, and decodes", async ({ page }) => {
  test.skip(!published.has(URLTOOL), "URL tool is not published");
  await page.goto(URLTOOL);
  await page.getByLabel("Your text or URL").fill("a=1&b=Jack & Jill");
  await expect(page.getByLabel("Encoded")).toHaveValue("a%3D1%26b%3DJack%20%26%20Jill");
  await page.getByLabel("What is it?").selectOption("form");
  await page.getByLabel("Your text or URL").fill("a b+c");
  await expect(page.getByLabel("Encoded")).toHaveValue("a+b%2Bc");
  await page.getByLabel("What is it?").selectOption("url");
  await page.getByLabel("Your text or URL").fill("https://example.com/a b?q=é");
  await expect(page.getByLabel("Encoded")).toHaveValue("https://example.com/a%20b?q=%C3%A9");
  await page.getByLabel("Action").selectOption("decode");
  await page.getByLabel("Your encoded text").fill("100%");
  await expect(page.getByText("This is not valid percent-encoding.")).toBeVisible();
});

test("UUID tool makes the number asked for in the style chosen", async ({ page }) => {
  test.skip(!published.has(UUID), "UUID tool is not published");
  await page.goto(UUID);
  const box = page.getByLabel("Your UUIDs");
  await expect(box).toHaveValue(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\n?){5}$/);
  await page.getByLabel("How many").fill("2");
  await page.getByLabel("Hyphens").uncheck();
  await page.getByLabel("Uppercase").check();
  await expect(box).toHaveValue(/^[0-9A-F]{32}\n[0-9A-F]{32}$/);
  await page.getByLabel("Version").selectOption("7");
  await expect(box).toHaveValue(/^[0-9A-F]{12}7[0-9A-F]{3}[89AB][0-9A-F]{15}\n/);
  await page.getByLabel("How many").fill("101");
  await expect(page.getByText("Count cannot be more than 100.")).toBeVisible();
});

test("hash tool gives the known SHA values and checks a pasted hash", async ({ page }) => {
  test.skip(!published.has(HASH), "Hash tool is not published");
  await page.goto(HASH);
  await page.getByLabel("Your text").fill("abc");
  await expect(page.locator("dd", { hasText: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" })).toBeVisible();
  await expect(page.locator("dd", { hasText: "a9993e364706816aba3e25717850c26c9cd0d89d" })).toBeVisible();
  await page.getByLabel(/Compare with a hash/).fill("BA7816BF 8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD");
  await expect(page.getByText("Matches the SHA-256 hash of your text.")).toBeVisible();
  await page.getByLabel(/Compare with a hash/).fill("deadbeef");
  await expect(page.getByText("Does not match any of the hashes above.")).toBeVisible();
});

test("colour converter converts between formats and reports contrast", async ({ page }) => {
  test.skip(!published.has(COLOUR), "Colour converter is not published");
  await page.goto(COLOUR);
  const status = page.getByRole("status");
  await expect(status).toContainText("rgb(26, 115, 232)");
  await expect(status).toContainText("hsl(214, 82%, 51%)");
  await page.getByLabel("Type a colour").fill("hsl(0, 100%, 50%)");
  await expect(status).toContainText("#ff0000");
  await page.getByLabel("Type a colour").fill("#767676");
  await expect(status).toContainText("4.54:1");
  await page.getByLabel("Type a colour").fill("nonsense");
  await expect(page.getByText("That is not a colour I can read.")).toBeVisible();
});

test("timestamp converter reads seconds and milliseconds and builds a timestamp", async ({ page }) => {
  test.skip(!published.has(TIMESTAMP), "Timestamp converter is not published");
  await page.goto(TIMESTAMP);
  await page.getByLabel("Unix timestamp", { exact: true }).fill("1700000000");
  const status = page.getByRole("status");
  await expect(status).toContainText("22:13:20");
  await expect(status).toContainText("03:43:20");
  await expect(status).toContainText("2023-11-14T22:13:20.000Z");
  await page.getByLabel("Unix timestamp", { exact: true }).fill("1700000000000");
  await expect(status).toContainText("2023-11-14T22:13:20.000Z");
  await page.getByLabel("Unix timestamp", { exact: true }).fill("abc");
  await expect(page.getByText("Enter a timestamp as a number")).toBeVisible();
  await page.getByLabel("Convert", { exact: true }).selectOption("to-timestamp");
  await page.getByLabel("Date and time", { exact: true }).fill("2023-11-14T22:13:20");
  await expect(status).toContainText("1700000000");
});

test("regex tester shows matches and groups, explains errors, and stops a runaway pattern", async ({ page, browserName }) => {
  test.skip(!published.has(REGEX), "Regex tester is not published");
  await page.goto(REGEX);
  await expect(page.getByText("2 matches")).toBeVisible();
  await expect(page.getByRole("region", { name: "Match details" })).toContainText("2026-03-14");
  await page.getByLabel("Regular expression").fill("(");
  await expect(page.getByText("Not a valid expression")).toBeVisible();
  // Safari's engine runs this classic slow pattern quickly, so the stop-after-a-timeout step is only checked where the pattern really is slow.
  if (browserName === "chromium") {
    await page.getByLabel("Regular expression").fill("(a+)+$");
    await page.getByLabel("Text to test").fill("a".repeat(60) + "!");
    await expect(page.getByText("took too long and was stopped")).toBeVisible({ timeout: 10_000 });
  }
  await page.getByLabel("Regular expression").fill("a");
  await page.getByLabel("Text to test").fill("banana");
  await page.getByLabel(/g: find all/).uncheck();
  await expect(page.getByText("1 match")).toBeVisible();
});

test("JWT decoder shows the parts and the times, and warns about unsigned tokens", async ({ page }) => {
  test.skip(!published.has(JWT), "JWT decoder is not published");
  await page.goto(JWT);
  await page.getByLabel("Your token").fill(SAMPLE_JWT);
  await expect(page.getByText("Decoded. The signature has not been checked.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Payload" })).toContainText("John Doe");
  await expect(page.getByRole("region", { name: "Header" })).toContainText("HS256");
  await expect(page.getByRole("region", { name: "Times in the token" })).toContainText("18 Jan 2018");
  const none = Buffer.from('{"alg":"none"}').toString("base64url") + "." + Buffer.from('{"exp":1}').toString("base64url") + ".";
  await page.getByLabel("Your token").fill(none);
  await expect(page.getByText("this token is not signed")).toBeVisible();
  await expect(page.getByText("Expired")).toBeVisible();
  await page.getByLabel("Your token").fill("a.b");
  await expect(page.getByText("three parts separated by dots")).toBeVisible();
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
