import { expect, test } from "./fixtures";
import { builtPaths } from "./pages";

const articles = builtPaths().filter((p) => /^\/blog\/[^/]+\/$/.test(p));

test("there is at least one article to test", () => {
  expect(articles.length).toBeGreaterThan(0);
});

for (const path of articles) {
  test(`article has structured data and working section links: ${path}`, async ({ page }) => {
    await page.goto(path);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((t) => JSON.parse(t)["@type"] === "Article")).toBe(true);

    const toc = page.getByRole("navigation", { name: "In this article" });
    if ((await toc.count()) > 0) {
      const links = toc.getByRole("link");
      for (let i = 0; i < (await links.count()); i++) {
        const href = (await links.nth(i).getAttribute("href"))!;
        await expect(page.locator(href)).toHaveCount(1); // the anchor exists exactly once
      }
    }
  });
}

test("an article links to its tool, and the tool links back to the article", async ({ page }) => {
  test.skip(!articles.includes("/blog/how-emi-is-calculated/"), "article is not published");
  await page.goto("/blog/how-emi-is-calculated/");
  const tools = page.getByRole("complementary", { name: "Try our tools" });
  await expect(tools).toContainText("Try it yourself");
  await tools.getByRole("link", { name: /EMI Calculator/ }).click();
  await expect(page.getByRole("heading", { name: /Guides about EMI Calculator/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /How EMI Is Calculated/ }).first()).toBeVisible();
});

test("an article suggests other articles to read", async ({ page }) => {
  await page.goto("/blog/gst-explained-add-and-remove-gst/");
  await expect(page.getByRole("heading", { name: "Related articles" })).toBeVisible();
  const related = page.getByRole("region", { name: "Related articles" });
  expect(await related.getByRole("link").count()).toBeGreaterThan(0);
  await expect(related.getByRole("link", { name: /GST Explained/ })).toHaveCount(0); // not itself
});
