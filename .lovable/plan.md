

# Cải Thiện UI Chrome Extension - FUN Wallet

## Tổng Quan Thay Đổi

Cải thiện giao diện Extension với 3 tính năng chính:
1. Thay emoji 🦊 bằng logo FUN Wallet chính thức
2. Thêm animation fade-in khi mở popup
3. Hiển thị version number ở footer

---

## Chi Tiết Kỹ Thuật

### 1. Thay Logo FUN Wallet

**File:** `src/extension/src/popup/PopupApp.tsx`

Thay thế:
```tsx
// Trước
<div className="text-4xl mb-4">🦊</div>

// Sau
<img 
  src="/icons/icon-128.png" 
  alt="FUN Wallet" 
  className="w-16 h-16 mb-4"
/>
```

---

### 2. Thêm Animation Fade-In

**File:** `src/extension/index.css`

Thêm keyframe animation và class mới:
```css
@keyframes popup-fade-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-enter {
  animation: popup-fade-in 0.3s ease-out;
}
```

**File:** `src/extension/src/popup/components/PopupLayout.tsx`

Áp dụng class animation:
```tsx
<div className="w-[360px] h-[540px] bg-background text-foreground overflow-hidden flex flex-col popup-enter">
```

---

### 3. Hiển Thị Version Number ở Footer

**File:** `src/extension/src/popup/PopupApp.tsx`

Đọc version từ manifest và hiển thị ở footer của màn hình onboarding:
```tsx
// Thêm state để lưu version
const [version, setVersion] = useState('');

// Lấy version từ manifest
useEffect(() => {
  const manifest = chrome.runtime.getManifest();
  setVersion(manifest.version);
}, []);

// Hiển thị footer
<div className="absolute bottom-4 text-xs text-muted-foreground">
  v{version}
</div>
```

---

## Danh Sách Files Cần Sửa

| File | Thay đổi |
|------|----------|
| `src/extension/src/popup/PopupApp.tsx` | Thay emoji bằng logo, thêm version footer |
| `src/extension/src/popup/components/PopupLayout.tsx` | Thêm class animation |
| `src/extension/index.css` | Thêm keyframe popup-fade-in |

---

## Kết Quả Mong Đợi

1. Logo FUN Wallet chính thức thay thế emoji 🦊
2. Popup mở với hiệu ứng fade-in mượt mà (0.3s)
3. Footer hiển thị "v1.0.0" ở góc dưới màn hình onboarding

