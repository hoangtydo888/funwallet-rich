
# Kế Hoạch: Sửa Lỗi Phê Duyệt Giao Dịch & Tối Ưu Hiển Thị Số Dư

## Các Vấn Đề Đã Xác Định

### 1. Lỗi "Phê Duyệt" Không Hoạt Động (Hình 1)
Khi bấm "Phê duyệt" trong popup, giao dịch không được gửi thành công. Sau khi phân tích code:

**Nguyên nhân tiềm ẩn:**
- Trong `ApproveTxPage.tsx`, khi gửi giao dịch từ DApp, popup mở qua `chrome.windows.create()` - là cửa sổ độc lập
- Tuy nhiên, `requestId` có thể không được truyền đúng khi popup mở dưới dạng floating window
- Lệnh `await chrome.runtime.sendMessage({ type: 'APPROVE_TRANSACTION', ... })` có thể không response về đúng tab DApp

**Vấn đề cụ thể trong code:**
- Dòng 136-139: Gửi `APPROVE_TRANSACTION` đến background
- Background (dòng 556-563): Gửi response về `request.tabId` - nhưng nếu `tabId` không được lưu đúng thì DApp không nhận được response

### 2. Số Dư Không Hiển Thị Liền (Hình 2)
Khi kết nối ví, số dư hiện $0.0000 - phải reload trang mới có.

**Nguyên nhân:**
- `HomePage.tsx` dùng `useBalance` hook với `autoRefresh: false` (dòng 38-39)
- Hook chỉ fetch khi `address` thay đổi (useEffect dependency)
- Sau khi kết nối, DApp chưa trigger refresh cho popup
- Trong `ConnectPage.tsx`, sau approve connection không có trigger refresh balance

### 3. Chưa Hỗ Trợ Đầy Đủ 4 Token Ưu Tiên
Cần đảm bảo 4 token chính hoạt động đúng:
- **USDT**: `0x55d398326f99059fF775485246999027B3197955` (18 decimals) ✓
- **BNB**: native (null address) ✓
- **CAMLY COIN**: `0x0910320181889fefde0bb1ca63962b0a8882e413` (3 decimals) ✓ 
- **BTC (BTCB)**: `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` (18 decimals) ✓

**Đã có trong `COMMON_TOKENS`** - tất cả 4 token đều đã được định nghĩa đúng địa chỉ.

---

## Files Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/pages/ApproveTxPage.tsx` | Thêm logging chi tiết và xử lý lỗi tốt hơn |
| `src/extension/src/popup/pages/ConnectPage.tsx` | Trigger refresh sau khi connect thành công |
| `src/extension/src/popup/pages/HomePage.tsx` | Tự động refresh khi popup mở |
| `src/extension/src/background/service-worker.ts` | Đảm bảo `tabId` được lưu và sử dụng đúng |

---

## Chi Tiết Thay Đổi

### 1. ApproveTxPage.tsx - Cải Thiện Xử Lý Giao Dịch

**Vấn đề:** `window.close()` đóng popup quá sớm trước khi message được gửi hoàn toàn.

**Giải pháp:**
```typescript
// SAU KHI GỬI GIAO DỊCH THÀNH CÔNG
const txResponse = await wallet.sendTransaction(tx);
console.log('[ApproveTxPage] Transaction sent:', txResponse.hash);

// Thêm: Đợi transaction được broadcast
await txResponse.wait(0); // Chờ ít nhất 0 confirmations (broadcast)

// Notify background - sử dụng Promise để đảm bảo response đi trước
await new Promise<void>((resolve) => {
  chrome.runtime.sendMessage({
    type: 'APPROVE_TRANSACTION',
    payload: { requestId, txHash: txResponse.hash }
  }, () => {
    resolve();
  });
});

// Đợi đủ thời gian để message được xử lý
setTimeout(() => window.close(), 1000);
```

### 2. HomePage.tsx - Auto Refresh Khi Popup Mở

**Thêm logic refresh khi popup được focus:**
```typescript
useEffect(() => {
  // Refresh balances khi popup được mở/focus
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && address) {
      refreshBalances();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Trigger refresh ngay khi có address
  if (address) {
    refreshBalances();
  }
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [address]);
```

### 3. ConnectPage.tsx - Trigger Refresh Sau Connect

