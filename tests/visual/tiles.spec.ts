import { test, expect, Page } from "@playwright/test";
import { DASHBOARD_TILES, TILE_TOKENS } from "../../src/theme/tiles";

/**
 * Dashboard tile color regression.
 * `/tile-diagnostics` renders the exact same TILE_STYLES the Dashboard uses,
 * in both enabled and disabled state, without needing a login.
 */

function hslToRgbString(hsl: string): string {
  const [h, s, l] = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = lN - c / 2;
  const to = (v: number) => Math.round((v + m) * 255);
  return `rgb(${to(r1)}, ${to(g1)}, ${to(b1)})`;
}

async function prepare(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
}

test("dashboard tiles keep the Rainbow palette (enabled + disabled)", async ({ page }) => {
  await page.goto("/tile-diagnostics", { waitUntil: "domcontentloaded" });
  await prepare(page);

  for (const [i, tile] of DASHBOARD_TILES.entries()) {
    const expected = hslToRgbString(TILE_TOKENS[tile.color]);
    for (const state of ["enabled", "disabled"] as const) {
      const bg = await page
        .locator(`[data-tile-key="${i}-${state}"]`)
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg, `${tile.label} (${tile.color}, ${state})`).toBe(expected);
    }
  }
});

test("visual: tile-diagnostics", async ({ page }) => {
  await page.goto("/tile-diagnostics", { waitUntil: "domcontentloaded" });
  await prepare(page);
  await expect(page).toHaveScreenshot("tile-diagnostics.png", { fullPage: false });
});
