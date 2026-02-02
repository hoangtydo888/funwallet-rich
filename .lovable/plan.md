
# Kế Hoạch: Sửa Lỗi Gửi Tiền Từ DApp Qua Extension

## Vấn Đề Đã Xác Định

Từ phân tích code và hình ảnh, con đã tìm ra **2 vấn đề chính**:

### Vấn Đề 1: Response không về DApp sau khi phê duyệt

Khi user bấm "Phê duyệt" trong `ApproveTxPage`:
1. Giao dịch **được gửi thành công** lên blockchain ✅
2. `chrome.runtime.sendMessage({ type: 'APPROVE_TRANSACTION', ... })` được gọi ✅
3. Service worker nhận được message ✅
4. **NHƯNG** response **không về được** inject.ts/inpage.ts → DApp vẫn "Đang gửi..."

**Nguyên nhân**: Trong `inject.ts` dòng 68-80, nếu `response.success` thì gửi response ngay. Nhưng với transaction, background trả `null` (pending) không phải `{ success: true }`, nên code chờ `FUN_WALLET_RESPONSE` từ background. Vấn đề là `id` trong request gốc từ inpage.ts **khác với** `requestId` trong service-worker.

Flow message:
```text
inpage.ts: id = "1738500000_xyz123" 
    ↓
inject.ts: forward với requestId = "1738500000_xyz123"
    ↓  
service-worker: tạo requestId mới = "tx_1738500001"  ← KHÁC ID!
    ↓
popup: approve → service-worker gửi response với requestId = "tx_1738500001"
    ↓
inject.ts: nhận response nhưng id không match → LOST!
```

### Vấn Đề 2: Request ID mismatch

Trong `handleSendTransaction` (dòng 506):
```typescript
const requestId = `tx_${Date.now()}`;
```

Service worker tạo `requestId` **mới** thay vì sử dụng `id` từ request gốc của inpage.ts.

---

## Giải Pháp

### Fix 1: Sử dụng request ID gốc từ DApp

Trong `service-worker.ts`, khi nhận message từ inject.ts, phải **giữ nguyên `requestId`** từ request gốc.

**Thay đổi** trong `handleSendTransaction`:

```typescript
async function handleSendTransaction(
  tx: TransactionRequest, 
  origin?: string, 
  tabId?: number,
  originalRequestId?: string  // THÊM PARAM MỚI
): Promise<MessageResponse | null> {
  // ...
  
  // Sử dụng ID gốc nếu có, nếu không mới tạo mới
  const requestId = originalRequestId || `tx_${Date.now()}`;
  
  // ...
}
```

### Fix 2: Truyền requestId từ inject.ts vào message

Trong `handleMessage`, truyền `requestId` từ message gốc:

```typescript
case 'eth_sendTransaction':
case 'SIGN_TRANSACTION': {
  const rawPayload = message.payload;
  const txRequest = Array.isArray(rawPayload) 
    ? rawPayload[0] as TransactionRequest
    : rawPayload as TransactionRequest;
  // Lấy requestId từ message gốc (inject.ts gửi lên)
  const originalRequestId = (message as any).requestId; // THÊM DÒNG NÀY
  return handleSendTransaction(txRequest, origin, tabId, sendResponse, originalRequestId);
}
```

### Fix 3: inject.ts gửi requestId đúng cách

Trong `inject.ts`, request ID được gửi qua field `requestId` trong message. Nhưng cần đảm bảo inject.ts lưu pending request để match response:

```typescript
// inject.ts dòng 50-65
chrome.runtime.sendMessage(
  { 
    type: method, 
    payload: params, 
    origin: window.location.origin, 
    requestId: id  // ID từ inpage.ts
  },
  ...
);
```

Đây đã đúng. Vấn đề là ở service-worker **tạo ID mới** thay vì dùng ID này.

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/background/service-worker.ts` | Sử dụng requestId gốc từ message thay vì tạo mới |
| `src/extension/src/popup/pages/ApproveTxPage.tsx` | Thêm debug logging chi tiết hơn |

---

## Chi Tiết Thay Đổi

### 1. service-worker.ts - Giữ nguyên request ID gốc

**Dòng 124-170** - Cập nhật `handleMessage` để truyền requestId:

```typescript
case 'eth_sendTransaction':
case 'SIGN_TRANSACTION': {
  const rawPayload = message.payload;
  const txRequest = Array.isArray(rawPayload) 
    ? rawPayload[0] as TransactionRequest
    : rawPayload as TransactionRequest;
  // QUAN TRỌNG: Lấy requestId gốc từ inject.ts
  const originalRequestId = (message as { requestId?: string }).requestId;
  return handleSendTransaction(txRequest, origin, tabId, sendResponse, originalRequestId);
}

