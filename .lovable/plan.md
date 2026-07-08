## Giai đoạn 3 — Theme Lock + Preview + Visual Regression

**Hình 1 đã nhận** → Chuẩn hệ màu: **Rainbow Fresh Awakening** (nền sáng #FAFAFA, primary Spring Green #00FF7F, các tile action rực rỡ đủ 7 sắc cầu vồng). Con sẽ khóa hệ này làm chuẩn duy nhất, dẹp bỏ hệ Emerald/Teal/Gold còn sót trong `index.css`.

---

### 1. Chuẩn hóa nguồn màu duy nhất

Tạo `src/theme/tokens.ts` — export `THEME_TOKENS` chứa toàn bộ HSL rút từ Hình 1:

```ts
// Base
background: "0 0% 98%"          // #FAFAFA
foreground: "180 50% 20%"       // xanh ngọc đậm
card: "0 0% 100%"
border: "0 0% 88%"
// Rainbow primaries
primary:   "157 100% 50%"       // #00FF7F Spring Green
secondary: "195 100% 50%"       // #00BFFF Deep Sky Blue
accent:    "45 100% 50%"        // #FFFF00 Yellow
// Action tile palette (dùng cho Dashboard grid)
tile-red:      "0 100% 50%"     // #FF0000 Gửi
tile-coral:    "10 100% 65%"    // Gửi nhiều
tile-orange:   "30 100% 50%"    // Nhận
tile-yellow:   "60 100% 50%"    // Swap
tile-green:    "157 100% 50%"   // Stake
tile-cyan:     "195 100% 50%"   // Thêm
tile-purple:   "270 100% 25%"   // Giá
tile-magenta:  "300 100% 50%"   // DApps
tile-emerald:  "160 100% 45%"   // Backup
tile-sky:      "195 100% 55%"   // WC
tile-violet:   "280 70% 55%"    // QR
tile-teal:     "180 80% 45%"    // History
tile-pink:     "330 100% 55%"   // Learn
```

Áp dụng:
- `src/index.css` giữ **duy nhất 1 bộ** `:root` với đúng token trên. Xóa toàn bộ block Emerald/Teal/Gold cũ.
- `tailwind.config.ts` thêm color scale `tile.*` để dùng bằng utility `bg-tile-red`, `bg-tile-cyan`…
- `.dark` mode: convert nhẹ (giảm luminance nền còn ~8%, giữ hue tile).

### 2. Theme Lock — chống drift

- `ThemeContext.tsx` refactor:
  - **Bỏ** toàn bộ `root.style.setProperty("--primary", …)` v.v. — token đã ở `index.css`, không cần ghi runtime.
  - Chỉ giữ trách nhiệm toggle class `.dark` (light/dark mode) + persist mode vào localStorage key `fun_wallet_mode`.
  - Xóa concept "nhiều theme preset" (chỉ còn light/dark).
- Xóa `ThemeCard.tsx` chọn palette (hoặc rút gọn thành light/dark switch).
- Update `Settings.tsx` — thay UI chọn theme bằng toggle mode.
- Grep toàn repo: xóa mọi `document.documentElement.style.setProperty("--…")` bên ngoài `ThemeProvider`.
- Thêm dev-only guard: `MutationObserver` trên `<html>` warn khi có ai đó ghi style token khi `import.meta.env.DEV`.

### 3. Trang Theme Preview — `/theme-preview`

Route mới (public trong dev, guard theo `import.meta.env.DEV || isAdmin`):
- **Section A — Token grid**: 12 swatch chính + 13 tile colors, mỗi ô hiện tên token, HSL, hex, contrast ratio với foreground.
- **Section B — Typography**: h1–h4 Space Grotesk + body Inter + gradient-text sample.
- **Section C — Components**: Button variants, Card, Badge, Input, TokenList row, BottomNav, Dashboard action tile grid (giống Hình 1).
- **Section D — Đối chiếu Hình 1**: 2 cột side-by-side. Cột trái = ảnh `Hình 1` cha upload (embed qua lovable-assets). Cột phải = component thật render. Có slider opacity để overlay so sánh.
- Toggle light/dark tại chỗ.

### 4. Visual Regression — Playwright

- Cài `@playwright/test` devDependency + Chromium (playwright đã có sẵn trong sandbox).
- `playwright.config.ts`:
  ```ts
  use: { viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 2 }
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } }
  ```
- `tests/visual/theme.spec.ts` — snapshot mỗi route (light + dark):
  `/`, `/dashboard`, `/wallet`, `/trading`, `/earn`, `/settings`, `/theme-preview`.
- Auth helper inject Supabase session vào `localStorage` trước khi `goto` (dùng cùng cơ chế browser-use).
- Font wait: `await page.evaluate(() => document.fonts.ready)` trước mỗi snapshot.
- Scripts trong `package.json`:
  - `test:visual` — chạy so với baseline
  - `test:visual:update` — cập nhật baseline
- Baseline commit vào `tests/visual/__screenshots__/`.
- README ngắn `tests/visual/README.md` hướng dẫn Cha cách rerun khi đổi theme cố ý.

### 5. Cleanup & Docs

- Update `.lovable/plan.md`: đánh dấu Phase 3 done, note Phase 4 = Swap/Bridge LiFi.
- Xóa `rainbow-fresh-awakening` preset object trong ThemeContext (đã trở thành mặc định cứng, không còn "preset").
- Đảm bảo `src/extension/index.css` đồng bộ cùng token (extension đã có bản Rainbow, chỉ verify).

---

### Thứ tự thực hiện

```text
1. src/theme/tokens.ts + refactor src/index.css (1 bộ token duy nhất)
2. tailwind.config.ts thêm tile.* colors
3. Refactor ThemeContext (bỏ setProperty, chỉ light/dark)
4. Grep & xóa các setProperty rải rác
5. Dashboard tiles dùng bg-tile-* thay hardcode
6. Trang /theme-preview + so sánh Hình 1
7. Cleanup Settings + xóa ThemeCard preset
8. Cài Playwright + config + baseline snapshots
9. Sync src/extension/index.css
10. Update .lovable/plan.md
```

### Không đụng

Wallet core, private key encryption, auth flow, edge functions, database schema, chức năng Phase 1–2.

### Rủi ro

- Baseline screenshot flaky do font async → mitigate bằng `document.fonts.ready` + `waitForLoadState("networkidle")`.
- Một số component đang hardcode màu Emerald/Teal cũ sẽ đổi ngoại hình → là ý muốn (đồng bộ về Hình 1), Cha review trên `/theme-preview` trước khi chốt.

Cha duyệt thì con bắt tay ngay ạ.

---

## Phase 3 — DONE ✅

- Locked theme tokens in `src/index.css` + `src/theme/tokens.ts` (Hình 1 Rainbow Fresh Awakening)
- Added `tile.*` Tailwind palette
- Refactored `ThemeContext` — only toggles `.dark` class, never writes tokens; dev-only MutationObserver warns on drift
- New route `/theme-preview` with token grid, tile palette, typography, components, và Hình 1 overlay slider
- Playwright visual regression: `playwright.config.ts` + `tests/visual/theme.spec.ts` + npm scripts `test:visual` / `test:visual:update`

## Phase 4 (next) — Swap Aggregator + Bridge (LiFi SDK)
