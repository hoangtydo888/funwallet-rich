

# Kế Hoạch: Tích Hợp Side Panel Cho FUN Wallet Extension

## Mục Tiêu

Khi user click "FUN Wallet" trong modal kết nối ví của DApp, FUN Wallet sẽ hiển thị như một **Side Panel** bên phải màn hình (như hình 2) thay vì mở popup window riêng biệt.

## Giải Thích Kỹ Thuật

Chrome Extension Manifest V3 cung cấp **Side Panel API** (`chrome.sidePanel`) cho phép extension hiển thị nội dung trong panel cố định bên phải trình duyệt. Đây là cách MetaMask và nhiều ví khác hoạt động.

## Thay Đổi Cần Thực Hiện

### 1. Cập Nhật manifest.json

Thêm permission `sidePanel` và cấu hình `side_panel`:

```json
{
  "manifest_version": 3,
  "name": "FUN Wallet",
  "permissions": [
    "storage",
    "activeTab",
    "notifications",
    "sidePanel"  // THÊM MỚI
  ],
  "side_panel": {
    "default_path": "popup.html"  // THÊM MỚI - dùng chung HTML với popup
  },
  "action": {
    "default_popup": "popup.html",
    // ...
  }
}
```

### 2. Cập Nhật service-worker.ts

Thay đổi hàm `openPopup` để sử dụng Side Panel thay vì tạo window mới:

```typescript
/**
 * Open side panel instead of popup window
 * Falls back to popup window if side panel not supported
 */
async function openPopup(page: string, params?: Record<string, unknown>): Promise<void> {
  const queryString = params 
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
  
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab?.id && chrome.sidePanel) {
    // Set the path for side panel
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: `popup.html#/${page}${queryString}`,
      enabled: true
    });
    
    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    // Fallback to popup window
    await chrome.windows.create({
      url: chrome.runtime.getURL(`popup.html#/${page}${queryString}`),
      type: 'popup',
      width: 360,
      height: 600,
      focused: true,
    });
  }
}
```

### 3. Tương tự cho openPopupWithUnlockRedirect

```typescript
async function openPopupWithUnlockRedirect(
  targetPage: string, 
  params: Record<string, unknown>
): Promise<void> {
  const queryString = new URLSearchParams(params as Record<string, string>).toString();
  const redirectPath = `${targetPage}?${queryString}`;
  const encodedRedirect = encodeURIComponent(redirectPath);
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab?.id && chrome.sidePanel) {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: `popup.html#/unlock?redirect=${encodedRedirect}`,
      enabled: true
    });
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    await chrome.windows.create({
      url: chrome.runtime.getURL(`popup.html#/unlock?redirect=${encodedRedirect}`),
      type: 'popup',
      width: 360,
      height: 600,
      focused: true,
    });
  }
}
```

### 4. Cấu hình hành vi Side Panel khi click icon

Thêm vào `initialize()`:

```typescript
async function initialize() {
  // ... existing code ...
  
  // Mở side panel khi click icon extension
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(console.error);
  }
}
```

## Sơ Đồ Flow Sau Khi Triển Khai

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SIDE PANEL FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User clicks "FUN Wallet" in DApp connect modal                     │
│        │                                                            │
│        ▼                                                            │
│  DApp calls window.funWallet.request({ method: 'eth_requestAccounts' })
│        │                                                            │
│        ▼                                                            │
│  inject.ts → service-worker.ts                                      │
│        │                                                            │
│        ▼ chrome.sidePanel.open({ tabId })                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Browser Window                                               │   │
│  │ ┌─────────────────────────────┬───────────────────────────┐ │   │
│  │ │                             │  FUN Wallet Side Panel    │ │   │
│  │ │      DApp Content           │  ┌────────────────────┐  │ │   │
│  │ │                             │  │ 🦊 FUN Wallet      │  │ │   │
│  │ │  ┌──────────────────────┐  │  │                    │  │ │   │
│  │ │  │ Connect Wallet Modal │  │  │ Chào mừng trở lại! │  │ │   │
│  │ │  │                      │  │  │                    │  │ │   │
│  │ │  │  [FUN Wallet] ←──────┼──┼──┤ [Nhập mật khẩu]    │  │ │   │
│  │ │  │  [MetaMask]          │  │  │                    │  │ │   │
│  │ │  │  [Trust Wallet]      │  │  │ [Mở khóa]         │  │ │   │
│  │ │  └──────────────────────┘  │  │                    │  │ │   │
│  │ │                             │  └────────────────────┘  │ │   │
│  │ │                             │                          │ │   │
│  │ └─────────────────────────────┴───────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/public/manifest.json` | Thêm permission `sidePanel` và cấu hình `side_panel` |
| `src/extension/src/background/service-worker.ts` | Sử dụng `chrome.sidePanel` trong `openPopup` và `openPopupWithUnlockRedirect` |

## Lưu Ý Quan Trọng

1. **Tương thích ngược**: Nếu browser không hỗ trợ Side Panel (phiên bản Chrome cũ), code sẽ fallback về popup window
2. **Kích thước**: Side Panel có chiều rộng cố định ~360px, phù hợp với thiết kế hiện tại
3. **Trải nghiệm**: User không cần di chuyển focus giữa popup và trang web - tất cả trong cùng 1 cửa sổ

## Kết Quả Mong Đợi

1. Click "FUN Wallet" trong modal → Side Panel mở bên phải màn hình
2. User nhập mật khẩu và mở khóa → Kết nối thành công
3. Giao dịch/Ký tin nhắn → Side Panel hiển thị phê duyệt
4. Trải nghiệm liền mạch như MetaMask

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile DApp → Click "Connect Wallet"
4. Chọn "FUN Wallet" → **Xác nhận Side Panel mở bên phải màn hình**
5. Nhập mật khẩu → Mở khóa → Xác nhận kết nối thành công
6. Gửi giao dịch → Side Panel hiển thị phê duyệt

