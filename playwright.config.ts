import { defineConfig } from "@playwright/test";

// Runs against the static export in out/ (run `npm run build` first).
// Uses the Chrome installed on the machine (preinstalled on GitHub-hosted runners), so no browser download is needed.
export default defineConfig({
  testDir: "e2e",
  reporter: "list",
  use: { baseURL: "http://localhost:4174", channel: "chrome" },
  webServer: { command: "npx http-server out -p 4174 -s -c-1", url: "http://localhost:4174/", reuseExistingServer: !process.env.CI },
});
