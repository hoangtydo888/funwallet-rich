
# Phase 5: DApp Connection (EIP-1193) - Hoàn Thiện

## Tổng Quan

Phase này sẽ hoàn thiện hệ thống kết nối DApp theo chuẩn EIP-1193, cho phép extension tương tác với các DApp như PancakeSwap, Uniswap, OpenSea, etc.

**Mục tiêu:**
- Hoàn thiện flow Connect/Approve/Reject
- Xử lý Transaction Signing thực sự
- Xử lý Message Signing (personal_sign, eth_signTypedData)
- Pending Requests management
- Hiển thị Connected DApps trong Settings

---

## 1. Kiến Trúc Hiện Tại

Dự án đã có cấu trúc cơ bản:

```text
┌─────────────────────────────────────────────────────────┐
│                    Web Page (DApp)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  window.funWallet.request({ method, params })     │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ postMessage
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Content Script (inject.ts)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Receives FUN_WALLET_REQUEST                      │  │
│  │  → chrome.runtime.sendMessage                     │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.runtime.sendMessage
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Background Service Worker                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  handleMessage() → Route to handlers              │  │
│  │  pendingRequests: Map<requestId, request>         │  │
│  │  openPopup() for user approval                    │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ chrome.windows.create
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Popup Pages                          │
│  • ConnectPage - Approve/Reject connection              │
│  • ApproveTxPage - Approve/Reject transaction           │
│  • ApproveSignPage - Approve/Reject message signing     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Thiếu Sót Cần Hoàn Thiện

| Component | Tình trạng | Cần làm |
|-----------|------------|---------|
| inject.ts | ✅ Done | Minor fixes |
| service-worker.ts | ⚠️ Partial | Hoàn thiện sign logic |
| ConnectPage | ⚠️ Partial | Fix response flow |
| ApproveTxPage | ⚠️ Partial | Thực sự sign & broadcast |
| ApproveSignPage | ❌ Missing | Tạo mới |
| SettingsPage | ⚠️ Partial | Show connected DApps |

---

## 3. Files Cần Tạo/Sửa

### 3.1 Tạo Mới

| File | Mô tả |
|------|-------|
| `ApproveSignPage.tsx` | UI phê duyệt ký message |
| `ConnectedDAppsPage.tsx` | Xem & quản lý DApps đã kết nối |

### 3.2 Cập Nhật

| File | Thay đổi |
|------|----------|
| `service-worker.ts` | Hoàn thiện sign logic, response flow |
| `ConnectPage.tsx` | Fix approve response |
| `ApproveTxPage.tsx` | Real transaction signing |
| `SettingsPage.tsx` | Link to connected DApps |
| `PopupApp.tsx` | Thêm routes mới |
| `inject.ts` | Fix event handling |

---

## 4. Chi Tiết Kỹ Thuật

### 4.1 Response Flow Hoàn Chỉnh

```text
Current Problem:
─────────────────────────────────────────────────────────
DApp calls eth_requestAccounts
  → Background opens popup
  → User clicks Approve
  → Popup closes ❌ (no response sent back!)
  → DApp never receives accounts

Solution:
─────────────────────────────────────────────────────────
DApp calls eth_requestAccounts
  → Background creates pendingRequest with callback
  → Background opens popup with requestId
  → User clicks Approve
  → Popup sends APPROVE_REQUEST to background
  → Background resolves pending request
  → Response sent to content script
  → Content script sends to page
  → DApp receives accounts ✅
```

### 4.2 Service Worker Updates

**Thêm request callback system:**

```typescript
// Pending request với resolve/reject callbacks
interface PendingRequestWithCallback {
  ...PendingRequest,
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  sendResponse: (response: MessageResponse) => void;
}

const pendingRequests: Map<string, PendingRequestWithCallback> = new Map();
```

**Thêm message handlers mới:**

| Message Type | Handler |
|--------------|---------|
| `APPROVE_CONNECTION` | Confirm DApp connection, return accounts |
| `REJECT_CONNECTION` | Reject DApp connection |
| `APPROVE_TRANSACTION` | Sign & broadcast transaction |
| `REJECT_TRANSACTION` | Reject transaction |
| `APPROVE_SIGN` | Sign message |
| `REJECT_SIGN` | Reject signing |
| `GET_PENDING_REQUEST` | Get pending request data |

### 4.3 Transaction Signing Flow

```text
┌─────────────────────────────────────────────────────────┐
│ ApproveTxPage                                           │
├─────────────────────────────────────────────────────────┤
│ 1. Load pending request from background                 │
│ 2. Display transaction details (to, value, data)        │
│ 3. Estimate gas fee                                     │
│ 4. User enters password                                 │
│ 5. Decrypt private key                                  │
│ 6. Sign transaction with ethers.js                      │
│ 7. Broadcast to network                                 │
│ 8. Send tx hash back to background                      │
│ 9. Background resolves pending request                  │
│ 10. DApp receives tx hash                               │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Message Signing Implementation

