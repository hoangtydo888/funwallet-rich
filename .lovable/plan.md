
# Kế Hoạch: Sửa Lỗi Extension FUN Wallet

## Các Vấn Đề Đã Xác Định

### 1. Lỗi "Wallet is locked" khi gửi tiền từ FUN Profile
**Nguyên nhân**: 
- Khi DApp (FUN Profile PWA) gọi `eth_sendTransaction`, service worker kiểm tra `isLocked` 
- Nếu ví bị khóa → trả về lỗi ngay mà KHÔNG mở popup phê duyệt
- Service worker có cơ chế auto-lock sau 15 phút không hoạt động

**Dòng code gây lỗi** (service-worker.ts dòng 454-456):
```typescript
if (isLocked) {
  return { success: false, error: 'Wallet is locked' };
}
```

**Giải pháp**: Thay vì từ chối ngay, mở popup unlock trước rồi tiếp tục flow phê duyệt giao dịch

---

### 2. Token list chớp nháy (flickering)
**Nguyên nhân**:
- `useBalance` hook có `setLoading(true)` mỗi khi `fetchBalances` được gọi lại
- Khi `priceMap` thay đổi → `useCallback` tạo `fetchBalances` mới → `useEffect` chạy lại → `setLoading(true)` → hiện skeleton → fetch xong → hiện data
- Chu kỳ này lặp lại liên tục gây flickering

**Dòng code gây lỗi** (useBalance.ts dòng 106-108):
```typescript
useEffect(() => {
  mountedRef.current = true;
  setLoading(true);  // <- Gây flickering!
  fetchBalances();
```

**Giải pháp**: Chỉ `setLoading(true)` lần đầu tiên, các lần sau dùng background refresh

---

## Các File Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/background/service-worker.ts` | Thêm logic unlock trước khi xử lý transaction/sign |
| `src/shared/hooks/useBalance.ts` | Sửa logic loading để tránh flickering |

---

## Chi Tiết Thay Đổi

### 1. service-worker.ts - Xử lý "Wallet is locked"

**Vấn đề hiện tại với `eth_sendTransaction`:**
```typescript
async function handleSendTransaction(...) {
  if (isLocked) {
    return { success: false, error: 'Wallet is locked' };  // Từ chối ngay!
  }
  // ...
}
```

**Sửa thành:**
```typescript
async function handleSendTransaction(
  tx: TransactionRequest, 
  origin?: string, 
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void
): Promise<MessageResponse | null> {
  // Parse origin
  let parsedOrigin: string | undefined;
  if (origin) {
    try {
      parsedOrigin = new URL(origin).origin;
    } catch {
      parsedOrigin = origin;
    }
  }
  
  // Kiểm tra DApp đã kết nối chưa (phải check trước khi unlock)
  if (parsedOrigin && !connectedDApps.has(parsedOrigin)) {
    return { success: false, error: 'DApp not connected' };
  }
  
  // NẾU VÍ BỊ KHÓA: Tạo pending request và mở popup unlock
  // Sau khi unlock sẽ tự redirect sang approve-tx
  if (isLocked) {
    const requestId = `tx_${Date.now()}`;
    pendingRequests.set(requestId, {
      id: requestId,
      method: 'eth_sendTransaction',
      params: [tx],
      origin: parsedOrigin || 'unknown',
      timestamp: Date.now(),
      tabId,
    });
    
    // Mở popup unlock với redirect sau khi unlock
    await openPopupWithUnlockRedirect('approve-tx', {
      requestId,
      to: tx.to || '',
      value: tx.value || '0',
      data: tx.data || '',
      origin: parsedOrigin || 'unknown',
    });
    
    return null; // Response sẽ được gửi sau khi approve
  }
  
  // Ví đã unlock → tạo pending request và mở popup approve-tx
  const requestId = `tx_${Date.now()}`;
  pendingRequests.set(requestId, { ... });
  await openPopup('approve-tx', { ... });
  
  return null;
}
```

