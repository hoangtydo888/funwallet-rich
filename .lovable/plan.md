
# Phase 3: Vite Build Config cho Chrome Extension

## Tổng Quan

Phase này sẽ thiết lập hệ thống build riêng biệt cho Chrome Extension, cho phép:
- Build extension thành folder `dist-extension/`
- Hot reload khi develop
- Tự động xử lý manifest.json
- Tách biệt hoàn toàn với PWA build

---

## 1. Cài đặt Dependencies

Thêm package mới vào `package.json`:

| Package | Version | Purpose |
|---------|---------|---------|
| `@crxjs/vite-plugin` | `^2.0.0-beta.23` | Build Chrome Extension với Vite |

**Lưu ý**: Sử dụng beta version vì stable version chưa hỗ trợ Manifest V3 đầy đủ

---

## 2. Tạo vite.config.extension.ts

File cấu hình Vite riêng cho Extension:

```text
┌─────────────────────────────────────────────────────────┐
│ vite.config.extension.ts                                │
├─────────────────────────────────────────────────────────┤
│ • Root: ./src/extension                                 │
│ • Output: dist-extension/                               │
│ • Plugins: react-swc + crx                              │
│ • Alias: @shared → src/shared                           │
│ • Target: Chrome 88+                                    │
│ • Build: ES2020 modules                                 │
└─────────────────────────────────────────────────────────┘
```

**Cấu hình chi tiết**:

| Option | Value | Mô tả |
|--------|-------|-------|
| `root` | `./src/extension` | Thư mục gốc của extension |
| `publicDir` | `public` | Assets tĩnh (icons, manifest) |
| `build.outDir` | `../../dist-extension` | Output folder |
| `build.target` | `esnext` | Modern browsers |
| `build.emptyOutDir` | `true` | Xóa folder cũ trước khi build |
| `resolve.alias` | `@shared` | Trỏ tới src/shared |

---

## 3. Cập nhật Manifest.json

Manifest cần được cập nhật để tương thích với CRXJS:

**Thay đổi paths**:
```text
Before                          After
─────────────────────────────────────────
src/background/service-worker.ts → service-worker.ts (CRXJS tự xử lý)
src/content/inject.ts           → content/inject.ts (CRXJS tự xử lý)
```

**Thêm web_accessible_resources cho tokens**:
```json
{
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "tokens/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 4. Cập nhật Package.json Scripts

Thêm scripts mới:

```text
┌─────────────────────────────────────────────────────────┐
│ Scripts                                                 │
├─────────────────────────────────────────────────────────┤
│ dev:ext     → vite --config vite.config.extension.ts    │
│ build:ext   → vite build --config vite.config.extension.ts │
│ preview:ext → vite preview --config vite.config.extension.ts │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Cấu trúc Output (dist-extension/)

Sau khi build, folder `dist-extension/` sẽ có:

```text
dist-extension/
├── manifest.json           # Đã được xử lý bởi CRXJS
├── popup.html              # Popup entry
├── service-worker.js       # Background script (bundled)
├── content/
│   └── inject.js           # Content script (bundled)
├── assets/
│   ├── popup-[hash].js     # Popup React app
│   └── popup-[hash].css    # Styles
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── tokens/                 # Token icons (copy từ public)
    ├── bnb.png
    ├── usdt.svg
    └── ...
```

---

## 6. Copy Token Icons

Extension cần access token icons. Có 2 options:

**Option A: Symlink/Copy trong build**
- Copy `public/tokens/` vào `src/extension/public/tokens/`

**Option B: Vite plugin để copy**
- Dùng `vite-plugin-static-copy` để copy assets

CHA chọn **Option A** vì đơn giản hơn và manifest đã cấu hình `web_accessible_resources`.

---

## 7. Files Cần Tạo/Sửa

| File | Action | Chi tiết |
|------|--------|----------|
| `vite.config.extension.ts` | **Create** | Vite config cho extension |
| `src/extension/public/manifest.json` | **Update** | Fix paths cho CRXJS |
| `package.json` | **Update** | Thêm scripts + dependency |
| `src/extension/public/tokens/` | **Create** | Copy token icons |
| `.gitignore` | **Update** | Thêm dist-extension/ |

---

## 8. Chi tiết Kỹ thuật

### 8.1 vite.config.extension.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import manifest from './src/extension/public/manifest.json';

export default defineConfig({
  root: './src/extension',
  publicDir: 'public',
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: '../../dist-extension',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5174,
    hmr: {
      port: 5174,
    },
  },
});
```

### 8.2 Manifest paths update

CRXJS tự động xử lý TypeScript paths, nên manifest cần giữ nguyên `.ts`:

```json
{
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content/inject.ts"],
    "run_at": "document_start"
  }]
}
```

### 8.3 Package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:ext": "vite --config vite.config.extension.ts",
    "build": "vite build",
    "build:ext": "vite build --config vite.config.extension.ts",
    "preview": "vite preview",
    "preview:ext": "vite preview --config vite.config.extension.ts"
  }
}
```

---

## 9. Testing Flow

### 9.1 Development Mode

```bash
npm run dev:ext
```
- Khởi động dev server tại port 5174
- HMR enabled cho popup
- Tự động reload khi thay đổi code

### 9.2 Production Build

```bash
npm run build:ext
```
- Build vào `dist-extension/`
- Minified và optimized

### 9.3 Load trong Chrome

1. Mở `chrome://extensions/`
2. Bật "Developer mode"
3. Click "Load unpacked"
4. Chọn folder `dist-extension/`

---

## 10. Kết Quả Mong Đợi

Sau Phase 3:
- Extension có thể build thành công với `npm run build:ext`
- Dev mode với HMR hoạt động với `npm run dev:ext`
- Folder `dist-extension/` chứa extension sẵn sàng load vào Chrome
- Token icons hiển thị đúng trong extension
- Background service worker và content script hoạt động
