import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Some tests start real build steps (validation, export) in child processes; give them room on a busy machine.
    testTimeout: 60_000,
  },
});
