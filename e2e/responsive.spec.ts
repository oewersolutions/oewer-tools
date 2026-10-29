import { expect, test } from "@playwright/test";
import { builtPaths } from "./pages";

const viewports = [
  { name: "mobile", width: 320, height: 700 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of viewports) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const path of builtPaths()) {
      test(`no horizontal scroll: ${path}`, async ({ page }) => {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test("header navigation and search are reachable", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      await expect(page.getByRole("searchbox").or(page.getByRole("combobox")).first()).toBeVisible();
    });
  });
}
