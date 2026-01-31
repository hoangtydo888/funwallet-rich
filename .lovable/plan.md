
# Thêm Tính Năng Export/Backup Seed Phrase Từ Settings

## Tổng Quan

Cho phép người dùng xem lại seed phrase của ví đã tạo từ trang Settings. Yêu cầu xác minh mật khẩu trước khi hiển thị để đảm bảo an toàn.

---

## Thách Thức Kỹ Thuật

Hiện tại `SetupPasswordPage` chỉ lưu **encrypted private key**, KHÔNG lưu mnemonic. Cần cập nhật storage schema để lưu thêm encrypted mnemonic cho các ví được tạo mới.

---

## Kiến Trúc Giải Pháp

```text
User Flow:

Settings Page
     |
     v (click "Sao lưu Seed Phrase")
+------------------------------------------+
|      BackupSeedSettingsPage              |
|  Step 1: Password Verification           |
|  +------------------------------------+  |
|  | Nhập mật khẩu: [••••••••] [👁]     |  |
|  | [      Xác minh      ]             |  |
|  +------------------------------------+  |
+------------------------------------------+
     |
     v (password correct)
+------------------------------------------+
|      BackupSeedSettingsPage              |
|  Step 2: Show Seed Phrase                |
|  +------------------------------------+  |
|  | ⚠️ CẢNH BÁO: Không chia sẻ!        |  |
|  |                                    |  |
|  | [Seed phrase grid - blur/reveal]   |  |
|  |                                    |  |
|  | [ Copy Seed Phrase ]               |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## Chi Tiết Kỹ Thuật

### 1. Cập Nhật Storage Types

**File:** `src/shared/types/index.ts`

Thêm field `mnemonics` vào `SecureWalletStorage`:

```typescript
export interface SecureWalletStorage {
  version: number;
  wallets: {
    [address: string]: EncryptedKeyData;
  };
  // MỚI: Encrypted mnemonics (chỉ cho ví được tạo trong app)
  mnemonics?: {
    [address: string]: EncryptedKeyData;
  };
  lastAccess: number;
}
```

---

### 2. Cập Nhật SetupPasswordPage

**File:** `src/extension/src/popup/pages/SetupPasswordPage.tsx`

Thêm prop `mnemonic` (optional) và lưu encrypted mnemonic khi tạo ví mới:

```typescript
interface SetupPasswordPageProps {
  walletAddress: string;
  privateKey: string;
  mnemonic?: string;  // MỚI: chỉ có khi tạo ví mới
  onComplete: () => void;
  onBack: () => void;
}

// Trong handleSetup():
if (mnemonic) {
  const encryptedMnemonic = await encryptPrivateKey(mnemonic, password);
  walletStorage.mnemonics = { [walletAddress]: encryptedMnemonic };
}
```

---

### 3. Cập Nhật PopupApp.tsx

**File:** `src/extension/src/popup/PopupApp.tsx`

Truyền `mnemonic` từ `createdWallet` vào `SetupPasswordPage`:

```typescript
{onboardingStep === 'password' && walletData && (
  <SetupPasswordPage 
    walletAddress={walletData.address}
    privateKey={walletData.privateKey}
    mnemonic={createdWallet?.mnemonic}  // MỚI
    onComplete={handlePasswordComplete}
    onBack={() => setOnboardingStep(isNewWallet ? 'quiz' : 'import')}
  />
)}
```

Thêm route cho BackupSeedSettingsPage:

```typescript
<Route 
  path="/backup-seed" 
  element={
    isUnlocked 
      ? <BackupSeedSettingsPage /> 
      : <Navigate to="/unlock" replace />
  } 
/>
```

---

### 4. Tạo BackupSeedSettingsPage

**File MỚI:** `src/extension/src/popup/pages/BackupSeedSettingsPage.tsx`

Trang backup với 2 bước: xác minh password → hiển thị seed phrase.

**State machine:**
- `step: 'verify' | 'show'`
- `password: string`
- `mnemonic: string | null`
- `hasMnemonic: boolean`

**Logic:**
1. Load encrypted wallet storage từ `chrome.storage.local`
2. Check xem có `mnemonics[activeWallet]` hay không
3. Nếu không có → hiển thị thông báo "Ví này không có seed phrase (đã import từ private key)"
4. Nếu có → yêu cầu nhập password
5. Sau khi verify → decrypt mnemonic và hiển thị

**UI Components:**
- Password input với toggle show/hide
- Seed phrase grid (3x4) với blur/reveal
- Copy button
- Warning message

---

### 5. Cập Nhật SettingsPage

**File:** `src/extension/src/popup/pages/SettingsPage.tsx`

Thêm menu item "Sao lưu Seed Phrase":

```typescript
import { Shield } from 'lucide-react';

// Trong menu items:
<button 
  onClick={() => navigate('/backup-seed')}
  className="w-full flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-muted/80"
>
  <div className="flex items-center gap-3">
    <Shield className="w-5 h-5 text-muted-foreground" />
    <span>Sao lưu Seed Phrase</span>
  </div>
  <ChevronRight className="w-5 h-5 text-muted-foreground" />
</button>
```

---

## Tóm Tắt Files Cần Thay Đổi

| File | Loại | Mô tả |
|------|------|-------|
| `src/shared/types/index.ts` | Sửa | Thêm `mnemonics` field vào `SecureWalletStorage` |
| `src/extension/src/popup/pages/SetupPasswordPage.tsx` | Sửa | Thêm prop `mnemonic`, encrypt và lưu mnemonic |
| `src/extension/src/popup/PopupApp.tsx` | Sửa | Truyền mnemonic, thêm route `/backup-seed` |
| `src/extension/src/popup/pages/SettingsPage.tsx` | Sửa | Thêm menu "Sao lưu Seed Phrase" |
| `src/extension/src/popup/pages/BackupSeedSettingsPage.tsx` | Tạo mới | Trang backup seed phrase |

---

## Kết Quả Mong Đợi

1. Ví tạo mới trong Extension sẽ lưu encrypted mnemonic
2. User có thể xem lại seed phrase từ Settings sau khi nhập password
3. Ví import từ private key sẽ hiển thị thông báo "Không có seed phrase"
4. Seed phrase được bảo vệ bằng mã hóa AES-256-GCM
5. UI nhất quán với design 360px của Extension

---

## Flow Người Dùng

```text
Tạo ví mới → Quiz → Setup Password (lưu encrypted mnemonic)
     ↓
Sử dụng ví bình thường
     ↓
Settings → "Sao lưu Seed Phrase"
     ↓
Nhập password xác minh
     ↓
Hiển thị 12 từ (blur mặc định)
     ↓
Click reveal, copy nếu cần
```

