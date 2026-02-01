
# Kế Hoạch: Sửa Lỗi Gửi Tiền & Token Flickering

## Vấn Đề Đã Xác Định

### 1. Lỗi "Value âm" khi gửi tiền (-0.0001)
Hình ảnh cho thấy:
- Input hiển thị `-0,0001` (số âm)
- Lỗi: `Number "-100000000000000n" is not in safe integer range`
- `C value: -0.0001 ETH`

**Nguyên nhân gốc**: Cách parse `params` từ DApp không đúng!

Khi DApp gọi `eth_sendTransaction`, nó gửi:
```javascript
// DApp (viem) gửi
provider.request({
  method: 'eth_sendTransaction',
  params: [{
    to: '0x...',
    value: '0x...',  // Dạng hex
    data: '0x...'
  }]
})
```

Nhưng flow hiện tại:
```
inpage.ts → inject.ts → service-worker
   |            |              |
params = [{tx}] → payload = [{tx}] → tx = payload (ARRAY!)
                                    → tx.value = undefined!
```

Service worker đang cast `payload` thành `TransactionRequest`, nhưng `payload` là một **ARRAY** chứa object, không phải object!

### 2. Token list chớp nháy
Hook `useBalance` vẫn có thể gây flickering nếu `priceMap` thay đổi liên tục.

---

## Giải Pháp

### Fix 1: Parse params đúng trong service-worker.ts

```typescript
// TRƯỚC (sai):
case 'eth_sendTransaction':
  return handleSendTransaction(message.payload as TransactionRequest, ...);

// SAU (đúng):
case 'eth_sendTransaction':
  // params theo EIP-1193 là array: [txObject]
  const txParams = Array.isArray(message.payload) 
    ? message.payload[0] as TransactionRequest
    : message.payload as TransactionRequest;
  return handleSendTransaction(txParams, ...);
```

### Fix 2: Convert value từ hex sang ether trong ApproveTxPage

```typescript
// TRƯỚC:
const txData = {
  value: searchParams.get('value') || '0',
};
// value có thể là hex: "0x5AF3107A4000" hoặc string: "0.0001"

// SAU:
const rawValue = searchParams.get('value') || '0';
// Chuyển hex sang ether string nếu cần
let displayValue = '0';
try {
  if (rawValue.startsWith('0x')) {
    // Hex value (wei) → ether
    displayValue = ethers.formatEther(BigInt(rawValue));
  } else {
    displayValue = rawValue;
  }
  // Validate không âm
  if (parseFloat(displayValue) < 0) {
    displayValue = '0';
  }
} catch {
  displayValue = '0';
}
```

### Fix 3: Validate value trong service-worker trước khi lưu

```typescript
// Trong handleSendTransaction
let valueStr = tx.value || '0';

// Nếu là hex, giữ nguyên
// Nếu là string số, validate không âm
if (!valueStr.startsWith('0x')) {
  const numValue = parseFloat(valueStr);
  if (isNaN(numValue) || numValue < 0) {
    return { success: false, error: 'Invalid transaction value' };
  }
}

const txParams = {
  value: valueStr,
  // ...
};
```

### Fix 4: Ổn định useBalance hook

Thêm dependency stability:
```typescript
// Thêm useMemo cho priceMap để tránh re-render không cần thiết
const stablePriceMap = useMemo(() => priceMap, [JSON.stringify(priceMap)]);
```

---

## Files Cần Thay Đổi

| File | Thay Đổi |
|------|----------|
| `src/extension/src/background/service-worker.ts` | Parse params array đúng cách, validate value |
| `src/extension/src/popup/pages/ApproveTxPage.tsx` | Convert hex value, validate không âm |
| `src/shared/hooks/useBalance.ts` | Stabilize dependencies nếu cần |

---

## Chi Tiết Thay Đổi

### 1. service-worker.ts

**Dòng ~162-164**: Sửa case eth_sendTransaction

```typescript
// TRƯỚC
case 'eth_sendTransaction':
case 'SIGN_TRANSACTION':
  return handleSendTransaction(message.payload as TransactionRequest, origin, tabId, sendResponse);

// SAU
case 'eth_sendTransaction':
case 'SIGN_TRANSACTION': {
  // EIP-1193: params là array [txObject] hoặc object trực tiếp
  const rawPayload = message.payload;
  const txRequest = Array.isArray(rawPayload) 
    ? rawPayload[0] as TransactionRequest
    : rawPayload as TransactionRequest;
  return handleSendTransaction(txRequest, origin, tabId, sendResponse);
}
```

**Dòng ~470-475**: Validate và normalize value

```typescript
// Build params for approve-tx page
let valueToPass = tx.value || '0';

// Validate: nếu không phải hex và là số âm → reject
if (!valueToPass.startsWith('0x')) {
  const numVal = parseFloat(valueToPass);
  if (isNaN(numVal) || numVal < 0) {
    return { success: false, error: 'Invalid transaction value: must be positive' };
  }
}

const txParams: Record<string, string> = {
  to: tx.to || '',
  value: valueToPass,
  origin: parsedOrigin || 'unknown',
};
```

### 2. ApproveTxPage.tsx

**Thêm helper để parse value**:

```typescript
// Helper: Convert value (có thể là hex hoặc string số) sang display string
const parseTransactionValue = (rawValue: string): string => {
  if (!rawValue || rawValue === '0') return '0';
  
  try {
    if (rawValue.startsWith('0x')) {
      // Hex (wei) → ether
      const weiValue = BigInt(rawValue);
      if (weiValue < 0n) return '0'; // Không cho phép âm
      return ethers.formatEther(weiValue);
    } else {
      // String số → validate
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue) || numValue < 0) return '0';
      return rawValue;
    }
  } catch {
    return '0';
  }
};
```

**Sử dụng trong component**:

```typescript
const txData = {
  to: searchParams.get('to') || '',
  value: parseTransactionValue(searchParams.get('value') || '0'),
  data: searchParams.get('data') || '',
  origin: searchParams.get('origin') || 'Unknown',
};
```

**Sửa estimateGas và handleApprove**:

```typescript
// Trong estimateGas
const tx: ethers.TransactionRequest = {
  to: txData.to,
  value: txData.value !== '0' ? ethers.parseEther(txData.value) : 0n,
};

// Trong handleApprove - giữ nguyên vì txData.value đã được normalize
```

---

## Flow Sau Khi Sửa

```text
DApp gọi eth_sendTransaction với params = [{to, value: "0x...", data}]
                    ↓
inject.ts truyền payload = [{to, value, data}]
                    ↓
service-worker nhận message.payload
    → Parse: txRequest = payload[0]  ← FIX!
    → Validate: value >= 0
    → Mở popup với value (hex hoặc string)
                    ↓
ApproveTxPage nhận value từ URL
    → parseTransactionValue(): hex → ether string  ← FIX!
    → Hiển thị: "0.0001 BNB"
    → Gửi tx thành công!
```

---

## Kết Quả Mong Đợi

1. **Gửi tiền thành công**: Value được parse đúng từ hex sang ether
2. **Token list không chớp nháy**: Loading skeleton chỉ hiện lần đầu
3. **Validation chặt chẽ**: Reject các giá trị âm hoặc không hợp lệ

---

## Bước Sau Khi Implement

1. Build extension: `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile, kết nối ví
4. Thử gửi 0.0001 BNB
5. Xác nhận popup approve-tx hiển thị số dương đúng
6. Xác nhận giao dịch thành công
