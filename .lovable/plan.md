# FUN Wallet - Chrome Extension Development Plan

## Overview
Building a Chrome Extension version of FUN Wallet that shares core logic with the PWA.

---

## Phase 1: Extension Structure ✅ COMPLETED

Created base structure for Chrome Extension:
- `src/extension/` - Extension source code
- Manifest V3 configuration
- Popup, Background, Content scripts structure
- TypeScript configuration for extension

---

## Phase 2: Shared Core Logic ✅ COMPLETED

Moved core logic to `src/shared/`:
- `lib/wallet.ts` - Wallet operations (create, import, sign, etc.)
- `lib/encryption.ts` - AES-256-GCM encryption
- `constants/tokens.ts` - Token definitions
- `constants/chains.ts` - Chain configurations
- `storage/types.ts` - Storage adapter interface
- `types/index.ts` - Shared TypeScript types

---

## Phase 3: Vite Build Config ✅ COMPLETED

Created dedicated build system for extension:
- `vite.config.extension.ts` - Separate Vite config
- `@crxjs/vite-plugin` integration
- Build commands: `dev:ext`, `build:ext`
- Output to `dist-extension/`
- Token icons copied to extension public folder

---

## Phase 4: Code Reusable từ PWA ✅ COMPLETED

### Shared Libraries Created:
- `src/shared/lib/dexscreener.ts` - DexScreener API integration
- `src/shared/lib/priceTracker.ts` - Price fetching with cache support

### Shared Hooks Created:
- `src/shared/hooks/useTokenPrices.ts` - Real-time price fetching with auto-refresh
- `src/shared/hooks/useBalance.ts` - Token balance fetching with USD calculations

### Extension UI Components:
- `src/extension/src/lib/utils.ts` - CN utility for class merging
- `src/extension/src/components/ui/Button.tsx` - Shadcn-style button
- `src/extension/src/components/ui/Input.tsx` - Form input component
- `src/extension/src/components/ui/Card.tsx` - Card layout components
- `src/extension/src/components/ui/Skeleton.tsx` - Loading skeleton
- `src/extension/src/components/TokenList.tsx` - Token list with balances

### Updated Files:
- `src/shared/index.ts` - Export all shared modules (selective to avoid conflicts)
- `src/lib/priceTracker.ts` - Re-export from shared + PWA-specific localStorage functions
- `src/lib/dexscreener.ts` - Re-export from shared
- `src/extension/src/popup/pages/HomePage.tsx` - Now uses shared hooks (useTokenPrices, useBalance)

---

## Phase 5: DApp Connection (EIP-1193) 🔜 NEXT

### Goals:
- Implement EIP-1193 provider for DApp connections
- Enable wallet to connect to PancakeSwap, Uniswap, etc.
- Content script injection for provider

### Files to Create:
- `src/extension/src/provider/EIP1193Provider.ts`
- `src/extension/src/content/provider-inject.ts`
- Update `service-worker.ts` for message handling

---

## Phase 6: WalletConnect Integration 🔜 FUTURE

### Goals:
- QR code scanning for WalletConnect
- Session management
- Transaction approval UI

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                   src/shared/                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  lib/                                             │  │
│  │  ├── wallet.ts      ← Core wallet operations      │  │
│  │  ├── encryption.ts  ← AES-256-GCM                 │  │
│  │  ├── priceTracker.ts ← Price APIs + caching       │  │
│  │  └── dexscreener.ts  ← DEX API                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  hooks/                                           │  │
│  │  ├── useTokenPrices.ts ← Real-time prices         │  │
│  │  └── useBalance.ts     ← Token balances           │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  constants/                                       │  │
│  │  ├── tokens.ts     ← Token definitions            │  │
│  │  └── chains.ts     ← Chain configs                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  storage/                                         │  │
│  │  ├── types.ts      ← StorageAdapter interface     │  │
│  │  └── LocalStorageAdapter.ts                       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐            ┌─────────────────┐
│   PWA (src/)    │            │   Extension     │
│                 │            │  (src/extension)│
│  • Re-exports   │            │                 │
│    from shared  │            │  • Imports      │
│  • Full UI      │            │    from shared  │
│  • Supabase     │            │  • Popup UI     │
│  • Router       │            │  • Chrome APIs  │
└─────────────────┘            └─────────────────┘
```

---

## Build Commands

```bash
# PWA Development
npm run dev

# Extension Development
npm run dev:ext

# Build PWA
npm run build

# Build Extension
npm run build:ext
```

---

## Code Sharing Benefits

| Metric | Before Phase 4 | After Phase 4 |
|--------|----------------|---------------|
| Code duplication | ~40% | <10% |
| Shared logic files | 3 | 8+ |
| Maintenance | 2 codebases | Single source |
| Bug fixes | Manual sync | Automatic |
