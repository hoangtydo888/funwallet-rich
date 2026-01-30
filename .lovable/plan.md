
# Phase 4: Code Reusable từ PWA

## Tổng Quan

Phase này sẽ tối ưu hóa cấu trúc code bằng cách:
1. **Di chuyển core logic vào shared** - PriceTracker, DexScreener APIs
2. **Tạo reusable UI components** - Button, Input, Card cho extension
3. **Tạo shared hooks** - useTokenPrices, useBalance có thể dùng cả PWA và Extension
4. **Cập nhật Extension imports** - Sử dụng shared code thay vì duplicate

---

## 1. Di Chuyển Price Tracker vào Shared

**File mới: `src/shared/lib/priceTracker.ts`**

| Hàm | Mô tả |
|-----|-------|
| `fetchTokenPrices()` | Fetch giá từ DexScreener + CoinGecko |
| `formatPrice()` | Format số tiền USD |
| `formatChange()` | Format % thay đổi 24h |
| `formatMarketCap()` | Format market cap |

**Lý do**: Cả PWA và Extension đều cần fetch/hiển thị giá token realtime

---

## 2. Di Chuyển DexScreener API vào Shared

**File mới: `src/shared/lib/dexscreener.ts`**

| Hàm | Mô tả |
|-----|-------|
| `fetchTokenFromDexScreener()` | Fetch token data từ DEX |
| `TOKEN_ADDRESSES` | Mapping symbol → contract address |

---

## 3. Tạo Reusable UI Components cho Extension

**Folder: `src/extension/src/components/ui/`**

### Components cần tạo:

| Component | Copy từ | Thay đổi |
|-----------|---------|----------|
| `Button.tsx` | `src/components/ui/button.tsx` | Thêm extension-specific styles |
| `Input.tsx` | `src/components/ui/input.tsx` | Fixed width cho popup |
| `Card.tsx` | `src/components/ui/card.tsx` | Compact size |
| `Skeleton.tsx` | `src/components/ui/skeleton.tsx` | Không thay đổi |
| `Select.tsx` | `src/components/ui/select.tsx` | Responsive cho popup |

### Utils cần copy:

| File | Source | Purpose |
|------|--------|---------|
| `cn.ts` | `src/lib/utils.ts` | Class name merger |

---

## 4. Tạo Shared Custom Hooks

### 4.1 useTokenPrices Hook

**File: `src/shared/hooks/useTokenPrices.ts`**

```text
┌─────────────────────────────────────────────────────────┐
│ useTokenPrices(symbols: string[])                       │
├─────────────────────────────────────────────────────────┤
│ Returns:                                                │
│   • prices: TokenPrice[]                                │
│   • loading: boolean                                    │
│   • error: string | null                                │
│   • refetch: () => void                                 │
├─────────────────────────────────────────────────────────┤
│ Features:                                               │
│   • Auto-refresh mỗi 30s                                │
│   • Cache results                                       │
│   • Error handling                                      │
│   • Works in both PWA & Extension                       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 useBalance Hook

**File: `src/shared/hooks/useBalance.ts`**

```text
┌─────────────────────────────────────────────────────────┐
│ useBalance(address: string, tokens: Token[])            │
├─────────────────────────────────────────────────────────┤
│ Returns:                                                │
│   • balances: TokenBalance[]                            │
│   • totalUsd: number                                    │
│   • loading: boolean                                    │
│   • refresh: () => void                                 │
├─────────────────────────────────────────────────────────┤
│ Features:                                               │
│   • Fetch from blockchain                               │
│   • Calculate USD values                                │
│   • Cache balances                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Cập Nhật Extension Components

### 5.1 HomePage.tsx Updates

| Before | After |
|--------|-------|
| Hardcoded `TOKEN_PRICES` | Import `useTokenPrices` hook |
| Manual balance fetch | Import `useBalance` hook |
| No caching | LocalStorage/ChromeStorage cache |

### 5.2 SendPage.tsx Updates

| Before | After |
|--------|-------|
| Basic UI | Use shared Button, Input, Select |
| Manual validation | Use shared `isValidAddress` |
| No gas estimation | Add gas estimation từ shared |

---

## 6. Tạo TokenList Component cho Extension

**File: `src/extension/src/components/TokenList.tsx`**

Simplified version của PWA TokenList:
- Fixed height cho popup
- Không có search filter (không đủ space)
- Click để xem chi tiết token
- Hiển thị balance + USD value

---

## 7. Files Cần Tạo/Sửa

### Files mới trong Shared:

| File | Mô tả |
|------|-------|
| `src/shared/lib/priceTracker.ts` | Price fetching logic |
| `src/shared/lib/dexscreener.ts` | DexScreener API |
| `src/shared/hooks/useTokenPrices.ts` | Price hook |
| `src/shared/hooks/useBalance.ts` | Balance hook |
| `src/shared/index.ts` | Update exports |

### Files mới trong Extension:

| File | Mô tả |
|------|-------|
| `src/extension/src/lib/utils.ts` | CN function |
| `src/extension/src/components/ui/Button.tsx` | Button component |
| `src/extension/src/components/ui/Input.tsx` | Input component |
| `src/extension/src/components/ui/Skeleton.tsx` | Loading skeleton |
| `src/extension/src/components/TokenList.tsx` | Token list UI |

### Files cần update:

| File | Thay đổi |
|------|----------|
| `src/extension/src/popup/pages/HomePage.tsx` | Use shared hooks |
| `src/extension/src/popup/pages/SendPage.tsx` | Use shared components |
| `src/lib/priceTracker.ts` | Re-export từ shared |
| `src/lib/dexscreener.ts` | Re-export từ shared |

---

## 8. Dependency Graph

```text
┌─────────────────────────────────────────────────────────┐
│                   src/shared/                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  lib/                                             │  │
│  │  ├── wallet.ts      ← Core wallet operations      │  │
│  │  ├── encryption.ts  ← AES-256-GCM                 │  │
│  │  ├── priceTracker.ts ← NEW: Price APIs            │  │
│  │  └── dexscreener.ts  ← NEW: DEX API               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  hooks/                                           │  │
│  │  ├── useTokenPrices.ts ← NEW: Price hook          │  │
│  │  └── useBalance.ts     ← NEW: Balance hook        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐            ┌─────────────────┐
│   PWA (src/)    │            │   Extension     │
│                 │            │                 │
│  • Re-exports   │            │  • Imports      │
│    from shared  │            │    from shared  │
│  • UI Components│            │  • Own UI       │
│  • Supabase     │            │  • Chrome APIs  │
└─────────────────┘            └─────────────────┘
```

---

## 9. Technical Details

### 9.1 PriceTracker với Storage Adapter

```typescript
// src/shared/lib/priceTracker.ts
import { StorageAdapter } from '../storage/types';

const CACHE_KEY = 'fun_wallet_prices_cache';
const CACHE_TTL = 30000; // 30 seconds

export const fetchTokenPricesWithCache = async (
  symbols: string[],
  storage: StorageAdapter
): Promise<TokenPrice[]> => {
  // Check cache first
  const cached = await storage.get(CACHE_KEY);
  if (cached) {
    const { prices, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return prices;
    }
  }
  
  // Fetch fresh prices
  const prices = await fetchTokenPrices(symbols);
  
  // Cache results
  await storage.set(CACHE_KEY, JSON.stringify({
    prices,
    timestamp: Date.now()
  }));
  
  return prices;
};
```

### 9.2 useBalance Hook Implementation

```typescript
// src/shared/hooks/useBalance.ts
import { useState, useEffect, useCallback } from 'react';
import { getNativeBalance, getTokenBalance } from '../lib/wallet';
import { Token, TokenBalance } from '../types';

interface UseBalanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useBalance = (
  address: string | null,
  tokens: Token[],
  options: UseBalanceOptions = {}
) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchBalances = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    const results: TokenBalance[] = [];
    
    for (const token of tokens) {
      let balance = '0';
      if (token.address === null) {
        balance = await getNativeBalance(address);
      } else {
        balance = await getTokenBalance(token.address, address);
      }
      results.push({ ...token, balance });
    }
    
    setBalances(results);
    setLoading(false);
  }, [address, tokens]);
  
  useEffect(() => {
    fetchBalances();
    
    if (autoRefresh) {
      const interval = setInterval(fetchBalances, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBalances, autoRefresh, refreshInterval]);
  
  return { balances, loading, refresh: fetchBalances };
};
```

---

## 10. Kết Quả Mong Đợi

Sau Phase 4:

| Metric | Before | After |
|--------|--------|-------|
| Code duplication | ~40% | <10% |
| Shared logic | 3 files | 8+ files |
| Extension size | Larger | Optimized |
| Maintainability | Separate | Single source |

### Benefits:

- PWA và Extension dùng chung price fetching logic
- Bug fixes apply cho cả 2 platforms
- Consistent UI/UX across platforms
- Easier testing với shared hooks
- Reduced bundle size trong extension
