import { defineConfig } from "@playwright/test";

/**
 * Visual regression config — snapshots theme-critical routes so any accidental
 * color / token drift fails CI. Run against the running Vite dev server on 8080.
 *
 * Update baselines intentionally with: `bun run test:visual:update`
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:8080",
    viewport: { width: 1280, height: 1800 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  },
  projects: [
    {
      name: "chromium-light",
      use: { colorScheme: "light" },
    },
  ],
});