**ApproveSignPage UI:**

```text
┌─────────────────────────────────────────────────────────┐
│ ← Ký Tin Nhắn                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        🔐                                               │
│                                                         │
│  pancakeswap.finance muốn bạn ký:                       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Sign this message to verify your wallet...        │  │
│  │ Nonce: 12345                                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ⚠️ Chỉ ký tin nhắn từ nguồn đáng tin cậy              │
│                                                         │
│  Nhập mật khẩu để ký:                                   │
│  [________________________]                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [     Ký     ]    [   Từ chối   ]                      │
└─────────────────────────────────────────────────────────┘
```

**Signing methods:**

| Method | Implementation |
|--------|----------------|
| `personal_sign` | `wallet.signMessage(message)` |
| `eth_signTypedData_v4` | `wallet.signTypedData(domain, types, value)` |

### 4.5 Connected DApps Management

**SettingsPage additions:**

```text
┌─────────────────────────────────────────────────────────┐
│ Cài Đặt                                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🔗 DApps Đã Kết Nối                            3 DApps  │
│    └─ Xem và quản lý các DApp đã kết nối                │
│                                                         │
│ 🔒 Bảo Mật                                              │
│ 🌙 Giao Diện                                            │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**ConnectedDAppsPage:**

```text
┌─────────────────────────────────────────────────────────┐
│ ← DApps Đã Kết Nối                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🥞 pancakeswap.finance                              │ │
│ │    Kết nối: 2 ngày trước                      [X]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🦄 app.uniswap.org                                  │ │
│ │    Kết nối: 1 tuần trước                      [X]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⛵ opensea.io                                        │ │
│ │    Kết nối: 3 tuần trước                      [X]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [    Ngắt kết nối tất cả    ]                           │
└─────────────────────────────────────────────────────────┘
```

---

## 5. EIP-1193 Methods Support

### Fully Implemented

| Method | Description |
|--------|-------------|
| `eth_requestAccounts` | Request wallet connection |
| `eth_accounts` | Get connected accounts |
| `eth_chainId` | Get current chain ID |
| `eth_sendTransaction` | Send transaction |
| `personal_sign` | Sign message |
| `eth_signTypedData_v4` | Sign typed data |
| `wallet_switchEthereumChain` | Switch network |

### Events Support

| Event | Trigger |
|-------|---------|
| `accountsChanged` | User switches account |
| `chainChanged` | User switches network |
| `connect` | DApp connected |
| `disconnect` | DApp disconnected |

---

## 6. Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Update service-worker response flow | `service-worker.ts` |
| 2 | Fix ConnectPage approve/reject | `ConnectPage.tsx` |
| 3 | Create ApproveSignPage | `ApproveSignPage.tsx` |
| 4 | Implement real tx signing | `ApproveTxPage.tsx` |
| 5 | Create ConnectedDAppsPage | `ConnectedDAppsPage.tsx` |
| 6 | Update SettingsPage | `SettingsPage.tsx` |
| 7 | Update routes | `PopupApp.tsx` |
| 8 | Fix inject.ts event handling | `inject.ts` |

---

## 7. Testing Với DApps Thực

Sau khi hoàn thành, có thể test với:

| DApp | URL | Test Actions |
|------|-----|--------------|
| PancakeSwap | pancakeswap.finance | Connect, Swap tokens |
| Uniswap | app.uniswap.org | Connect, Switch chains |
| OpenSea | opensea.io | Connect, Sign messages |

---

## 8. Kết Quả Mong Đợi

Sau Phase 5:
- Extension có thể kết nối với mọi DApp theo chuẩn EIP-1193
- Users có thể phê duyệt/từ chối transactions trong popup
- Users có thể ký messages cho các DApp
- Users có thể quản lý connected DApps trong Settings
- Events (chainChanged, accountsChanged) hoạt động đúng
- Compatible với PancakeSwap, Uniswap, OpenSea, etc.
