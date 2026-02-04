
# Kế Hoạch: Sửa Lỗi Nhấp Nháy Và Cố Định Vị Trí Token

## Vấn Đề Đã Xác Định

Sau khi phân tích code, tôi phát hiện **nguyên nhân gốc** gây ra hiện tượng nhấp nháy và thay đổi vị trí token:

### 1. Sorting Liên Tục Theo USD Value
Trong file `src/shared/hooks/useBalance.ts` (dòng 99):
```typescript
// Sort by USD value (descending)
results.sort((a, b) => (b.balanceUsd || 0) - (a.balanceUsd || 0));
```

Mỗi khi giá token thay đổi (mỗi 30 giây) → balanceUsd thay đổi → thứ tự token thay đổi → UI nhấp nháy!

### 2. priceMap Dependency Không Ổn Định
Mỗi khi `priceMap` thay đổi → `fetchBalances` được gọi lại → toàn bộ danh sách token được render lại.

---

## Giải Pháp

### 1. Bỏ Sort Hoặc Sort Theo Thứ Tự Cố Định
Giữ nguyên thứ tự như trong `COMMON_TOKENS` (thứ tự ưu tiên đã được định nghĩa sẵn):
- CAMLY, BTCB, USDT, BNB... (không thay đổi theo giá)

### 2. Tối Ưu Dependencies Để Giảm Re-render
- Tách biệt việc cập nhật giá và cập nhật số dư
- Chỉ re-render khi có thay đổi thực sự cần thiết

### 3. Thêm CSS Transition Mượt Mà (Tùy chọn)
Nếu vẫn muốn sort theo USD, thêm animation để transition mượt hơn.

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/shared/hooks/useBalance.ts` | Bỏ sort hoặc sort theo thứ tự cố định trong COMMON_TOKENS |

---

## Chi Tiết Thay Đổi

### useBalance.ts - Bỏ Dynamic Sort

**Trước** (gây nhấp nháy):
```typescript
if (mountedRef.current) {
  // Sort by USD value (descending) ← NGUYÊN NHÂN GÂY NHẤP NHÁY
  results.sort((a, b) => (b.balanceUsd || 0) - (a.balanceUsd || 0));
  setBalances(results);
  setLoading(false);
  initialLoadDone.current = true;
}
```

**Sau** (cố định vị trí theo thứ tự trong COMMON_TOKENS):
```typescript
if (mountedRef.current) {
  // Keep original order from tokens array - DO NOT sort dynamically
  // This prevents flickering when prices change
  
  // Sort to match original token order (từ mảng tokens đầu vào)
  const tokenOrderMap = new Map(tokens.map((t, i) => [t.symbol, i]));
  results.sort((a, b) => {
    const orderA = tokenOrderMap.get(a.symbol) ?? 999;
    const orderB = tokenOrderMap.get(b.symbol) ?? 999;
    return orderA - orderB;
  });
  
  setBalances(results);
  setLoading(false);
  initialLoadDone.current = true;
}
```

---

## Sơ Đồ So Sánh

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     TRƯỚC (GÂY NHẤP NHÁY)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  T0: ADA → BNB → CAMLY → BTCB (sort theo USD value)                │
│       │                                                             │
│       ▼ Giá BNB tăng                                               │
│                                                                     │
│  T1: BNB → ADA → BTCB → CAMLY (thứ tự thay đổi!)                  │
│       │                                                             │
│       ▼ Giá CAMLY tăng                                             │
│                                                                     │
│  T2: CAMLY → BNB → ADA → BTCB (thứ tự thay đổi lại!)              │
│                                                                     │
│  → UI nhấp nháy liên tục mỗi 30 giây!                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     SAU (CỐ ĐỊNH VỊ TRÍ)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  T0: CAMLY → BTCB → USDT → BNB (theo COMMON_TOKENS)                │
│       │                                                             │
│       ▼ Giá thay đổi - thứ tự KHÔNG đổi                            │
│                                                                     │
│  T1: CAMLY → BTCB → USDT → BNB (giữ nguyên vị trí)                │
│       │                                                             │
│       ▼ Giá thay đổi tiếp - thứ tự vẫn KHÔNG đổi                   │
│                                                                     │
│  T2: CAMLY → BTCB → USDT → BNB (ổn định!)                         │
│                                                                     │
│  → UI ổn định, chỉ cập nhật số tiền                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. **Vị trí token cố định**: Theo thứ tự trong `COMMON_TOKENS` (CAMLY → BTCB → USDT → BNB → ...)
2. **Không còn nhấp nháy**: Chỉ cập nhật giá trị USD, không thay đổi vị trí
3. **Trải nghiệm mượt mà**: User có thể cuộn và xem token mà không bị nhảy

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở popup → Xem danh sách token
4. **Đợi 30-60 giây** để giá tự động cập nhật
5. **Xác nhận**: Thứ tự token giữ nguyên, chỉ có số tiền USD thay đổi
6. Cuộn lên xuống → Token không nhảy vị trí
