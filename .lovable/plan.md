
# Kế Hoạch: Sửa Lỗi FUN Wallet Không Popup Khi Kết Nối

## Vấn Đề Đã Xác Định

Từ console log trong ảnh:
```javascript
> window.funWallet
  → Object (có thể expand)
> window.funWallet.request({ method: 'eth_requestAccounts' })
  → Uncaught TypeError: Cannot read properties of undefined (reading 'request')
```

**Nguyên nhân chính**: Content script sử dụng **inline script injection** bị chặn bởi **CSP (Content Security Policy)** của các DApp như PancakeSwap.

---

## Giải Thích Kỹ Thuật

### Tại Sao Lỗi Xảy Ra?

```text
Hiện tại:
+------------------+     Inline Script      +----------------+
| Content Script   | --------- X ---------> | Page Context   |
| (inject.ts)      |    (Bị CSP chặn!)     | window.funWallet|
+------------------+                        +----------------+

Cách sửa:
+------------------+     External Script    +----------------+
| Content Script   | -------------------- > | Page Context   |
| (inject.ts)      |   (Bypass CSP)        | window.funWallet|
+------------------+                        +----------------+
```

### Chi Tiết Vấn Đề

1. File `inject.ts` tạo một `<script>` tag với `textContent` chứa inline JavaScript
2. Các trang web có CSP nghiêm ngặt (như PancakeSwap) chặn inline scripts
3. Kết quả: `window.funWallet` được tạo một phần nhưng thiếu method `request`

---

## Giải Pháp: Sử Dụng External Script File

### 1. Tạo File Injected Script Riêng

**File mới:** `src/extension/src/content/inpage.ts`

Chuyển toàn bộ code provider (dòng 207-351 trong inject.ts) ra file riêng để được load như external script thay vì inline.

### 2. Cập Nhật inject.ts

Thay đổi cách inject từ inline script sang load external script file:

```typescript
// TRƯỚC (bị CSP chặn):
const script = document.createElement('script');
script.textContent = `(function() { ... })();`;

// SAU (bypass CSP):
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inpage.js');
```

### 3. Cập Nhật manifest.json

Thêm `inpage.js` vào `web_accessible_resources`:

```json
"web_accessible_resources": [
  {
    "resources": ["icons/*", "tokens/*", "inpage.js"],
    "matches": ["<all_urls>"]
  }
]
```

### 4. Cập Nhật Vite Config

Thêm `inpage.ts` vào build entry points để tạo file `inpage.js` riêng.

---

## Chi Tiết Files Cần Thay Đổi

| File | Loại | Mô Tả |
|------|------|-------|
| `src/extension/src/content/inpage.ts` | Tạo mới | Provider code chạy trong page context |
| `src/extension/src/content/inject.ts` | Sửa | Đổi sang load external script |
| `src/extension/public/manifest.json` | Sửa | Thêm inpage.js vào resources |
| `vite.config.extension.ts` | Sửa | Thêm entry point cho inpage.ts |

---

## Luồng Hoạt Động Sau Khi Sửa

```text
1. User mở PancakeSwap
      ↓
2. Content script (inject.ts) chạy ở document_start
      ↓
3. inject.ts tạo <script src="inpage.js"> (external file)
      ↓
4. Browser load inpage.js (bypass CSP vì từ extension)
      ↓
5. inpage.js tạo window.funWallet với đầy đủ methods
      ↓
6. inpage.js dispatch EIP-6963 announceProvider event
      ↓
7. PancakeSwap detect FUN Wallet qua EIP-6963
      ↓
8. User click "Connect Wallet" → Chọn FUN Wallet
      ↓
9. DApp gọi window.funWallet.request({ method: 'eth_requestAccounts' })
      ↓
10. inpage.js postMessage → Content script → Background
      ↓
11. Background mở popup → User approve
      ↓
12. Kết nối thành công!
```

---

## Code Thay Đổi Chính

### inpage.ts (File Mới)

```typescript
// Provider object cho page context
const provider = {
  isFunWallet: true,
  isMetaMask: false,
  chainId: '0x38',
  networkVersion: '56',
  selectedAddress: null,
  _events: {},
  _pendingRequests: new Map(),
  
  request: async function(args) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + '_' + Math.random().toString(36).slice(2);
      this._pendingRequests.set(id, { resolve, reject });
      
      window.addEventListener('message', function handler(event) {
        if (event.data.type === 'FUN_WALLET_RESPONSE' && event.data.id === id) {
          window.removeEventListener('message', handler);
          provider._pendingRequests.delete(id);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      });
      
      window.postMessage({
        type: 'FUN_WALLET_REQUEST',
        id,
        method: args.method,
        params: args.params,
      }, '*');
    });
  },
  
  // ... các methods khác
};

window.funWallet = provider;
if (!window.ethereum) window.ethereum = provider;

// Announce EIP-6963
window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { ... }));
```

### inject.ts (Sửa)

```typescript
function injectProvider() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inpage.js');
  script.onload = () => script.remove();
  
  const container = document.head || document.documentElement;
  container.insertBefore(script, container.firstChild);
}
```

---

## Kết Quả Mong Đợi

1. FUN Wallet hiển thị trong danh sách ví của PancakeSwap (qua EIP-6963)
2. Khi user click "Connect" → Popup FUN Wallet tự động bung ra
3. Không còn lỗi "Cannot read properties of undefined"
4. Hoạt động trên mọi DApp dù có CSP nghiêm ngặt

---

## Sau Khi Implement

1. Build lại extension: `npm run build:ext`
2. Reload extension trong Chrome
3. Mở PancakeSwap → Connect Wallet
4. FUN Wallet sẽ xuất hiện trong danh sách và popup khi kết nối
