
# Kế Hoạch: Monorepo - PWA + Chrome Extension

## Tổng Quan

Chuyển đổi dự án thành **monorepo** với 3 packages:
1. **@fun-wallet/shared** - Code dùng chung (core logic)
2. **@fun-wallet/pwa** - PWA hiện tại
3. **@fun-wallet/extension** - Chrome Extension mới

---

## Cấu Trúc Thư Mục Mới

```text
fun-wallet/
├── packages/
│   ├── shared/                    # Code dùng chung
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── wallet.ts      # Wallet operations
│   │   │   │   ├── chains.ts      # Chain configs
│   │   │   │   ├── keyEncryption.ts
│   │   │   │   ├── staking.ts
│   │   │   │   └── swap.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts       # Shared types
│   │   │   └── constants/
│   │   │       └── tokens.ts      # Token configs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── pwa/                       # PWA (code hiện tại)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── extension/                 # Chrome Extension
│       ├── src/
│       │   ├── background/
│       │   │   └── service-worker.ts
│       │   ├── content/
│       │   │   └── inject.ts
│       │   ├── popup/
│       │   │   ├── App.tsx
│       │   │   ├── pages/
│       │   │   └── components/
│       │   └── options/
│       │       └── Options.tsx
│       ├── public/
│       │   └── manifest.json      # Manifest V3
│       ├── vite.config.ts
│       └── package.json
│
├── package.json                   # Root workspace
├── pnpm-workspace.yaml            # PNPM workspace config
└── turbo.json                     # Turborepo config (optional)
```

---

## Phase 1: Tạo Package Shared (Tuần 1)

### 1.1 Files cần di chuyển sang `@fun-wallet/shared`

| File hiện tại | File mới | Mô tả |
|---------------|----------|-------|
| `src/lib/wallet.ts` | `packages/shared/src/lib/wallet.ts` | Core wallet operations |
| `src/lib/keyEncryption.ts` | `packages/shared/src/lib/keyEncryption.ts` | AES-256-GCM encryption |
| `src/lib/chains.ts` | `packages/shared/src/lib/chains.ts` | Multi-chain config |
| `src/lib/staking.ts` | `packages/shared/src/lib/staking.ts` | Staking logic |
| `src/lib/swap.ts` | `packages/shared/src/lib/swap.ts` | DEX swap logic |
| `src/lib/dexscreener.ts` | `packages/shared/src/lib/dexscreener.ts` | Price API |

### 1.2 Tạo Storage Adapter Interface

```typescript
// packages/shared/src/storage/types.ts
export interface StorageAdapter {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  getAll: () => Promise<Record<string, string>>;
}
```

```typescript
// packages/pwa/src/storage/localStorage.ts
export class LocalStorageAdapter implements StorageAdapter {
  async get(key: string) { return localStorage.getItem(key); }
  async set(key: string, value: string) { localStorage.setItem(key, value); }
  async remove(key: string) { localStorage.removeItem(key); }
  async getAll() { return { ...localStorage }; }
}
```

```typescript
// packages/extension/src/storage/chromeStorage.ts
export class ChromeStorageAdapter implements StorageAdapter {
  async get(key: string) {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }
  async set(key: string, value: string) {
    await chrome.storage.local.set({ [key]: value });
  }
  async remove(key: string) {
    await chrome.storage.local.remove(key);
  }
  async getAll() {
    return await chrome.storage.local.get(null);
  }
}
```

---

## Phase 2: Tạo Chrome Extension (Tuần 2-3)

### 2.1 Manifest V3

```json
{
  "manifest_version": 3,
  "name": "FUN Wallet - Web3 Crypto Wallet",
  "version": "1.0.0",
  "description": "Ví tiền điện tử Web3 an toàn trên BNB Chain",
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ],
  
  "permissions": [
    "storage",
    "activeTab",
    "notifications"
  ],
  
  "host_permissions": [
    "https://bsc-dataseed.binance.org/*",
    "https://api.dexscreener.com/*"
  ],
  
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### 2.2 Background Service Worker

```typescript
// packages/extension/src/background/service-worker.ts
import { WalletCore } from '@fun-wallet/shared';
import { ChromeStorageAdapter } from '../storage/chromeStorage';

