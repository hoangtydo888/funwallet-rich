import { test, expect, Page } from "@playwright/test";

/**
 * Visual regression for theme lock. If any route drifts in color/layout
 * these snapshots will fail. Regenerate intentionally with:
 *   bun run test:visual:update
 */

async function prepare(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  // Freeze any CSS animations to make screenshots deterministic
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
}

const PUBLIC_ROUTES = ["/", "/theme-preview"] as const;

for (const route of PUBLIC_ROUTES) {
  test(`visual: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await prepare(page);
    await expect(page).toHaveScreenshot(`${route === "/" ? "landing" : route.slice(1)}.png`, {
      fullPage: false,
    });
  });
}

test("visual: theme-preview dark mode", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("fun_wallet_mode", "dark");
  });
  await page.goto("/theme-preview", { waitUntil: "domcontentloaded" });
  await prepare(page);
  await expect(page).toHaveScreenshot("theme-preview-dark.png");
});