**Thêm helper function mới:**
```typescript
/**
 * Mở popup với unlock redirect
 * Nếu ví đang bị khóa, mở trang unlock trước
 * Sau khi unlock sẽ tự redirect đến target page
 */
async function openPopupWithUnlockRedirect(
  targetPage: string, 
  params: Record<string, unknown>
): Promise<void> {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const redirectPath = `${targetPage}?${queryString}`;
  
  // Encode redirect path để truyền qua URL
  const encodedRedirect = encodeURIComponent(redirectPath);
  
  await chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html#/unlock?redirect=${encodedRedirect}`),
    type: 'popup',
    width: 360,
    height: 600,
    focused: true,
  });
}
```

**Tương tự cho `handlePersonalSign` và `handleSignTypedData`**

---

### 2. UnlockPage.tsx - Thêm redirect sau unlock

**Thêm logic đọc redirect URL:**
```typescript
function UnlockPage({ onUnlock }: UnlockPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const redirectPath = searchParams.get('redirect');
  
  const handleUnlock = async () => {
    // ... unlock logic ...
    
    if (success) {
      onUnlock();
      
      // Nếu có redirect path, navigate đến đó
      if (redirectPath) {
        navigate(decodeURIComponent(redirectPath));
      }
    }
  };
}
```

---

### 3. useBalance.ts - Sửa flickering

**Thay đổi logic loading:**
```typescript
export const useBalance = (...) => {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);  // <-- THÊM MỚI

  const fetchBalances = useCallback(async () => {
    if (!address || !enabled || tokens.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // KHÔNG setLoading(true) ở đây nữa!
      
      const results: TokenBalance[] = [];
      // ... fetch logic ...

      if (mountedRef.current) {
        results.sort((a, b) => (b.balanceUsd || 0) - (a.balanceUsd || 0));
        setBalances(results);
        setLoading(false);
        initialLoadDone.current = true;
      }
    } catch (err) {
      // ... error handling ...
    }
  }, [address, tokens, priceMap, enabled]);

  // Initial fetch - CHỈ set loading lần đầu
  useEffect(() => {
    mountedRef.current = true;
    
    // Chỉ hiện loading nếu chưa có data
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    
    fetchBalances();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchBalances]);

  // ... rest of hook
};
```

---

## Flow Sau Khi Sửa

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW GỬI TIỀN MỚI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User click "Gửi" trên FUN Profile                          │
│                      ↓                                          │
│  2. DApp gọi eth_sendTransaction                                │
│                      ↓                                          │
│  3. Service worker nhận request                                 │
│                      ↓                                          │
│  4. Kiểm tra isLocked?                                          │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    ↓         ↓                                                  │
│  [YES]     [NO]                                                 │
│    ↓         ↓                                                  │
│  Mở popup   Mở popup                                            │
│  /unlock?   /approve-tx                                         │
│  redirect=  trực tiếp                                           │
│  approve-tx                                                     │
│    ↓         │                                                  │
│  User nhập  │                                                   │
│  mật khẩu   │                                                   │
│    ↓         │                                                  │
│  Redirect ──→┘                                                  │
│  /approve-tx                                                    │
│    ↓                                                            │
│  5. User xem và phê duyệt giao dịch                            │
│                      ↓                                          │
│  6. Giao dịch được ký và gửi lên blockchain                    │
│                      ↓                                          │
│  7. Trả txHash về DApp → Hiển thị thành công!                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

### Sau khi sửa lỗi "Wallet is locked":
- Khi user click "Gửi" trên FUN Profile
- Nếu ví bị khóa → popup unlock bung ra
- User nhập mật khẩu → popup chuyển sang màn hình phê duyệt giao dịch
- User click "Phê duyệt" → giao dịch được gửi thành công

### Sau khi sửa flickering:
- Token list hiển thị ổn định, không chớp nháy
- Data được cập nhật "ngầm" mà không hiện loading skeleton mỗi lần refresh

---

## Bước Sau Khi Implement

1. Build extension: `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile và thử gửi tiền
4. Xác nhận popup unlock/approve-tx hoạt động đúng
5. Kiểm tra token list không còn chớp nháy