const storage = new ChromeStorageAdapter();
const wallet = new WalletCore(storage);

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ACCOUNTS':
      wallet.getAccounts().then(sendResponse);
      return true;
      
    case 'SIGN_TRANSACTION':
      wallet.signTransaction(message.payload).then(sendResponse);
      return true;
      
    case 'eth_requestAccounts':
      handleConnectRequest(sender.tab?.id).then(sendResponse);
      return true;
  }
});
```

### 2.3 Popup App Structure

| Component | Mô tả |
|-----------|-------|
| `PopupApp.tsx` | Main app với MemoryRouter |
| `UnlockPage.tsx` | Nhập password mở khóa |
| `HomePage.tsx` | Dashboard chính |
| `SendPage.tsx` | Gửi crypto |
| `ReceivePage.tsx` | Nhận crypto |
| `SettingsPage.tsx` | Cài đặt |

### 2.4 Content Script (EIP-1193 Provider)

```typescript
// packages/extension/src/content/inject.ts
const funWalletProvider = {
  isFunWallet: true,
  isMetaMask: false, // Không giả mạo MetaMask
  
  request: async ({ method, params }) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: method, params },
        (response) => {
          if (response.error) reject(response.error);
          else resolve(response.result);
        }
      );
    });
  },
  
  on: (event, callback) => { /* Event handling */ },
};

// Inject vào window
window.funWallet = funWalletProvider;
window.dispatchEvent(new Event('fun-wallet#initialized'));
```

---

## Phase 3: Vite Build Config (Tuần 2)

### 3.1 Extension Vite Config

```typescript
// packages/extension/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
        options: 'options.html',
      },
    },
  },
});
```

### 3.2 Workspace Scripts

```json
{
  "scripts": {
    "dev:pwa": "pnpm --filter @fun-wallet/pwa dev",
    "dev:ext": "pnpm --filter @fun-wallet/extension dev",
    "build:pwa": "pnpm --filter @fun-wallet/pwa build",
    "build:ext": "pnpm --filter @fun-wallet/extension build",
    "build:all": "pnpm -r build"
  }
}
```

---

## Phase 4: Code Reusable từ PWA (Tuần 3)

### Components có thể dùng lại (90%)

| Category | Components | Thay đổi cần thiết |
|----------|------------|-------------------|
| **UI Components** | Button, Card, Dialog, Input, Toast | Không cần thay đổi |
| **Wallet Components** | TokenList, BalanceDisplay | Đổi storage adapter |
| **Security** | PinDialog, UnlockDialog | Đổi storage adapter |
| **Crypto Logic** | sendBNB, sendToken, getBalance | Không cần thay đổi |
| **Encryption** | encryptPrivateKey, decryptPrivateKey | Không cần thay đổi |

### Components cần viết mới cho Extension

| Component | Mô tả |
|-----------|-------|
| `PopupLayout.tsx` | Layout 350x500px cho popup |
| `ConnectionPrompt.tsx` | Dialog xin quyền kết nối DApp |
| `TransactionApproval.tsx` | Dialog phê duyệt giao dịch |
| `NetworkBadge.tsx` | Badge hiển thị chain hiện tại |

---

## So Sánh PWA vs Extension

| Tính năng | PWA | Chrome Extension |
|-----------|-----|------------------|
| **Kích thước** | Full screen | 350x500px popup |
| **Navigation** | BrowserRouter | MemoryRouter |
| **Storage** | localStorage | chrome.storage.local |
| **Background** | Không có | Service Worker |
| **DApp Connect** | WalletConnect | Direct injection |
| **Notifications** | Web Push | chrome.notifications |

---

## Timeline Đề Xuất

| Tuần | Công việc | Output |
|------|-----------|--------|
| **1** | Setup monorepo, extract shared code | `@fun-wallet/shared` package |
| **2** | Tạo extension structure, manifest, build config | Extension skeleton |
| **3** | Implement popup UI, unlock flow | Working popup |
| **4** | Background service worker, signing | Transaction signing |
| **5** | Content script, DApp connection | DApp integration |
| **6** | Testing, polish, Chrome Web Store submission | Production ready |

---

## Lưu Ý Quan Trọng

### Security cho Extension

| Concern | Solution |
|---------|----------|
| Private keys | Mã hóa với AES-256-GCM (đã có sẵn) |
| XSS attacks | Content Security Policy nghiêm ngặt |
| Phishing | Verify DApp origin trước khi connect |
| Session | Auto-lock sau 15 phút (đã có sẵn) |

### Chrome Web Store Requirements

| Requirement | Status |
|-------------|--------|
| Manifest V3 | Sẽ implement |
| Privacy Policy | Cần tạo |
| Single Purpose | Wallet operations only |
| Permissions | Minimum required |

---

## Kết Luận

Với kiến trúc này:
- PWA và Extension dùng chung **~80% business logic**
- Chỉ cần viết mới **UI components** và **platform adapters**
- Dễ maintain vì single source of truth
- Có thể deploy độc lập hoặc cùng lúc
