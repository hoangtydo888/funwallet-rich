

# Kế Hoạch: Thêm Thanh Cuộn và Cải Thiện UI Extension

## Vấn Đề Đã Xác Định

### 1. Hình 1 - CreateWalletPage không có thanh cuộn
Trang "Tạo Ví Mới" có nội dung dài nhưng bị cắt ở cuối (checkbox và nút "Tạo Ví" bị ẩn một phần). Nguyên nhân:
- `PopupLayout` có `overflow-hidden` cố định
- `CreateWalletPage` có `h-full` nhưng không có scroll

### 2. Hình 2 - Modal "Kết nối một chiếc ví" 
Đây là UI từ **FUN Profile DApp** (một ứng dụng bên ngoài), không phải từ project FUN Wallet Extension này. FUN Profile sử dụng thư viện Web3Modal/RainbowKit để hiển thị danh sách ví. 

Nếu bạn muốn thêm logo vào mục "FUN Wallet" trong danh sách ví của FUN Profile, bạn cần sửa code bên FUN Profile DApp, không phải project này.

### 3. Hình 3 - Logo GIF
Logo GIF đã tồn tại trong project tại:
- `public/logo.gif` 
- `src/extension/public/icons/logo.gif`

---

## Giải Pháp

### Fix 1: Thêm thanh cuộn cho CreateWalletPage

Thay đổi cấu trúc layout để cho phép cuộn nội dung:

```text
TRƯỚC:
┌────────────────────┐
│ Header (fixed)     │
├────────────────────┤
│                    │
│   Content (bị cắt) │
│                    │ ← Không cuộn được
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│   [ Checkbox ]     │ ← Bị ẩn một phần
│   [ Button ]       │ ← Bị ẩn
└────────────────────┘

SAU:
┌────────────────────┐
│ Header (fixed)     │
├────────────────────┤
│                    │ ↑
│   Content          │ │ Cuộn được
│                    │ ↓
│   [ Checkbox ]     │
├────────────────────┤
│ Button (fixed)     │
└────────────────────┘
```

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/pages/CreateWalletPage.tsx` | Thêm ScrollArea cho phần content |

---

## Chi Tiết Thay Đổi

### CreateWalletPage.tsx

**Thêm import ScrollArea:**
```typescript
import { ScrollArea } from '@radix-ui/react-scroll-area';
```

**Cấu trúc mới:**
```typescript
return (
  <div className="flex flex-col h-full">
    {/* Header - Cố định */}
    <div className="flex items-center gap-3 p-4 pb-2 flex-shrink-0">
      <button onClick={onBack} className="...">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-bold">Tạo Ví Mới</h1>
    </div>

    {/* Content - Cuộn được */}
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="px-4 pb-4 space-y-4">
        {/* Security Education cards */}
        <div className="bg-primary/10 rounded-lg p-4">...</div>
        <div className="bg-destructive/10 rounded-lg p-4">...</div>
        <div className="bg-muted rounded-lg p-4">...</div>
        
        {/* Checkbox */}
        <label className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
          <input type="checkbox" ... />
          <span>Tôi hiểu rằng việc mất seed phrase...</span>
        </label>
      </div>
    </ScrollArea>

    {/* Footer Button - Cố định */}
    <div className="p-4 pt-2 flex-shrink-0 border-t border-border/50">
      <Button onClick={handleGenerate} disabled={!understood} className="w-full h-12">
        <Wallet className="w-5 h-5 mr-2" />
        Tạo Ví
      </Button>
    </div>
  </div>
);
```

---

## Lưu Ý Về Hình 2

Modal "Kết nối một chiếc ví" với danh sách MetaMask, Trust Wallet, FUN Wallet là UI của **FUN Profile DApp** - một ứng dụng web riêng biệt. 

Để thêm logo vào mục FUN Wallet trong danh sách đó, bạn cần:
1. Mở project FUN Profile 
2. Tìm file cấu hình Web3Modal hoặc RainbowKit
3. Thêm logo URL cho FUN Wallet

Điều này nằm ngoài phạm vi project FUN Wallet Extension hiện tại.

---

## Kết Quả Mong Đợi

Sau khi sửa, CreateWalletPage sẽ:
- Có thanh cuộn khi nội dung dài hơn viewport
- Checkbox và nút "Tạo Ví" luôn hiển thị đầy đủ
- Nút "Tạo Ví" cố định ở footer, dễ truy cập

---

## Bước Sau Khi Implement

1. Build extension: `npm run build:ext`
2. Reload extension trong Chrome
3. Mở popup → click "Tạo Ví Mới"
4. Xác nhận có thể cuộn để xem toàn bộ nội dung
5. Xác nhận nút "Tạo Ví" luôn hiển thị ở footer

