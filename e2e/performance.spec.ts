import { expect, test } from "./fixtures";
import { builtPaths } from "./pages";

// Mobile budgets under a throttled connection (about slow 4G) and a CPU 4x slower than this machine.
// JS sizes are uncompressed (the test server does not gzip); GitHub Pages sends gzip, so real transfer is far smaller.
const BUDGET = { lcpMs: 2500, cls: 0.1, jsKB: 700, totalKB: 900 };

test.skip(({ browserName }) => browserName !== "chromium", "Throttling uses the Chrome DevTools protocol");

for (const path of builtPaths()) {
  test(`mobile performance budget: ${path}`, async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await page.addInitScript(() => {
      const w = window as unknown as { __m: { lcp: number; cls: number } };
      w.__m = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => list.getEntries().forEach((e) => (w.__m.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) =>
        list.getEntries().forEach((e) => {
          const shift = e as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!shift.hadRecentInput) w.__m.cls += shift.value;
        }),
      ).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const w = window as unknown as { __m: { lcp: number; cls: number } };
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const kb = (list: PerformanceResourceTiming[]) => list.reduce((n, e) => n + e.encodedBodySize, 0) / 1024;
      return { ...w.__m, jsKB: kb(res.filter((e) => e.name.endsWith(".js"))), totalKB: kb(res) };
    });

    expect.soft(m.lcp, "largest contentful paint (ms)").toBeLessThan(BUDGET.lcpMs);
    expect.soft(m.cls, "cumulative layout shift").toBeLessThan(BUDGET.cls);
    expect.soft(m.jsKB, "JavaScript (KB)").toBeLessThan(BUDGET.jsKB);
    expect.soft(m.totalKB, "all resources (KB)").toBeLessThan(BUDGET.totalKB);
  });
}
