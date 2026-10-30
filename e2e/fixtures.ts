import { expect, test as base } from "@playwright/test";

/**
 * The same `test` as Playwright's, except that `page.goto` also waits until the page's JavaScript is running
 * (`<html data-hydrated>`, set by components/HydrationFlag). The pages are real HTML before that, so tests that type
 * or click straight away can lose their input on a slow machine.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = (async (url: string, options?: Parameters<typeof goto>[1]) => {
      const response = await goto(url, options);
      await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1", undefined, { timeout: 20_000 }).catch(() => undefined); // static pages without the flag (404) still load
      return response;
    }) as typeof page.goto;
    await use(page);
  },
});
export { expect };
