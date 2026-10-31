import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { upload } from "./helpers";
import { builtPaths } from "./pages";

// The tools promise that files and text never leave the visitor's device. These tests watch the network
// while each tool is used and fail if anything is sent anywhere, or any request goes to another site.
const published = new Set(builtPaths());

/**
 * Run `action`, and return the requests that could carry the visitor's data out of the page: anything to another
 * site, anything that sends a body, and any address that contains `secret`. Same-site GET and HEAD requests
 * without the secret are ignored: those are the framework prefetching other pages of this site (Safari does it
 * on its own as links come into view), and they carry nothing from the tool.
 */
async function requestsDuring(page: Page, action: () => Promise<void>, secret = ""): Promise<string[]> {
  const origin = new URL(page.url()).origin;
  const seen: string[] = [];
  const listener = (r: { url(): string; method(): string; postData(): string | null }) => {
    if (!/^https?:/.test(r.url())) return;
    const sameSite = new URL(r.url()).origin === origin;
    const quiet = ["GET", "HEAD"].includes(r.method()) && !r.postData();
    const leaks = secret !== "" && decodeURIComponent(r.url()).includes(secret);
    if (!sameSite || !quiet || leaks) seen.push(`${r.method()} ${r.url()}`);
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
    const requests = await requestsDuring(
      page,
      async () => {
        await page.getByLabel(label).fill(text);
      },
      text,
    );
    expect(requests).toEqual([]);
  });
}

test("the date calculators send nothing while you use them", async ({ page }) => {
  const dates: [string, string][] = [
    ["/tools/utilities/age-calculator/", "Date of birth"],
    ["/tools/utilities/days-between-dates/", "Start date"],
  ];
  for (const [path, label] of dates) {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(
      page,
      async () => {
        await page.getByLabel(label).fill("1988-03-09");
      },
      "1988-03-09",
    );
    expect(requests).toEqual([]);
  }
});

test("the unit converter sends nothing while you type", async ({ page }) => {
  const path = "/tools/utilities/unit-converter/";
  test.skip(!published.has(path), "tool is not published");
  await open(page, path);
  const requests = await requestsDuring(
    page,
    async () => {
      await page.getByLabel("Value").fill("4242.5");
    },
    "4242.5",
  );
  expect(requests).toEqual([]);
});

test("the password generator sends nothing, and never puts the password in the address", async ({ page }) => {
  const path = "/tools/utilities/password-generator/";
  test.skip(!published.has(path), "tool is not published");
  await open(page, path);
  const password = (await page.getByTestId("generated-password").textContent()) ?? "";
  expect(password).toHaveLength(16);
  const requests = await requestsDuring(
    page,
    async () => {
      await page.getByRole("button", { name: "Generate another" }).click();
      await page.getByLabel("Length").fill("40");
    },
    password,
  );
  expect(requests).toEqual([]);
  expect(page.url()).not.toContain(encodeURIComponent(password));
});

test("the RD and discount calculators send nothing while you type", async ({ page }) => {
  const typing: [string, string, string][] = [
    ["/tools/finance-calculators/rd-calculator/", "Monthly deposit (₹)", "7500"],
    ["/tools/finance-calculators/discount-calculator/", "Original price (₹)", "4999"],
  ];
  for (const [path, label, text] of typing) {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(
      page,
      async () => {
        await page.getByLabel(label).fill(text);
      },
      text,
    );
    expect(requests).toEqual([]);
  }
});

test("the interest calculators send nothing while you type", async ({ page }) => {
  for (const path of ["/tools/finance-calculators/compound-interest-calculator/", "/tools/finance-calculators/simple-interest-calculator/"]) {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(
      page,
      async () => {
        await page.getByLabel("Interest rate (% per year)").fill("7.25");
        await page.getByLabel("Principal (₹)").fill("250000");
      },
      "7.25",
    );
    expect(requests).toEqual([]);
  }
});

test("the SIP and lumpsum calculators send nothing while you type", async ({ page }) => {
  for (const path of ["/tools/finance-calculators/sip-calculator/", "/tools/finance-calculators/lumpsum-calculator/"]) {
    test.skip(!published.has(path), "tool is not published");
    await open(page, path);
    const requests = await requestsDuring(
      page,
      async () => {
        await page.getByLabel("Expected return (% per year)").fill("9.5");
        await page.getByLabel("Time period (years)").fill("15");
      },
      "9.5",
    );
    expect(requests).toEqual([]);
  }
});

test("calculators send nothing while you type", async ({ page }) => {
  const path = "/tools/finance-calculators/emi-calculator/";
  test.skip(!published.has(path), "tool is not published");
  await open(page, path);
  const requests = await requestsDuring(
    page,
    async () => {
      await page.getByLabel("Loan amount (₹)").fill("2500000");
      await page.getByLabel("Interest rate (% per year)").fill("8.5");
    },
    "2500000",
  );
  expect(requests).toEqual([]);
});

test("every page loads only from its own site, with no uploads", async ({ page, baseURL }) => {
  test.setTimeout(180_000); // it visits every page in one test
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

// Analytics never runs on its own. Without a stored "accept" nothing may be requested from Google, whether or not the
// workbook has a Measurement ID. With no ID at all, even a stored "accept" must request nothing.
test("analytics requests nothing before a visitor accepts (and nothing at all without an ID)", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(page.url() === "about:blank" ? "http://localhost" : page.url()).origin) external.push(r.url());
  });
  const path = ["/tools/finance-calculators/emi-calculator/"].find((p) => published.has(p));
  test.skip(!path, "tool is not published");
  await open(page, path!);
  await page.getByLabel("Loan amount (₹)").fill("500000");
  await page.waitForTimeout(500);
  expect(external.filter((u) => /google|gtag|analytics/i.test(u)), "before any choice").toEqual([]);
  expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe("undefined");

  const hasId = (await page.getByRole("region", { name: "Analytics choice" }).count()) > 0 || (await page.getByRole("region", { name: "Privacy choices" }).count()) > 0;
  if (hasId) return; // the accepted case needs a stub for Google's script; consent.spec.ts covers it
  await page.evaluate(() => localStorage.setItem("oewer-consent", JSON.stringify({ analytics: true })));
  await open(page, path!);
  await page.waitForTimeout(500);
  expect(external.filter((u) => /google|gtag|analytics/i.test(u)), "accepted, but no Measurement ID").toEqual([]);
});
