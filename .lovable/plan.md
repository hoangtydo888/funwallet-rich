
# Kế Hoạch: Hoàn Thiện Flow Kết Nối DApp

## Vấn Đề Hiện Tại

Khi DApp gọi `eth_requestAccounts`, popup FUN Wallet bung ra nhưng hiển thị **HomePage** thay vì **ConnectPage** để xác nhận kết nối.

---

## Nguyên Nhân Gốc

### Service Worker mở popup với URL hash:
```typescript
// service-worker.ts dòng 759
chrome.runtime.getURL(`popup.html#/connect?requestId=xxx&origin=xxx`)
```

### Nhưng main.tsx dùng MemoryRouter:
```typescript
// main.tsx
<MemoryRouter>  {/* KHÔNG đọc được URL hash! */}
  <PopupApp />
</MemoryRouter>
```

`MemoryRouter` lưu history trong bộ nhớ và **bỏ qua URL hash**, nên luôn bắt đầu từ route mặc định `/` (HomePage).

---

## Giải Pháp

### Phương án 1: Chuyển sang HashRouter (Đề xuất)

Thay `MemoryRouter` bằng `HashRouter` để router đọc được URL hash từ service worker.

```typescript
// main.tsx - TRƯỚC
import { MemoryRouter } from 'react-router-dom';
<MemoryRouter>
  <PopupApp />
</MemoryRouter>

// main.tsx - SAU
import { HashRouter } from 'react-router-dom';
<HashRouter>
  <PopupApp />
</HashRouter>
```

### Phương án 2: Đọc initial route từ hash (Backup)

Nếu cần giữ MemoryRouter vì lý do đặc biệt:

```typescript
// Đọc initial path từ hash
const hash = window.location.hash;
const initialPath = hash ? hash.replace('#', '') : '/';

<MemoryRouter initialEntries={[initialPath]}>
  <PopupApp />
</MemoryRouter>
```

---

## Chọn Phương Án 1 (HashRouter)

Đây là cách chuẩn và đơn giản nhất cho Chrome Extension popup.

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/main.tsx` | Thay MemoryRouter bằng HashRouter |

---

## Chi Tiết Code Thay Đổi

### main.tsx

```typescript
// TRƯỚC:
import { MemoryRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter>
      <PopupApp />
    </MemoryRouter>
  </React.StrictMode>,
);

// SAU:
import { HashRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <PopupApp />
    </HashRouter>
  </React.StrictMode>,
);
```

---

## Flow Sau Khi Sửa

```text
1. DApp gọi eth_requestAccounts
2. Service worker tạo pending request
3. Service worker mở popup: popup.html#/connect?requestId=xxx&origin=xxx
4. HashRouter đọc hash → navigate đến /connect
5. ConnectPage render với params từ URL
6. User nhấn "Cho phép"
7. Gửi APPROVE_CONNECTION về service worker
8. Service worker gửi accounts về content script
9. DApp nhận được địa chỉ ví → kết nối thành công!
```

---

## Kết Quả Mong Đợi

Sau khi sửa, khi click "Kết nối ví" trên DApp:

```text
+------------------------------------------+
|           Yêu cầu kết nối                |
+------------------------------------------+
|              🛡️                          |
|        Kết nối với DApp                  |
|                                          |
|   [ huggable-sparkle-core.lovable.app ]  |
|                                          |
|   Trang web này sẽ có quyền:             |
|   👁️ Xem địa chỉ ví của bạn              |
|   🔑 Yêu cầu phê duyệt giao dịch         |
|                                          |
|   ⚠️ Chỉ kết nối với trang web bạn tin   |
|                                          |
|        [✓ Cho phép]                      |
|        [✕ Từ chối]                       |
+------------------------------------------+
```

---

## Sau Khi Implement

1. Build extension: `npm run build:ext`
2. Reload extension trong Chrome
3. Mở DApp (ví dụ trang profile) và click "Kết nối ví"
4. Xác nhận popup hiển thị **ConnectPage** với nút Cho phép/Từ chối
5. Click "Cho phép" → DApp nhận được địa chỉ ví
