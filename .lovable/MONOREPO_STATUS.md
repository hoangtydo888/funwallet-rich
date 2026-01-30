# FUN Wallet - Monorepo Structure

## Cấu trúc thư mục

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
│   │   ├── manifest.json       # Manifest V3
│   │   └── icons/              # Extension icons (16, 48, 128)
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
│   │           ├── HomePage.tsx (real balances)
│   │           ├── SendPage.tsx (full send)
│   │           ├── ReceivePage.tsx
│   │           ├── SettingsPage.tsx
│   │           ├── ConnectPage.tsx
│   │           └── ApproveTxPage.tsx
│   ├── storage/
│   │   └── ChromeStorageAdapter.ts
│   ├── popup.html
│   ├── index.css               # Extension-specific styles
│   └── tsconfig.json
│
└── ... (existing PWA code)
```

## Trạng thái triển khai

### ✅ Phase 1: Đã hoàn thành

1. **@fun-wallet/shared package**
   - StorageAdapter interface
   - LocalStorageAdapter (PWA), ChromeStorageAdapter (Extension)
   - Shared types (Chain, Token, Wallet, Transaction, DApp, etc.)
   - Chain configurations (8 EVM chains)
   - Token constants (19+ tokens)
   - Encryption module (AES-256-GCM)
   - Wallet operations (ethers.js v6)

### ✅ Phase 2: Đã hoàn thành

1. **Build System**
   - Extension icons (16, 48, 128px)
   - Extension-specific CSS với design system
   - TSConfig riêng cho extension

2. **Core Features**
   - **HomePage**: Real token balances từ blockchain
   - **SendPage**: Full send functionality
   - **ReceivePage**: QR code + copy address
   - **Background**: Real password verification

3. **Security**
   - Password verification bằng decryption thực sự
   - Auto-lock sau 15 phút
   - chrome.runtime.getURL() cho assets

## Build Commands

```bash
# PWA
npm run dev        # Dev server
npm run build      # Production build

# Extension (cần thêm vite.config.extension.ts + @crxjs/vite-plugin)
npm run dev:ext    # Dev with HMR
npm run build:ext  # Production build
```

## Next Steps

- [ ] Thêm @crxjs/vite-plugin dependency
- [ ] Tạo vite.config.extension.ts
- [ ] Test build extension
- [ ] Load extension trong Chrome
