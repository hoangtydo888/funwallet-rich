
# Kế Hoạch Sửa Lỗi Import Path - Chrome Extension

## Tổng Quan Vấn Đề

Vite config của Extension có cấu hình `root: './src/extension'` và alias `@shared` trỏ đến `./src/shared`. Các file đang dùng đường dẫn tương đối `../../../shared/...` hoặc `../../shared/...` nhưng với cấu hình này Vite không resolve được.

**Giải pháp:** Thay tất cả relative imports thành alias `@shared/...`

---

## Danh Sách 9 Files Cần Sửa

### 1. ChromeStorageAdapter.ts
**Vị trí:** `src/extension/storage/ChromeStorageAdapter.ts`

```typescript
// Dòng 1 - TRƯỚC:
import { StorageAdapter } from '../../shared/storage/types';

// SAU:
import { StorageAdapter } from '@shared/storage/types';
```

---

### 2. service-worker.ts
**Vị trí:** `src/extension/src/background/service-worker.ts`

```typescript
// Dòng 12-21 - TRƯỚC:
import { chromeStorageAdapter } from '../storage/ChromeStorageAdapter';
import { STORAGE_KEYS } from '../../shared/storage/types';
import { decryptPrivateKey } from '../../shared/lib/encryption';
import { DAppConnection, PendingRequest, TransactionRequest, SecureWalletStorage } from '../../shared/types';
import { BSC_MAINNET } from '../../shared/constants/tokens';

// SAU:
import { chromeStorageAdapter } from '../../storage/ChromeStorageAdapter';
import { STORAGE_KEYS } from '@shared/storage/types';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { DAppConnection, PendingRequest, TransactionRequest, SecureWalletStorage } from '@shared/types';
import { BSC_MAINNET } from '@shared/constants/tokens';
```

---

### 3. HomePage.tsx
**Vị trí:** `src/extension/src/popup/pages/HomePage.tsx`

```typescript
// Dòng 11-16 - TRƯỚC:
import { formatAddress } from '../../../shared/lib/wallet';
import { COMMON_TOKENS } from '../../../shared/constants/tokens';
import { STORAGE_KEYS } from '../../../shared/storage/types';
import { useTokenPrices } from '../../../shared/hooks/useTokenPrices';
import { useBalance } from '../../../shared/hooks/useBalance';
import { formatPrice } from '../../../shared/lib/priceTracker';

// SAU:
import { formatAddress } from '@shared/lib/wallet';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { STORAGE_KEYS } from '@shared/storage/types';
import { useTokenPrices } from '@shared/hooks/useTokenPrices';
import { useBalance } from '@shared/hooks/useBalance';
import { formatPrice } from '@shared/lib/priceTracker';
```

---

### 4. ReceivePage.tsx
**Vị trí:** `src/extension/src/popup/pages/ReceivePage.tsx`

```typescript
// Dòng 5-6 - TRƯỚC:
import { formatAddress } from '../../../shared/lib/wallet';
import { STORAGE_KEYS } from '../../../shared/storage/types';

// SAU:
import { formatAddress } from '@shared/lib/wallet';
import { STORAGE_KEYS } from '@shared/storage/types';
```

---

### 5. SendPage.tsx
**Vị trí:** `src/extension/src/popup/pages/SendPage.tsx`

```typescript
// Dòng 4-14 - TRƯỚC:
import { isValidAddress, formatBalance, sendNativeToken, sendToken, getNativeBalance, getTokenBalance } from '../../../shared/lib/wallet';
import { COMMON_TOKENS } from '../../../shared/constants/tokens';
import { decryptPrivateKey } from '../../../shared/lib/encryption';
import { STORAGE_KEYS } from '../../../shared/storage/types';

// SAU:
import { isValidAddress, formatBalance, sendNativeToken, sendToken, getNativeBalance, getTokenBalance } from '@shared/lib/wallet';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
```

---

### 6. SettingsPage.tsx
**Vị trí:** `src/extension/src/popup/pages/SettingsPage.tsx`

```typescript
// Dòng 4 - TRƯỚC:
import { DAppConnection } from '../../../shared/types';

// SAU:
import { DAppConnection } from '@shared/types';
```

---

### 7. ApproveTxPage.tsx
**Vị trí:** `src/extension/src/popup/pages/ApproveTxPage.tsx`

```typescript
// Dòng 5-7 - TRƯỚC:
import { decryptPrivateKey } from '../../../shared/lib/encryption';
import { SecureWalletStorage } from '../../../shared/types';
import { BSC_MAINNET } from '../../../shared/constants/tokens';

// SAU:
import { decryptPrivateKey } from '@shared/lib/encryption';
import { SecureWalletStorage } from '@shared/types';
import { BSC_MAINNET } from '@shared/constants/tokens';
```

---

### 8. ApproveSignPage.tsx
**Vị trí:** `src/extension/src/popup/pages/ApproveSignPage.tsx`

```typescript
// Dòng 5-6 - TRƯỚC:
import { decryptPrivateKey } from '../../../shared/lib/encryption';
import { SecureWalletStorage } from '../../../shared/types';

// SAU:
import { decryptPrivateKey } from '@shared/lib/encryption';
import { SecureWalletStorage } from '@shared/types';
```

---

### 9. ConnectedDAppsPage.tsx
**Vị trí:** `src/extension/src/popup/pages/ConnectedDAppsPage.tsx`

```typescript
// Dòng 4 - TRƯỚC:
import { DAppConnection } from '../../../shared/types';

// SAU:
import { DAppConnection } from '@shared/types';
```

---

### 10. TokenList.tsx
**Vị trí:** `src/extension/src/components/TokenList.tsx`

```typescript
// Dòng 6-7 - TRƯỚC:
import { formatBalance } from '../../shared/lib/wallet';
import { formatPrice } from '../../shared/lib/priceTracker';

// SAU:
import { formatBalance } from '@shared/lib/wallet';
import { formatPrice } from '@shared/lib/priceTracker';
```

---

## Tóm Tắt Thay Đổi

| STT | File | Số imports sửa |
|-----|------|----------------|
| 1 | ChromeStorageAdapter.ts | 1 |
| 2 | service-worker.ts | 5 |
| 3 | HomePage.tsx | 6 |
| 4 | ReceivePage.tsx | 2 |
| 5 | SendPage.tsx | 4 |
| 6 | SettingsPage.tsx | 1 |
| 7 | ApproveTxPage.tsx | 3 |
| 8 | ApproveSignPage.tsx | 2 |
| 9 | ConnectedDAppsPage.tsx | 1 |
| 10 | TokenList.tsx | 2 |

**Tổng: 27 imports cần sửa trong 10 files**

---

## Sau Khi Sửa

Chạy lại lệnh build:

```bash
npm run build:ext
```

Build thành công sẽ tạo folder `dist-extension/` để load vào Chrome.