Sau khi approve connection thành công, gửi message để refresh data:
```typescript
// Sau approve connection
await chrome.runtime.sendMessage({
  type: 'APPROVE_CONNECTION',
  payload: { requestId, origin }
});

// Thêm: broadcast event để refresh
chrome.runtime.sendMessage({ type: 'REFRESH_BALANCES' });
```

### 4. service-worker.ts - Đảm Bảo tabId Được Truyền Đúng

Kiểm tra và log `tabId` trong các handler:
```typescript
// Trong handleSendTransaction
console.log('[Service Worker] Saving request with tabId:', tabId);

// Trong handleApproveTransaction  
console.log('[Service Worker] Sending response to tabId:', request.tabId);
```

---

## Sơ Đồ Flow Sau Khi Sửa

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLOW GỬI TIỀN TỪ DAPP                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DApp gọi eth_sendTransaction                                        │
│       │                                                                 │
│       ▼                                                                 │
│  2. inject.ts nhận request, gửi đến service-worker                     │
│       │ (kèm tabId)                                                    │
│       ▼                                                                 │
│  3. service-worker lưu pending request với tabId                       │
│       │                                                                 │
│       ▼                                                                 │
│  4. Mở floating popup (approve-tx)                                     │
│       │                                                                 │
│       ▼                                                                 │
│  5. User nhập password, bấm Phê duyệt                                  │
│       │                                                                 │
│       ▼                                                                 │
│  6. ApproveTxPage gửi transaction lên blockchain                       │
│       │                                                                 │
│       ▼ await txResponse.wait(0) - ĐỢI BROADCAST                       │
│                                                                         │
│  7. Gửi APPROVE_TRANSACTION đến service-worker                         │
│       │ (kèm txHash và requestId)                                      │
│       ▼                                                                 │
│  8. service-worker forward txHash đến tab DApp qua tabId               │
│       │                                                                 │
│       ▼                                                                 │
│  9. inject.ts nhận response, forward đến inpage.ts                     │
│       │                                                                 │
│       ▼                                                                 │
│  10. DApp nhận txHash → Hiển thị thành công!                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. **Phê duyệt giao dịch hoạt động**: Bấm "Phê duyệt" → Giao dịch được gửi → Popup đóng → DApp hiển thị txHash
2. **Số dư hiển thị ngay**: Sau khi kết nối ví → Số dư tự động cập nhật không cần reload
3. **Hỗ trợ đủ 4 token**: USDT, BNB, CAMLY, BTCB đều có thể gửi/nhận từ DApp và extension

---

## Phần Kỹ Thuật Chi Tiết

### Vấn đề timing của floating popup

Khi sử dụng `chrome.windows.create()` thay vì Side Panel:
- Popup là cửa sổ độc lập, không share context với tab DApp
- `window.close()` phải đợi message được gửi hoàn toàn trước khi đóng
- Cần thêm `await` cho `chrome.runtime.sendMessage` với callback

### Token decimals validation

Đảm bảo CAMLY với 3 decimals được xử lý đúng trong `sendToken()`:
```typescript
// wallet.ts đã có logic này:
const actualDecimals = await contract.decimals();
const useDecimals = Number(actualDecimals);
```

### Xử lý trường hợp tab đã đóng

Khi user đóng tab DApp trước khi approve:
```typescript
if (request.tabId) {
  try {
    await chrome.tabs.sendMessage(request.tabId, {...});
  } catch (err) {
    console.warn('[Service Worker] Tab may be closed:', err);
  }
}
```

---

## Bước Test Sau Khi Implement

1. **Test gửi BNB từ DApp:**
   - Mở FUN Profile DApp → Gửi 0.001 BNB
   - Popup nổi mở → Nhập mật khẩu → Bấm Phê duyệt
   - **Xác nhận:** Giao dịch thành công, DApp không còn "Đang gửi..."

2. **Test số dư tự động cập nhật:**
   - Disconnect ví → Connect lại
   - **Xác nhận:** Số dư hiển thị ngay, không cần reload

3. **Test gửi từng token:**
   - Gửi USDT, BNB, CAMLY, BTCB từ extension SendPage
   - **Xác nhận:** Tất cả đều thành công với đúng decimals
