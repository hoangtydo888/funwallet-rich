
# Kế Hoạch: Sửa Lỗi Gửi Tiền Extension FUN Wallet

## Vấn Đề Đã Xác Định

### Vấn Đề 1: Token list chỉ hiển thị 5 token

Trong `SendPage.tsx` dòng 50:
```typescript
const topTokens = COMMON_TOKENS.slice(0, 5);
```
Chỉ lấy 5 token đầu tiên (CAMLY, BTCB, USDT, BNB, USDC) thay vì tất cả **19 token** trong danh sách `COMMON_TOKENS`.

**Giải pháp**: Hiển thị toàn bộ `COMMON_TOKENS` (19 token) thay vì giới hạn 5 token.

---

### Vấn Đề 2: Bấm "Phê duyệt" không gửi được tiền

Từ hình ảnh, con gửi từ **FUN Profile DApp** chứ không phải gửi trực tiếp từ extension. Flow như sau:

```text
FUN Profile DApp → eth_sendTransaction → Extension popup approve-tx
                                            ↓
                         User bấm "Phê duyệt" + nhập mật khẩu
                                            ↓
                         Extension gửi tx lên blockchain
                                            ↓
                         Gửi APPROVE_TRANSACTION về service-worker
                                            ↓
                         Service worker gửi FUN_WALLET_RESPONSE về content script
                                            ↓
                         Content script forward về inpage.ts → DApp nhận txHash
```

**Vấn đề có thể xảy ra**:

1. **Response không về DApp**: Sau khi extension gửi transaction thành công, cần gửi `txHash` về lại DApp qua message chain: `popup → service-worker → content script (inject.ts) → inpage.ts → DApp`

2. **Tab bị mất kết nối**: Khi popup mở ra từ `handleSendTransaction`, có thể `tabId` không được lưu đúng, khiến việc gửi response về content script thất bại.

Kiểm tra `ApproveTxPage.tsx` dòng 133-136:
```typescript
await chrome.runtime.sendMessage({
  type: 'APPROVE_TRANSACTION',
  payload: { requestId, txHash: txResponse.hash }
});
```

Và `service-worker.ts` dòng 540-546:
```typescript
if (request.tabId && payload.txHash) {
  chrome.tabs.sendMessage(request.tabId, {
    type: 'FUN_WALLET_RESPONSE',
    requestId: payload.requestId,
    result: payload.txHash,
  }).catch(console.error);
}
```

**Vấn đề thực sự**: Trong `handleSendTransaction`, `tabId` được lưu vào `pendingRequests`, nhưng khi user unlock rồi redirect, popup mất context của request cũ. Cần đảm bảo `requestId` được truyền đúng qua flow unlock-redirect.

---

## Các File Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/pages/SendPage.tsx` | Hiển thị tất cả token thay vì 5 token |
| `src/extension/src/popup/pages/HomePage.tsx` | Hiển thị tất cả token thay vì 5 token |
| `src/extension/src/popup/pages/ApproveTxPage.tsx` | Thêm logging để debug + đảm bảo response gửi đúng |
| `src/extension/src/background/service-worker.ts` | Thêm logging + xử lý edge case khi tabId không tồn tại |

---

## Chi Tiết Thay Đổi

### 1. SendPage.tsx - Hiển thị tất cả 19 token

**Dòng 50**: Thay đổi từ:
```typescript
const topTokens = COMMON_TOKENS.slice(0, 5);
```

Thành:
```typescript
// Hiển thị tất cả token (không giới hạn 5)
const topTokens = COMMON_TOKENS;
```

**Dòng 264**: Tăng chiều cao dropdown từ `max-h-40` lên `max-h-60`:
```typescript
<div className="mt-2 bg-muted rounded-xl overflow-hidden max-h-60 overflow-y-auto">
```

### 2. HomePage.tsx - Hiển thị tất cả token

**Dòng 25**: Thay đổi:
```typescript
const topTokens = COMMON_TOKENS.slice(0, 5);
```

Thành:
```typescript
const topTokens = COMMON_TOKENS; // Hiển thị tất cả token
```

### 3. ApproveTxPage.tsx - Thêm logging + Xử lý response tốt hơn

**Thêm log chi tiết** trong `handleApprove`:
```typescript
const handleApprove = async () => {
  // ...existing validation...
  
  try {
    // ...existing wallet decryption...
    
    // Send transaction
    const txResponse = await wallet.sendTransaction(tx);
    console.log('[ApproveTxPage] Transaction sent:', txResponse.hash);
    
    // Notify background of success - CRITICAL: phải gửi đúng requestId
    console.log('[ApproveTxPage] Sending APPROVE_TRANSACTION with requestId:', requestId);
    
    const response = await chrome.runtime.sendMessage({
      type: 'APPROVE_TRANSACTION',
      payload: { requestId, txHash: txResponse.hash }
    });
    
    console.log('[ApproveTxPage] APPROVE_TRANSACTION response:', response);
    
    // Wait a moment before closing to ensure message is sent
    setTimeout(() => window.close(), 500);
  } catch (err) {
    // ...error handling...
  }
};
```

### 4. service-worker.ts - Cải thiện xử lý response

