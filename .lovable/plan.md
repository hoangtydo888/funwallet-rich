
# Kế Hoạch: Chuyển Từ Side Panel Sang Popup Window Nổi Bên Phải Màn Hình

## Mục Tiêu

Khi user click "FUN Wallet" trong modal kết nối ví của DApp, FUN Wallet sẽ hiển thị như một **popup window nổi** (floating window) bên phải màn hình, không phải Side Panel cố định gắn vào trình duyệt.

## Phân Tích Hiện Tại

Code hiện tại đang sử dụng `chrome.sidePanel.open()` trong `openPopup()` và `openPopupWithUnlockRedirect()`:

```typescript
// Dòng 840-850
if (tab?.id && chrome.sidePanel) {
  await chrome.sidePanel.setOptions({...});
  await chrome.sidePanel.open({ tabId: tab.id });  // ← Side Panel cố định
}
```

## Giải Pháp: Sử Dụng Popup Window Với Vị Trí Bên Phải

Thay đổi để sử dụng `chrome.windows.create()` với vị trí được tính toán để hiển thị bên **phải màn hình**:

```typescript
async function openPopup(page: string, params?: Record<string, unknown>): Promise<void> {
  const queryString = params 
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
  
  // Lấy thông tin cửa sổ hiện tại để tính vị trí
  const currentWindow = await chrome.windows.getCurrent();
  
  // Kích thước popup
  const popupWidth = 360;
  const popupHeight = 600;
  
  // Tính vị trí để popup hiển thị bên phải cửa sổ trình duyệt
  // Top: Căn giữa theo chiều dọc của cửa sổ
  // Left: Sát bên phải của cửa sổ trình duyệt
  const top = Math.round((currentWindow.top || 0) + ((currentWindow.height || 600) - popupHeight) / 2);
  const left = Math.round((currentWindow.left || 0) + (currentWindow.width || 1200) - popupWidth - 20);
  
  await chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html#/${page}${queryString}`),
    type: 'popup',
    width: popupWidth,
    height: popupHeight,
    top: top > 0 ? top : 100,
    left: left > 0 ? left : 100,
    focused: true,
  });
}
```

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/background/service-worker.ts` | Bỏ Side Panel, dùng popup window với vị trí bên phải |
| `src/extension/public/manifest.json` | Giữ nguyên (hoặc bỏ sidePanel nếu không cần) |

---

## Chi Tiết Thay Đổi

### 1. service-worker.ts - Hàm openPopup()

**Trước** (dùng Side Panel):
```typescript
async function openPopup(page: string, params?: Record<string, unknown>): Promise<void> {
  // ...
  if (tab?.id && chrome.sidePanel) {
    await chrome.sidePanel.setOptions({...});
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    await chrome.windows.create({...});
  }
}
```

**Sau** (dùng Popup Window nổi bên phải):
```typescript
async function openPopup(page: string, params?: Record<string, unknown>): Promise<void> {
  const queryString = params 
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
  
  // Lấy thông tin cửa sổ hiện tại
  const currentWindow = await chrome.windows.getCurrent();
  
  const popupWidth = 360;
  const popupHeight = 600;
  
  // Vị trí bên phải cửa sổ trình duyệt
  const top = Math.round((currentWindow.top || 0) + ((currentWindow.height || 600) - popupHeight) / 2);
  const left = Math.round((currentWindow.left || 0) + (currentWindow.width || 1200) - popupWidth - 20);
  
  await chrome.windows.create({
    url: chrome.runtime.getURL(`popup.html#/${page}${queryString}`),
    type: 'popup',
    width: popupWidth,
    height: popupHeight,
    top: Math.max(top, 0),
    left: Math.max(left, 0),
    focused: true,
  });
}
```

### 2. service-worker.ts - Hàm openPopupWithUnlockRedirect()

Tương tự, thay đổi để sử dụng popup window thay vì Side Panel.

### 3. service-worker.ts - Hàm initialize()

Bỏ hoặc giữ lại cấu hình Side Panel tùy ý (nếu muốn click icon vẫn mở Side Panel):
```typescript
// Có thể comment out hoặc bỏ dòng này
// if (chrome.sidePanel) {
//   chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//     .catch(console.error);
// }
```

---

## Sơ Đồ Vị Trí Popup

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Trình duyệt Chrome                                                    │
│ ┌──────────────────────────────────────────────────────┬─────────────┐ │
│ │                                                      │ FUN Wallet  │ │
│ │                                                      │ ┌─────────┐ │ │
│ │          Nội dung trang DApp                         │ │  Popup  │ │ │
│ │                                                      │ │  Window │ │ │
│ │     ┌───────────────────────┐                        │ │  (nổi)  │ │ │
│ │     │ Kết nối một chiếc ví  │                        │ │         │ │ │
│ │     │                       │                        │ │ 360x600 │ │ │
│ │     │   [FUN Wallet]  ←─────┼────────────────────────┼─│         │ │ │
│ │     │   [MetaMask]          │                        │ └─────────┘ │ │
│ │     └───────────────────────┘                        │             │ │
│ │                                                      │ 20px margin │ │
│ └──────────────────────────────────────────────────────┴─────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Lợi Ích

1. **Popup nổi**: Cửa sổ độc lập, có thể di chuyển tự do
2. **Vị trí thông minh**: Mở bên phải màn hình để không che DApp
3. **Trải nghiệm quen thuộc**: Giống cách nhiều ví khác hoạt động
4. **Không cần API mới**: `chrome.windows.create()` được hỗ trợ trên mọi phiên bản Chrome

---

## Kết Quả Mong Đợi

1. Click "FUN Wallet" trong modal → Popup window nổi mở bên phải màn hình
2. Popup có thể di chuyển tự do
3. User nhập mật khẩu và phê duyệt giao dịch trong popup
4. Popup tự đóng sau khi hoàn thành

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile DApp → Click "Connect Wallet"
4. Chọn "FUN Wallet" → **Xác nhận popup nổi mở bên phải màn hình**
5. Gửi giao dịch → Popup phê duyệt mở đúng vị trí
