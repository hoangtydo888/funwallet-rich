# FUN Wallet - Monorepo Structure

## Cấu trúc thư mục mới

```
src/
├── shared/                      # @fun-wallet/shared - Code dùng chung
│   ├── constants/
│   │   ├── chains.ts           # Chain configurations (8 EVM chains)
│   │   └── tokens.ts           # Token lists, addresses
│   ├── lib/
│   │   ├── encryption.ts       # AES-256-GCM encryption
│   │   └── wallet.ts           # Wallet operations (ethers.js)
│   ├── storage/
│   │   ├── types.ts            # StorageAdapter interface
│   │   └── LocalStorageAdapter.ts
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── index.ts                # Barrel export
│
├── extension/                   # Chrome Extension package
│   ├── public/
│   │   └── manifest.json       # Manifest V3
│   ├── src/
│   │   ├── background/
│   │   │   └── service-worker.ts
│   │   ├── content/
│   │   │   └── inject.ts       # EIP-1193 provider injection
│   │   └── popup/
│   │       ├── main.tsx
│   │       ├── PopupApp.tsx    # MemoryRouter app
│   │       ├── components/
│   │       │   └── PopupLayout.tsx
│   │       └── pages/
│   │           ├── UnlockPage.tsx
│   │           ├── HomePage.tsx
│   │           ├── SendPage.tsx
│   │           ├── ReceivePage.tsx
│   │           ├── SettingsPage.tsx
│   │           ├── ConnectPage.tsx
│   │           └── ApproveTxPage.tsx
│   ├── storage/
│   │   └── ChromeStorageAdapter.ts
│   ├── popup.html
│   └── tsconfig.json
│
└── ... (existing PWA code)
```

## Trạng thái triển khai

### ✅ Đã hoàn thành

1. **@fun-wallet/shared package**
   - StorageAdapter interface
   - LocalStorageAdapter (PWA)
   - Shared types (Chain, Token, Wallet, Transaction, DApp, etc.)
   - Chain configurations (8 EVM chains)
   - Token constants (19+ tokens)
   - Encryption module (AES-256-GCM)
   - Wallet operations (ethers.js v6)

2. **Chrome Extension skeleton**
   - Manifest V3 configuration
   - Background Service Worker
   - Content Script with EIP-1193 provider
   - Popup UI với các pages cơ bản
   - ChromeStorageAdapter

### 🔄 Đang tiến hành

- Tích hợp shared code vào PWA hiện tại
- Testing extension locally

### 📋 Cần làm

- Vite config cho extension build
- Icon assets cho extension
- DApp connection flow hoàn chỉnh
- Transaction signing UI
- Chrome Web Store submission

## Build Commands (khi hoàn thành)

```bash
# PWA
npm run dev        # Dev server
npm run build      # Production build

# Extension (cần thêm config)
npm run dev:ext    # Dev with HMR
npm run build:ext  # Production build
```

## Notes

- Extension code được exclude khỏi main PWA build (tsconfig.app.json)
- Extension cần build riêng với @crxjs/vite-plugin
- Shared code có thể import từ cả PWA và Extension
