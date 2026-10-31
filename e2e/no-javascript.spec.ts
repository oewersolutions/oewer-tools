import { expect, test } from "@playwright/test";

// Search engines and some visitors read pages without running JavaScript. The pages are built as real HTML, so the
// text, headings and links must all be there. (The tools themselves need JavaScript to work, and say so.)
test.use({ javaScriptEnabled: false });

test("a tool page has its guide, examples and questions in the HTML, and says the tool needs JavaScript", async ({ page }) => {
  await page.goto("/tools/finance-calculators/emi-calculator/");
  await expect(page.getByRole("heading", { level: 1, name: /EMI Calculator/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /How to use/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Examples" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Frequently asked questions/ })).toBeVisible();
  await expect(page.getByText(/needs JavaScript/)).toBeVisible();
  await expect(page.getByLabel("Loan amount (₹)")).toBeVisible(); // the form itself is in the HTML too
});

test("an article is fully readable", async ({ page }) => {
  await page.goto("/blog/gst-explained-add-and-remove-gst/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const text = await page.locator("article, main").first().innerText();
  expect(text.length).toBeGreaterThan(2000);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
});

test("the home page, a category page and the blog index show their content and links", async ({ page }) => {
  for (const path of ["/", "/tools/finance-calculators/", "/blog/"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.locator("main a[href]").count(), path).toBeGreaterThan(5);
  }
});

test("links work without JavaScript", async ({ page }) => {
  await page.goto("/tools/");
  await page.locator("main a[href*='/tools/finance-calculators/']").first().click();
  await expect(page).toHaveURL(/finance-calculators/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the legal pages and the contact address are plain text and links", async ({ page }) => {
  await page.goto("/privacy-policy/");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await page.goto("/contact/");
  await expect(page.locator("main").getByRole("link", { name: "Write an email" })).toHaveAttribute("href", "mailto:oewersolutions@gmail.com");
});
