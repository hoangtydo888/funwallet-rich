
# Kế Hoạch: Sửa Lỗi "Không tìm thấy ví" Khi Gửi Tiền

## Vấn Đề Đã Xác Định

Lỗi **"Giao dịch thất bại: Không tìm thấy ví"** xảy ra do **storage key không khớp** trong code:

| File | Key đang dùng | Key đúng |
|------|---------------|----------|
| `ApproveTxPage.tsx` | `'fun_wallet_encrypted_keys'` (sai) | `STORAGE_KEYS.ENCRYPTED_KEYS` = `'fun_wallet_encrypted_v2'` |
| `ApproveSignPage.tsx` | `'fun_wallet_encrypted_keys'` (sai) | `STORAGE_KEYS.ENCRYPTED_KEYS` = `'fun_wallet_encrypted_v2'` |
| `SetupPasswordPage.tsx` | `STORAGE_KEYS.ENCRYPTED_KEYS` (đúng) | ✓ |
| `SendPage.tsx` | `STORAGE_KEYS.ENCRYPTED_KEYS` (đúng) | ✓ |
| `service-worker.ts` | `STORAGE_KEYS.ENCRYPTED_KEYS` (đúng) | ✓ |

Khi user tạo ví, dữ liệu được lưu với key `'fun_wallet_encrypted_v2'`, nhưng khi phê duyệt giao dịch từ DApp, `ApproveTxPage.tsx` lại tìm với key `'fun_wallet_encrypted_keys'` → không tìm thấy → lỗi!

---

## Files Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/extension/src/popup/pages/ApproveTxPage.tsx` | Sử dụng `STORAGE_KEYS.ENCRYPTED_KEYS` thay vì hardcode |
| `src/extension/src/popup/pages/ApproveSignPage.tsx` | Sử dụng `STORAGE_KEYS.ENCRYPTED_KEYS` thay vì hardcode |

---

## Chi Tiết Thay Đổi

### 1. ApproveTxPage.tsx

**Thêm import:**
```typescript
import { STORAGE_KEYS } from '@shared/storage/types';
```

**Sửa dòng 93-94:**
```typescript
// TRƯỚC (SAI):
const encryptedData = await chrome.storage.local.get('fun_wallet_encrypted_keys');
const data = encryptedData.fun_wallet_encrypted_keys;

// SAU (ĐÚNG):
const encryptedData = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTED_KEYS);
const data = encryptedData[STORAGE_KEYS.ENCRYPTED_KEYS];
```

### 2. ApproveSignPage.tsx

**Thêm import:**
```typescript
import { STORAGE_KEYS } from '@shared/storage/types';
```

**Sửa dòng 62-63:**
```typescript
// TRƯỚC (SAI):
const encryptedData = await chrome.storage.local.get('fun_wallet_encrypted_keys');
const data = encryptedData.fun_wallet_encrypted_keys;

// SAU (ĐÚNG):
const encryptedData = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTED_KEYS);
const data = encryptedData[STORAGE_KEYS.ENCRYPTED_KEYS];
```

---

## Sơ Đồ Flow Sau Khi Sửa

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    STORAGE KEY FLOW (ĐÃ SỬA)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SetupPasswordPage.tsx (Tạo ví)                                      │
│        │                                                             │
│        ▼ chrome.storage.local.set({                                  │
│          [STORAGE_KEYS.ENCRYPTED_KEYS]: ...  // 'fun_wallet_encrypted_v2'
│        })                                                            │
│        │                                                             │
│        ▼ Data lưu thành công                                         │
│                                                                      │
│  ───────────────────────────────────────────────────────────────     │
│                                                                      │
│  ApproveTxPage.tsx (Phê duyệt giao dịch)                            │
│        │                                                             │
│        ▼ chrome.storage.local.get(STORAGE_KEYS.ENCRYPTED_KEYS)      │
│          // Sử dụng 'fun_wallet_encrypted_v2' - ĐÚNG KEY!           │
│        │                                                             │
│        ▼ Data tìm thấy ✓                                             │
│        │                                                             │
│        ▼ Decrypt private key → Gửi giao dịch thành công! ✓          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Kết Quả Mong Đợi

1. Không còn lỗi "Không tìm thấy ví" khi phê duyệt giao dịch từ DApp
2. Không còn lỗi "Không tìm thấy ví" khi ký tin nhắn từ DApp
3. Giao dịch gửi BNB từ FUN Profile DApp hoạt động thành công

---

## Bước Test Sau Khi Implement

1. `npm run build:ext`
2. Reload extension trong Chrome
3. Mở FUN Profile DApp → Gửi 0.0001 BNB
4. Side Panel mở → Nhập mật khẩu → Click "Phê duyệt"
5. **Xác nhận**: Giao dịch thành công, không còn lỗi "Không tìm thấy ví"
6. Kiểm tra BSCScan để xác nhận giao dịch on-chain

---

## Lưu Ý Bổ Sung

Đây là bug do thiếu nhất quán khi sử dụng storage key. Để tránh vấn đề tương tự trong tương lai:
- **LUÔN** import và sử dụng `STORAGE_KEYS` từ `@shared/storage/types`
- **KHÔNG BAO GIỜ** hardcode storage key trực tiếp trong code
