
# Kế Hoạch: FUN Wallet Hiển Thị Cùng MetaMask Trên DApps

## Mục Tiêu

Đảm bảo FUN Wallet xuất hiện trong danh sách wallet của PancakeSwap (và các DApp khác) ngay cả khi MetaMask đã được cài đặt.

---

## Phân Tích Vấn Đề Hiện Tại

### Vấn Đề 1: UUID Thay Đổi Mỗi Lần

```typescript
// Hiện tại - SAI:
uuid: 'fun-wallet-extension-' + Date.now()  // UUID thay đổi mỗi lần reload!
```

UUID phải **cố định và duy nhất** để DApp nhận diện ví giữa các lần tải trang.

### Vấn Đề 2: RDNS Format

```typescript
// Hiện tại:
rdns: 'app.funwallet'

// Chuẩn hơn (reverse domain):
rdns: 'io.funwallet.wallet'
```

### Vấn Đề 3: Thiếu Announcement Kịp Thời

DApps như PancakeSwap có thể load trước khi FUN Wallet announce. Cần:
- Announce ngay khi inject
- Re-announce khi có `eip6963:requestProvider`
- Đợi DOMContentLoaded nếu cần

---

## Giải Pháp

### 1. Sử Dụng UUID Cố Định

Thay thế UUID động bằng UUID cố định dựa trên extension ID:

```typescript
// Cố định, unique cho extension
uuid: '550e8400-e29b-41d4-a716-446655440000'
```

### 2. Cập Nhật Provider Info Theo Chuẩn EIP-6963

```typescript
info: {
  uuid: '550e8400-e29b-41d4-a716-446655440000',  // Fixed UUID
  name: 'FUN Wallet',
  icon: iconDataUrl,  // PNG base64 đã có
  rdns: 'io.funwallet.wallet',  // Reverse domain notation
}
```

### 3. Announce Nhiều Lần Để Đảm Bảo Detection

```typescript
// Hàm announce provider
function announceProvider() {
  const event = new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: providerInfo,
      provider: provider,
    }),
  });
  window.dispatchEvent(event);
}

// Announce ngay lập tức
announceProvider();

// Announce lại khi DApp request
window.addEventListener('eip6963:requestProvider', announceProvider);

// Announce sau khi DOM ready (cho DApps load chậm)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', announceProvider);
}

// Announce sau short delay (cho DApps init async)
setTimeout(announceProvider, 100);
setTimeout(announceProvider, 500);
```

### 4. Inject Script Sớm Nhất Có Thể

Đảm bảo content script chạy ở `"document_start"` trong manifest.json (đã được cấu hình).

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/content/inpage.ts` | Sửa UUID cố định, cải thiện announcement logic |

---

## Chi Tiết Thay Đổi inpage.ts

### Trước:

```typescript
const announceEvent = new CustomEvent('eip6963:announceProvider', {
  detail: Object.freeze({
    info: {
      uuid: 'fun-wallet-extension-' + Date.now(),  // ❌ Thay đổi mỗi lần
      name: 'FUN Wallet',
      icon: iconDataUrl,
      rdns: 'app.funwallet',
    },
    provider: provider,
  }),
});

window.dispatchEvent(announceEvent);

window.addEventListener('eip6963:requestProvider', () => {
  window.dispatchEvent(announceEvent);
});
```

### Sau:

```typescript
// Provider info theo chuẩn EIP-6963
const providerInfo = {
  uuid: '550e8400-e29b-41d4-a716-446655440000',  // ✅ Cố định
  name: 'FUN Wallet',
  icon: iconDataUrl,
  rdns: 'io.funwallet.wallet',  // ✅ Chuẩn reverse domain
};

// Hàm announce để có thể gọi nhiều lần
function announceProvider() {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: providerInfo,
      provider: provider,
    }),
  }));
}

// 1. Announce ngay lập tức
announceProvider();

// 2. Lắng nghe request từ DApp
window.addEventListener('eip6963:requestProvider', announceProvider);

// 3. Announce sau DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', announceProvider);
} else if (document.readyState === 'interactive') {
  announceProvider();
}

// 4. Announce với delay cho DApps khởi tạo chậm
setTimeout(announceProvider, 100);
setTimeout(announceProvider, 500);
setTimeout(announceProvider, 1000);
```

---

## Kết Quả Mong Đợi

Sau khi apply thay đổi:

1. Mở PancakeSwap → Click "Connect Wallet"
2. Danh sách hiển thị **cả FUN Wallet và MetaMask**
3. Click vào FUN Wallet → Popup bung ra
4. Approve → Kết nối thành công

```text
+----------------------------------+
|        Connect Wallet            |
+----------------------------------+
|  🦊 MetaMask                     |
|  🎮 FUN Wallet      ← Hiển thị!  |
|  🔵 Coinbase Wallet              |
|  📱 WalletConnect                |
+----------------------------------+
```

---

## Sau Khi Implement

1. **Build extension**: `npm run build:ext`
2. **Reload extension** trong Chrome
3. **Mở PancakeSwap** và click "Connect Wallet"
4. **Xác nhận** FUN Wallet xuất hiện trong danh sách
