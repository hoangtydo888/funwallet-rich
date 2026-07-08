# Visual Regression Tests

Bảo vệ hệ màu Rainbow Fresh Awakening (Hình 1) khỏi bị drift.

## Chạy

```bash
# So sánh với baseline hiện tại (fail nếu có drift)
bun run test:visual

# Cập nhật baseline (chỉ chạy khi đổi theme cố ý)
bun run test:visual:update
```

## Yêu cầu

- Vite dev server đang chạy tại `http://localhost:8080` (mặc định trong sandbox)
- Chromium của Playwright đã cài (`bunx playwright install chromium` nếu thiếu)

## Route được snapshot

- `/` — landing
- `/theme-preview` — toàn bộ token grid + tile palette + so sánh Hình 1
- `/theme-preview` (dark mode) — kiểm tra dark theme không lệch

Baseline nằm ở `tests/visual/theme.spec.ts-snapshots/`.
