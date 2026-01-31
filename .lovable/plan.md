

# Kế Hoạch: Cập Nhật Logo FUN Wallet & Cải Thiện Unlock Page

## Mục Tiêu

1. **Thay đổi logo** từ hình ảnh hiện tại sang logo GIF mới được upload (`download_10.gif`)
2. **Cải thiện UnlockPage** để hiển thị logo giống MetaMask (hình 1)

---

## Phân Tích Hiện Tại

### Popup Kết Nối - ĐÃ CÓ SẴN ✓

FUN Wallet **đã có đầy đủ** flow popup giống MetaMask:
- Khi DApp yêu cầu kết nối → Popup bung ra
- Nếu ví khóa → Hiển thị trang Unlock (yêu cầu mật khẩu)
- Nếu ví đã mở → Hiển thị trang Connect (xác nhận kết nối)

### Logo Hiện Tại

Logo đang sử dụng ở các vị trí:
- `src/extension/public/icons/` - Icon extension (PNG)
- `OnboardingPage.tsx` - Hiển thị khi chưa có ví
- `inject.ts` - EIP-6963 provider icon (emoji SVG)

---

## Thay Đổi Cần Thực Hiện

### 1. Copy Logo GIF Vào Extension

Copy file `download_10.gif` thành logo chính:

| Nguồn | Đích |
|-------|------|
| `user-uploads://download_10.gif` | `src/extension/public/icons/logo.gif` |

---

### 2. Cập Nhật UnlockPage - Thêm Logo

Sửa `src/extension/src/popup/pages/UnlockPage.tsx`:

**Thay đổi:**
- Thay icon Lock bằng logo GIF
- Bố cục giống MetaMask: Logo lớn → Input mật khẩu → Nút mở khóa

```text
Trước:                        Sau:
+------------------+          +------------------+
|     [Lock 🔒]    |          |                  |
|   FUN Wallet     |          |   [Logo GIF]     |
|  Ví đang bị khóa |          |                  |
|                  |          |   FUN Wallet     |
| [Password Input] |          |                  |
| [Mở khóa]        |          | [Password Input] |
+------------------+          | [Mở khóa]        |
                              | [Quên mật khẩu?] |
                              +------------------+
```

---

### 3. Cập Nhật OnboardingPage - Dùng Logo GIF

Sửa `src/extension/src/popup/pages/OnboardingPage.tsx`:

- Thay `/icons/icon-128.png` → `/icons/logo.gif`

---

### 4. Cập Nhật EIP-6963 Provider Icon

Sửa `src/extension/src/content/inject.ts`:

- Thay emoji SVG bằng Data URI của logo thực
- Hoặc reference đến file logo trong extension

```typescript
// Trước:
icon: 'data:image/svg+xml,<svg...><text>🦊</text></svg>'

// Sau:
icon: chrome.runtime.getURL('icons/logo-64.png')
```

Lưu ý: EIP-6963 icon cần dạng PNG hoặc base64, không hỗ trợ GIF animation.

---

### 5. Tạo Thêm Logo PNG Cho Icon Extension

Vì manifest.json cần PNG, cần:
- Giữ nguyên các file `icon-16.png`, `icon-48.png`, `icon-128.png` cho manifest
- Hoặc tạo PNG từ frame đầu của GIF

---

## Tổng Kết Files Cần Thay Đổi

| File | Loại | Mô Tả |
|------|------|-------|
| `src/extension/public/icons/logo.gif` | Copy mới | Logo GIF chính |
| `src/extension/src/popup/pages/UnlockPage.tsx` | Sửa | Thêm logo, layout giống MetaMask |
| `src/extension/src/popup/pages/OnboardingPage.tsx` | Sửa | Đổi sang logo.gif |
| `src/extension/src/content/inject.ts` | Sửa | Cập nhật EIP-6963 icon |

---

## Kết Quả Mong Đợi

1. UnlockPage hiển thị logo GIF animation đẹp mắt
2. OnboardingPage hiển thị logo GIF thay vì PNG tĩnh
3. EIP-6963 provider có icon chuyên nghiệp
4. Giao diện nhất quán với brand identity của FUN Wallet

