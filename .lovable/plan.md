
# Phase 2: Hoàn Thiện Chrome Extension - Build System & Core Features

## Tổng Quan

Phase 2 sẽ tập trung vào việc hoàn thiện Chrome Extension để có thể build và test locally:
1. **Vite Config cho Extension** - Setup build system riêng biệt
2. **Icon Assets** - Tạo icons cho extension
3. **CSS/Styles** - Extension styles riêng
4. **Hoàn thiện Send/Receive Pages** - Tích hợp với shared wallet logic
5. **Build Scripts** - Thêm scripts vào package.json
6. **Cập nhật Manifest** - Sửa đường dẫn sau khi build

---

## 1. Tạo Vite Config Cho Extension

**File mới: `vite.config.extension.ts`**

| Cấu hình | Chi tiết |
|----------|----------|
| Plugin | `@crxjs/vite-plugin` + `@vitejs/plugin-react-swc` |
| Entry | `popup.html` từ `src/extension/` |
| Output | `dist-extension/` |
| Resolve | Alias `@shared` → `src/shared` |
| Build | Target Chrome 88+ |

```typescript
// vite.config.extension.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/extension/public/manifest.json';
import path from 'path';

export default defineConfig({
  root: './src/extension',
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
  },
});
```

---

## 2. Tạo Extension Icons

**Folder: `src/extension/public/icons/`**

| File | Kích thước | Mô tả |
|------|-----------|-------|
| `icon-16.png` | 16x16 | Favicon, toolbar |
| `icon-48.png` | 48x48 | Extension page |
| `icon-128.png` | 128x128 | Chrome Web Store |

**Giải pháp**: Resize từ `public/pwa-512x512.png` hiện có

---

## 3. CSS/Styles Cho Extension

**File mới: `src/extension/index.css`**

- Copy cấu trúc từ `src/index.css`
- Tailwind CSS imports
- CSS variables cho themes
- Fixed width 360px styles

---

## 4. Hoàn Thiện Popup Pages

### 4.1 SendPage - Gửi Crypto Thực Sự

```
┌─────────────────────────────────────┐
│ ← Gửi Crypto                        │
├─────────────────────────────────────┤
│ [Select Token ▼]                    │
│                                     │
│ Địa chỉ nhận:                       │
│ [0x... _________________________ ]  │
│                                     │
│ Số lượng:                           │
│ [____________________] [MAX]        │
│                                     │
│ Số dư: 0.5 BNB                      │
│                                     │
├─────────────────────────────────────┤
│ [        Tiếp tục        ]          │
└─────────────────────────────────────┘
```

**Tích hợp**:
- Import `sendNativeToken`, `sendToken` từ `@shared/lib/wallet`
- Validate địa chỉ với `isValidAddress`
- Ước tính gas fee

### 4.2 ReceivePage - Sửa Import

- QRCode.react đã có
- Sửa import path cho shared wallet functions

### 4.3 HomePage - Real Balances

- Import `getAllBalances` từ shared
- Fetch real token balances từ blockchain
- Cache balances trong chrome.storage

---

## 5. Update Manifest.json

**Sửa đổi đường dẫn**:

```json
{
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "js": ["content/inject.js"],
      "run_at": "document_start"
    }
  ]
}
```

**Note**: CRXJS sẽ tự động transpile `.ts` → `.js`

---

## 6. Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:ext": "vite --config vite.config.extension.ts",
    "build": "vite build",
    "build:ext": "vite build --config vite.config.extension.ts",
    "preview:ext": "cd dist-extension && npx http-server"
  }
}
```

---

## 7. Dependencies Cần Thêm

| Package | Purpose |
|---------|---------|
| `@crxjs/vite-plugin` | Build Chrome Extension với Vite |

---

## 8. Các Files Cần Tạo/Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `vite.config.extension.ts` | Create | Vite config cho extension |
| `src/extension/index.css` | Create | Tailwind styles |
| `src/extension/public/icons/icon-16.png` | Create | Icon 16x16 |
| `src/extension/public/icons/icon-48.png` | Create | Icon 48x48 |
| `src/extension/public/icons/icon-128.png` | Create | Icon 128x128 |
| `src/extension/public/manifest.json` | Update | Fix paths |
| `src/extension/src/popup/pages/SendPage.tsx` | Update | Full send functionality |
| `src/extension/src/popup/pages/HomePage.tsx` | Update | Real balances |
| `src/extension/src/popup/main.tsx` | Update | Fix CSS import |
| `package.json` | Update | Add scripts + dependency |

---

## 9. Technical Details

### 9.1 Wallet Password Verification

Background service worker cần verify password thực sự:

```typescript
async function handleUnlockWallet(payload: { password: string }): Promise<MessageResponse> {
  // Get encrypted wallet data
  const encryptedData = await chromeStorageAdapter.get(STORAGE_KEYS.ENCRYPTED_KEYS);
  
  if (!encryptedData) {
    return { success: false, error: 'No wallet found' };
  }
  
  try {
    // Try to decrypt with password
    const parsed = JSON.parse(encryptedData);
    const addresses = Object.keys(parsed.wallets);
    
    if (addresses.length > 0) {
      const testData = parsed.wallets[addresses[0]];
      await decryptPrivateKey(testData, payload.password);
    }
    
    isLocked = false;
    return { success: true };
  } catch {
    return { success: false, error: 'Invalid password' };
  }
}
```

### 9.2 Asset Loading in Extension

Extension assets cần dùng `chrome.runtime.getURL()`:

```typescript
// Thay vì
<img src="/tokens/bnb.png" />

// Sử dụng
<img src={chrome.runtime.getURL('tokens/bnb.png')} />
```

---

## 10. Testing Flow

1. **Build Extension**:
   ```bash
   npm run build:ext
   ```

2. **Load in Chrome**:
   - Mở `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Chọn folder `dist-extension/`

3. **Test Features**:
   - Click extension icon
   - Nhập password để unlock
   - Xem balances
   - Test Send/Receive

---

## Kết Quả Mong Đợi

Sau Phase 2:
- ✅ Extension có thể build thành công
- ✅ Load được trong Chrome Developer mode
- ✅ Unlock wallet với password
- ✅ Hiển thị real token balances
- ✅ Send/Receive crypto functionality
- ✅ Icons hiển thị đúng