case 'personal_sign':
case 'PERSONAL_SIGN': {
  const rawSignPayload = message.payload;
  let signPayload: { message: string; address?: string };
  if (Array.isArray(rawSignPayload)) {
    signPayload = { message: rawSignPayload[0] as string, address: rawSignPayload[1] as string };
  } else {
    signPayload = rawSignPayload as { message: string; address?: string };
  }
  const originalSignRequestId = (message as { requestId?: string }).requestId;
  return handlePersonalSign(signPayload, origin, tabId, sendResponse, originalSignRequestId);
}
```

**Dòng 473-528** - Cập nhật `handleSendTransaction`:

```typescript
async function handleSendTransaction(
  tx: TransactionRequest, 
  origin?: string, 
  tabId?: number,
  sendResponse?: (response: MessageResponse) => void,
  originalRequestId?: string  // THÊM THAM SỐ
): Promise<MessageResponse | null> {
  // ...existing code...
  
  // Sử dụng ID gốc từ DApp, fallback tạo mới nếu không có
  const requestId = originalRequestId || `tx_${Date.now()}`;
  
  console.log('[Service Worker] handleSendTransaction - Using requestId:', requestId, 'Original:', originalRequestId);
  
  pendingRequests.set(requestId, {
    id: requestId,
    method: 'eth_sendTransaction',
    params: [tx],
    origin: parsedOrigin || 'unknown',
    timestamp: Date.now(),
    tabId,
  });
  
  // ...rest of code...
}
```

**Tương tự cho** `handlePersonalSign` và `handleSignTypedData`.

### 2. ApproveTxPage.tsx - Thêm logging chi tiết

```typescript
const handleApprove = async () => {
  // ...existing validation...
  
  try {
    // ...wallet decryption...
    
    // Build and send transaction
    console.log('[ApproveTxPage] Building tx:', tx);
    const txResponse = await wallet.sendTransaction(tx);
    console.log('[ApproveTxPage] TX sent on-chain:', txResponse.hash);
    
    // CRITICAL: Gửi response về service-worker với đúng requestId
    console.log('[ApproveTxPage] Notifying background with requestId:', requestId);
    
    const response = await chrome.runtime.sendMessage({
      type: 'APPROVE_TRANSACTION',
      payload: { 
        requestId,  // Phải match với ID trong pendingRequests
        txHash: txResponse.hash 
      }
    });
    
    console.log('[ApproveTxPage] Background response:', response);
    
    // Delay để đảm bảo message được deliver
    setTimeout(() => {
      console.log('[ApproveTxPage] Closing popup');
      window.close();
    }, 500);
    
  } catch (err) {
    // ...error handling với message cụ thể...
  }
};
```

---

## Sơ Đồ Flow Sau Khi Sửa

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW (SỬA LỖI)                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FUN Profile DApp                                                    │
│        │                                                             │
│        ▼ eth_sendTransaction                                         │
│  inpage.ts: tạo id = "1738500000_xyz"                               │
│        │                                                             │
│        ▼ window.postMessage({ id, type, method, params })            │
│  inject.ts: forward với requestId = "1738500000_xyz"                │
│        │                                                             │
│        ▼ chrome.runtime.sendMessage({ requestId, ... })              │
│  service-worker:                                                     │
│    - originalRequestId = "1738500000_xyz" ← GIỮ NGUYÊN               │
│    - pendingRequests.set("1738500000_xyz", { tabId, ... })          │
│        │                                                             │
│        ▼ openPopup('approve-tx', { requestId: "1738500000_xyz" })    │
│  ApproveTxPage:                                                      │
│    - User nhập password, click "Phê duyệt"                          │
│    - wallet.sendTransaction() → txHash                               │
│    - sendMessage({ APPROVE_TRANSACTION, requestId, txHash })         │
│        │                                                             │
│        ▼                                                             │
│  service-worker.handleApproveTransaction:                            │
│    - request = pendingRequests.get("1738500000_xyz") ← MATCH!       │
│    - chrome.tabs.sendMessage(tabId, {                                │
│        type: 'FUN_WALLET_RESPONSE',                                  │
│        requestId: "1738500000_xyz",  ← ĐÚNG ID GỐC                  │
│        result: txHash                                                │
│      })                                                              │
│        │                                                             │
│        ▼                                                             │
│  inject.ts: nhận FUN_WALLET_RESPONSE                                 │
│    - window.postMessage({ id: "1738500000_xyz", result }) → inpage  │
│        │                                                             │
│        ▼                                                             │
│  inpage.ts: _pendingRequests.get("1738500000_xyz").resolve(txHash)  │
│        │                                                             │
│        ▼                                                             │
│  DApp nhận txHash → Giao dịch thành công! ✓                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. Giao dịch từ DApp sẽ được phê duyệt và gửi thành công
2. DApp nhận được txHash và cập nhật UI (không còn "Đang gửi..." vô hạn)
3. Tính năng gửi tiền hoàn chỉnh cả từ Extension trực tiếp và từ DApp

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile DApp → Gửi 0.0001 BNB
4. Extension popup mở → nhập mật khẩu → click "Phê duyệt"
5. **Xác nhận**: DApp hiển thị giao dịch thành công (không còn stuck ở "Đang gửi...")
6. Kiểm tra BSCScan để xác nhận giao dịch on-chain
