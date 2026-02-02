
# Kế Hoạch: Thêm Thanh Cuộn cho BackupSeedPage và SeedQuizPage

## Vấn Đề Hiện Tại

Cả hai trang đều sử dụng `flex-1` cho content area nhưng không có ScrollArea, dẫn đến:
- **BackupSeedPage**: Seed phrase grid (12 từ) + checkbox + buttons có thể bị cắt trên màn hình nhỏ
- **SeedQuizPage**: Khi hiển thị wrong answer actions, nội dung có thể tràn ra ngoài viewport

## Giải Pháp

Áp dụng cùng pattern layout đã dùng trong `CreateWalletPage.tsx`:

```text
┌────────────────────────────────────┐
│  Header (flex-shrink-0)            │  ← Cố định
├────────────────────────────────────┤
│                                    │
│  ScrollArea (flex-1)               │  ← Cuộn được
│    └─ Content                      │
│                                    │
├────────────────────────────────────┤
│  Footer (flex-shrink-0)            │  ← Cố định
│    └─ Action Buttons               │
└────────────────────────────────────┘
```

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/pages/BackupSeedPage.tsx` | Thêm ScrollAreaPrimitive cho seed grid và warning |
| `src/extension/src/popup/pages/SeedQuizPage.tsx` | Thêm ScrollAreaPrimitive cho quiz content |

---

## Chi Tiết Thay Đổi

### 1. BackupSeedPage.tsx

**Thêm import:**
```typescript
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
```

**Cấu trúc mới:**
```typescript
return (
  <div className="flex flex-col h-full">
    {/* Header - Cố định */}
    <div className="flex items-center gap-3 p-4 pb-2 flex-shrink-0">
      <button onClick={onBack} ...>
        <ArrowLeft />
      </button>
      <h1>Ghi lại Seed Phrase</h1>
    </div>

    {/* Content - Cuộn được */}
    <ScrollAreaPrimitive.Root className="flex-1 overflow-hidden">
      <ScrollAreaPrimitive.Viewport className="h-full w-full">
        <div className="px-4 pb-4 space-y-4">
          {/* Warning */}
          <div className="bg-destructive/10 ...">...</div>
          
          {/* Seed Phrase Grid (12 từ) */}
          <div className="relative">
            <div className="grid grid-cols-3 gap-2 ...">
              {words.map(...)}
            </div>
            {/* Reveal Overlay */}
            {!showSeed && <div>...</div>}
          </div>
          
          {/* Copy & Hide buttons */}
          <div className="flex gap-2">...</div>
          
          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 ...">
            <input type="checkbox" />
            <span>Tôi đã ghi lại seed phrase...</span>
          </label>
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" ...>
        <ScrollAreaPrimitive.Thumb />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>

    {/* Footer - Cố định */}
    <div className="p-4 pt-3 flex-shrink-0 border-t border-border/50">
      <Button onClick={onContinue} disabled={!confirmed || !showSeed}>
        Tiếp tục xác minh
      </Button>
    </div>
  </div>
);
```

### 2. SeedQuizPage.tsx

**Thêm import:**
```typescript
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
```

**Cấu trúc mới:**
```typescript
return (
  <div className="flex flex-col h-full">
    {/* Header - Cố định */}
    <div className="flex items-center gap-3 p-4 pb-2 flex-shrink-0">
      <button onClick={onBack} ...>
        <ArrowLeft />
      </button>
      <h1>Xác minh Seed Phrase</h1>
    </div>

    {/* Content - Cuộn được */}
    <ScrollAreaPrimitive.Root className="flex-1 overflow-hidden">
      <ScrollAreaPrimitive.Viewport className="h-full w-full">
        <div className="px-4 pb-4">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between ...">...</div>
            <div className="h-2 bg-muted ...">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Question */}
          <div className="text-center mb-6">
            <p>Chọn từ đúng</p>
            <h2>Từ thứ {currentQ.wordIndex + 1} là gì?</h2>
          </div>

          {/* Options Grid (4 buttons) */}
          <div className="grid grid-cols-2 gap-3">
            {currentQ.options.map(...)}
          </div>

          {/* Wrong Answer Actions */}
          {isCorrect === false && (
            <div className="mt-6 space-y-3">
              <p>Sai rồi! Từ đúng là "..."</p>
              <div className="flex gap-2">
                <Button onClick={onBack}>Xem lại seed</Button>
                <Button onClick={handleRetry}>Thử lại</Button>
              </div>
            </div>
          )}
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" ...>
        <ScrollAreaPrimitive.Thumb />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  </div>
);
```

**Lưu ý**: SeedQuizPage không cần footer cố định vì các nút action (quiz options và retry buttons) nằm trong phần content.

---

## Kết Quả Mong Đợi

| Trang | Trước | Sau |
|-------|-------|-----|
| BackupSeedPage | Nút "Tiếp tục xác minh" có thể bị ẩn | Nút cố định ở footer, seed grid cuộn được |
| SeedQuizPage | Wrong answer actions có thể tràn viewport | Toàn bộ content cuộn được |

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Tạo ví mới → BackupSeedPage hiển thị
4. Cuộn xuống để xem checkbox và nút "Tiếp tục xác minh" cố định ở footer
5. Tiếp tục quiz → chọn sai → xác nhận có thể cuộn để thấy nút "Thử lại"