**Cập nhật `handleApproveTransaction`** để xử lý edge cases:
```typescript
async function handleApproveTransaction(payload: { requestId: string; signedTx?: string; txHash?: string }): Promise<MessageResponse> {
  console.log('[Service Worker] handleApproveTransaction called with:', payload);
  
  const request = pendingRequests.get(payload.requestId);
  if (!request) {
    console.warn('[Service Worker] Request not found:', payload.requestId);
    return { success: false, error: 'Request not found or expired' };
  }
  
  console.log('[Service Worker] Found pending request:', request);
  
  // Send tx hash to content script
  if (payload.txHash) {
    if (request.tabId) {
      try {
        await chrome.tabs.sendMessage(request.tabId, {
          type: 'FUN_WALLET_RESPONSE',
          requestId: payload.requestId,
          result: payload.txHash,
        });
        console.log('[Service Worker] Sent response to tab:', request.tabId);
      } catch (err) {
        console.error('[Service Worker] Failed to send to tab:', request.tabId, err);
        // Tab có thể đã đóng hoặc không còn tồn tại
      }
    } else {
      console.warn('[Service Worker] No tabId for request, cannot send response to DApp');
    }
  }
  
  pendingRequests.delete(payload.requestId);
  return { success: true, data: { txHash: payload.txHash } };
}
```

---

## Kiểm Tra Thêm: Tại Sao Transaction Không Thực Sự Gửi Được

Nếu sau các sửa đổi trên mà vẫn không gửi được, vấn đề có thể ở:

1. **Mật khẩu sai** → kiểm tra lỗi decrypt
2. **Số dư không đủ** → cần có BNB cho gas fee
3. **RPC error** → BSC RPC có thể timeout

**Thêm logging chi tiết trong ApproveTxPage**:
```typescript
try {
  const txResponse = await wallet.sendTransaction(tx);
  console.log('[ApproveTxPage] TX SUCCESS:', txResponse.hash);
} catch (err) {
  console.error('[ApproveTxPage] TX FAILED:', err);
  // Hiển thị lỗi cụ thể
  if (err.message.includes('insufficient funds')) {
    setError('Số dư không đủ để trả phí gas');
  } else if (err.message.includes('nonce')) {
    setError('Lỗi nonce, vui lòng thử lại');
  } else {
    setError(`Giao dịch thất bại: ${err.message}`);
  }
}
```

---

## Flow Sau Khi Sửa

```text
┌─────────────────────────────────────────────────────────────────┐
│                  TOKEN SELECTION FIX                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SendPage.tsx:                                                  │
│  ┌─────────────────────────────────────┐                       │
│  │ Chọn token         [CAMLY ▼]        │                       │
│  │  ┌────────────────────────────────┐ │                       │
│  │  │ CAMLY     ◄── 1                │ │                       │
│  │  │ BTCB      ◄── 2                │ │ Hiển thị              │
│  │  │ USDT      ◄── 3                │ │ tất cả                │
│  │  │ BNB       ◄── 4                │ │ 19 token              │
│  │  │ USDC      ◄── 5                │ │ (có scroll)           │
│  │  │ ETH       ◄── 6 (MỚI!)         │ │                       │
│  │  │ CAKE      ◄── 7 (MỚI!)         │ │                       │
│  │  │ ...       ◄── ...              │ │                       │
│  │  │ BTT       ◄── 19 (MỚI!)        │ │                       │
│  │  └────────────────────────────────┘ │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  TRANSACTION FLOW FIX                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FUN Profile DApp                                               │
│        │                                                        │
│        ▼ eth_sendTransaction                                    │
│  inject.ts → service-worker                                     │
│        │                                                        │
│        ▼ (tabId saved in pendingRequests)                       │
│  Popup: ApproveTxPage                                           │
│        │                                                        │
│        ▼ User nhập password + click "Phê duyệt"                │
│  wallet.sendTransaction()                                       │
│        │                                                        │
│        ▼ (SUCCESS: txHash)                                      │
│  chrome.runtime.sendMessage({ type: 'APPROVE_TRANSACTION' })    │
│        │                                                        │
│        ▼ service-worker.handleApproveTransaction               │
│  chrome.tabs.sendMessage(tabId, { result: txHash })             │
│        │                                                        │
│        ▼ inject.ts receives message                             │
│  window.postMessage({ type: 'FUN_WALLET_RESPONSE' })            │
│        │                                                        │
│        ▼ inpage.ts resolves promise                             │
│  DApp receives txHash → SUCCESS!                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. **Token Selection**: Dropdown hiển thị tất cả 19 token với thanh cuộn
2. **Transaction**: Sau khi phê duyệt, giao dịch được gửi và DApp nhận được txHash
3. **Error Handling**: Hiển thị lỗi cụ thể nếu giao dịch thất bại

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở extension → click "Gửi" → xác nhận thấy tất cả 19 token trong dropdown
4. Mở FUN Profile → click "Gửi" → nhập địa chỉ + số lượng
5. Extension popup mở ra → nhập mật khẩu → click "Phê duyệt"
6. Xác nhận giao dịch thành công và DApp hiển thị kết quả
