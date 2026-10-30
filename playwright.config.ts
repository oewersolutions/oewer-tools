import { defineConfig, devices } from "@playwright/test";

// Runs against the static export in out/ (run `npm run build` first).
// Chrome is the one installed on the machine (preinstalled on GitHub-hosted runners), so no browser download is needed.
// Set CROSS_BROWSER=1 to add Firefox and Safari's engine (WebKit); CI installs them first with `npx playwright install`.
const crossBrowser = process.env.CROSS_BROWSER === "1";
const shared = ["accessibility.spec.ts", "responsive.spec.ts", "tools.spec.ts", "privacy.spec.ts", "admin.spec.ts"];

export default defineConfig({
  testDir: "e2e",
  reporter: "list",
  use: { baseURL: "http://localhost:4174", reducedMotion: "reduce" }, // no animations, so colour checks never catch a half-faded state
  webServer: { command: "npx http-server out -p 4174 -s -c-1", url: "http://localhost:4174/", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: ["performance.spec.ts"] },
    {
      name: "chrome-mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
      testMatch: ["tools.spec.ts", "privacy.spec.ts", "performance.spec.ts"],
    },
    ...(crossBrowser
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] }, testMatch: shared },
          { name: "safari-webkit", use: { ...devices["Desktop Safari"] }, testMatch: shared },
          { name: "safari-iphone", use: { ...devices["iPhone 14"] }, testMatch: ["tools.spec.ts", "privacy.spec.ts"] },
        ]
      : []),
  ],
});
