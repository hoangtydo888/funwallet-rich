

# Thêm Build Scripts cho Chrome Extension

## Tổng Quan

Thêm các scripts cần thiết vào `package.json` để build và phát triển Chrome Extension.

---

## Scripts Cần Thêm

| Script | Command | Mô tả |
|--------|---------|-------|
| `dev:ext` | `vite --config vite.config.extension.ts` | Dev mode với HMR |
| `build:ext` | `vite build --config vite.config.extension.ts` | Production build |
| `preview:ext` | `vite preview --config vite.config.extension.ts` | Preview build |

---

## Thay Đổi trong package.json

**Trước:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

**Sau:**
```json
"scripts": {
  "dev": "vite",
  "dev:ext": "vite --config vite.config.extension.ts",
  "build": "vite build",
  "build:ext": "vite build --config vite.config.extension.ts",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "preview:ext": "vite preview --config vite.config.extension.ts"
}
```

---

## Hướng Dẫn Sử Dụng

### Development Mode
```bash
npm run dev:ext
```
- Khởi động dev server tại port 5174
- Hot Module Replacement enabled
- Tự động reload khi thay đổi code

### Production Build
```bash
npm run build:ext
```
- Build vào folder `dist-extension/`
- Code được minified và optimized
- Sẵn sàng load vào Chrome

### Load Extension trong Chrome
1. Mở `chrome://extensions/`
2. Bật "Developer mode" (góc phải trên)
3. Click "Load unpacked"
4. Chọn folder `dist-extension/`
5. Extension FUN Wallet xuất hiện!

---

## File Cần Sửa

| File | Thay đổi |
|------|----------|
| `package.json` | Thêm 3 scripts: dev:ext, build:ext, preview:ext |

