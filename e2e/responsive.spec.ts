import { expect, test } from "./fixtures";
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
      await page.goto("/about/");
      await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
      const menu = page.getByRole("button", { name: "Open menu" });
      if (vp.width < 768) {
        // On a phone the links live behind a menu button.
        await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
        await menu.click();
        await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
        await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Blog" }).click();
        await expect(page).toHaveURL(/\/blog\//);
        await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden(); // closed again after choosing
      } else {
        await expect(menu).toBeHidden();
        await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tools" })).toBeVisible();
      }
      await page.getByRole("button", { name: "Search" }).click();
      await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Search" })).toHaveJSProperty("open", true);
      const box = (await page.getByRole("dialog", { name: "Search" }).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width); // the search fits the screen
    });
  });
}
