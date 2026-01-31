
# Thêm Tính Năng Import Wallet Trực Tiếp Trong Chrome Extension

## Tổng Quan

Thêm khả năng import ví trực tiếp từ Seed Phrase hoặc Private Key ngay trong Extension, thay vì bắt người dùng phải redirect sang PWA. Flow sẽ bao gồm: Import → Setup Password → Hoàn tất.

---

## Kiến Trúc Giải Pháp

```text
+----------------------------------+
|         PopupApp.tsx             |
|   (hasWallet = false)            |
+----------------------------------+
            |
            v
+----------------------------------+
|       OnboardingPage.tsx         |
|  - Logo + Welcome message        |
|  - [Mở PWA] button               |
|  - [Import Ví] button  (MỚI!)    |
+----------------------------------+
            |
            v (click Import Ví)
+----------------------------------+
|       ImportWalletPage.tsx       |
|  - Tab: Seed Phrase | Private Key|
|  - Input field với toggle show   |
|  - Validate input                |
|  - [Quay lại] [Import] buttons   |
+----------------------------------+
            |
            v (import success)
+----------------------------------+
|      SetupPasswordPage.tsx       |
|  - Input Password (min 6 chars)  |
|  - Confirm Password              |
|  - Password strength indicator   |
|  - [Thiết lập] button            |
+----------------------------------+
            |
            v (encrypt & save)
+----------------------------------+
|       CompletePage.tsx           |
|  - Success checkmark             |
|  - Security summary              |
|  - [Bắt đầu sử dụng] button      |
+----------------------------------+
            |
            v
        HomePage (unlocked)
```

---

## Files Cần Tạo/Sửa

### 1. **TẠO MỚI:** `src/extension/src/popup/pages/OnboardingPage.tsx`

Tách logic onboarding ra khỏi PopupApp thành component riêng:

```tsx
interface OnboardingPageProps {
  version: string;
  onImportWallet: () => void;
}

function OnboardingPage({ version, onImportWallet }: OnboardingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center relative">
      <img src="/icons/icon-128.png" alt="FUN Wallet" className="w-16 h-16 mb-4" />
      <h1 className="text-xl font-bold mb-2">Chào mừng đến FUN Wallet</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Tạo ví mới trên PWA hoặc import ví có sẵn
      </p>
      
      {/* 2 buttons: Import Wallet + Open PWA */}
      <button onClick={onImportWallet}>Import Ví</button>
      <a href="https://wallet-fun-rich.lovable.app" target="_blank">
        Tạo Ví Mới (PWA)
      </a>
      
      <div className="absolute bottom-4 text-xs text-muted-foreground">v{version}</div>
    </div>
  );
}
```

---

### 2. **TẠO MỚI:** `src/extension/src/popup/pages/ImportWalletPage.tsx`

Trang import với 2 tab: Seed Phrase và Private Key

```tsx
interface ImportWalletPageProps {
  onBack: () => void;
  onImportSuccess: (address: string, privateKey: string) => void;
}

function ImportWalletPage({ onBack, onImportSuccess }: ImportWalletPageProps) {
  const [importType, setImportType] = useState<'mnemonic' | 'privateKey'>('mnemonic');
  const [input, setInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = () => {
    if (importType === 'mnemonic') {
      // Use importWalletFromMnemonic from @shared/lib/wallet
      const result = importWalletFromMnemonic(input);
      if (result) {
        onImportSuccess(result.address, result.privateKey);
      } else {
        setError('Seed phrase không hợp lệ');
      }
    } else {
      // Use importWalletFromPrivateKey from @shared/lib/wallet
      const result = importWalletFromPrivateKey(input);
      if (result) {
        onImportSuccess(result.address, input);
      } else {
        setError('Private key không hợp lệ');
      }
    }
  };

  // UI: Tabs, Input with toggle, Buttons
}
```

---

### 3. **TẠO MỚI:** `src/extension/src/popup/pages/SetupPasswordPage.tsx`

Thiết lập mật khẩu cho Extension:

```tsx
interface SetupPasswordPageProps {
  walletAddress: string;
  privateKey: string;
  onComplete: () => void;
}

function SetupPasswordPage({ walletAddress, privateKey, onComplete }: SetupPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSetup = async () => {
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    // 1. Encrypt private key with password using @shared/lib/encryption
    const encryptedData = await encryptPrivateKey(privateKey, password);

    // 2. Save to chrome.storage.local
    const walletStorage: SecureWalletStorage = {
      version: 1,
      wallets: { [walletAddress]: encryptedData },
      lastAccess: Date.now()
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENCRYPTED_KEYS]: JSON.stringify(walletStorage),
      [STORAGE_KEYS.WALLETS]: JSON.stringify([{ 
        address: walletAddress, 
        name: 'Ví của tôi',
        isPrimary: true,
        createdAt: Date.now()
      }]),
      [STORAGE_KEYS.ACTIVE_WALLET]: walletAddress
    });

    // 3. Send message to background to unlock
    await chrome.runtime.sendMessage({
      type: 'UNLOCK_WALLET',
      payload: { password }
    });

    onComplete();
  };

  // UI: Password input, Confirm input, Strength indicator, Submit button
}
```

---

### 4. **SỬA:** `src/extension/src/popup/PopupApp.tsx`

Thêm state và routing cho import flow:

```tsx
function PopupApp() {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [version, setVersion] = useState('');
  
  // NEW: Import flow state
  const [importStep, setImportStep] = useState<'onboarding' | 'import' | 'password' | 'complete'>('onboarding');
  const [importedWallet, setImportedWallet] = useState<{address: string, privateKey: string} | null>(null);

  // ... existing useEffect & checkWalletState ...

  // NEW: Handle import success
  const handleImportSuccess = (address: string, privateKey: string) => {
    setImportedWallet({ address, privateKey });
    setImportStep('password');
  };

  // NEW: Handle password setup complete
  const handlePasswordComplete = () => {
    setImportStep('complete');
    // Refresh wallet state
    checkWalletState();
  };

  // No wallet - show import flow
  if (!hasWallet) {
    return (
      <PopupLayout>
        {importStep === 'onboarding' && (
          <OnboardingPage 
            version={version} 
            onImportWallet={() => setImportStep('import')} 
          />
        )}
        {importStep === 'import' && (
          <ImportWalletPage 
            onBack={() => setImportStep('onboarding')}
            onImportSuccess={handleImportSuccess}
          />
        )}
        {importStep === 'password' && importedWallet && (
          <SetupPasswordPage 
            walletAddress={importedWallet.address}
            privateKey={importedWallet.privateKey}
            onComplete={handlePasswordComplete}
          />
        )}
        {importStep === 'complete' && (
          <CompletePage onStart={() => {
            setHasWallet(true);
            setIsUnlocked(true);
          }} />
        )}
      </PopupLayout>
    );
  }

  // ... existing routes ...
}
```

---

### 5. **TẠO MỚI:** `src/extension/src/popup/pages/CompletePage.tsx`

Màn hình hoàn tất:

```tsx
function CompletePage({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-success" />
      </div>
      <h1 className="text-xl font-bold mb-2">Hoàn tất!</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Ví của bạn đã được import và bảo mật thành công
      </p>
      
      <ul className="text-left text-sm space-y-2 mb-6 bg-success/10 p-4 rounded-lg w-full">
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          Private key đã được mã hóa AES-256-GCM
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          Mật khẩu bảo vệ đã được thiết lập
        </li>
      </ul>
      
      <button onClick={onStart}>Bắt đầu sử dụng</button>
    </div>
  );
}
```

---

## Tóm Tắt Thay Đổi

| File | Loại | Mô tả |
|------|------|-------|
| `OnboardingPage.tsx` | Tạo mới | Màn hình welcome với 2 options |
| `ImportWalletPage.tsx` | Tạo mới | Form import Seed/Private Key |
| `SetupPasswordPage.tsx` | Tạo mới | Thiết lập mật khẩu + encrypt |
| `CompletePage.tsx` | Tạo mới | Màn hình hoàn tất |
| `PopupApp.tsx` | Sửa | Thêm routing cho import flow |

---

## Import Dependencies

Các trang mới sẽ import từ `@shared`:

```tsx
import { importWalletFromMnemonic, importWalletFromPrivateKey } from '@shared/lib/wallet';
import { encryptPrivateKey, getPasswordStrength } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
import { SecureWalletStorage, WalletAccount } from '@shared/types';
```

---

## Kết Quả Mong Đợi

1. Người dùng có thể import ví trực tiếp trong Extension
2. Không cần redirect sang PWA nếu đã có ví sẵn
3. Flow bảo mật đầy đủ: Import → Password → Encrypt → Save
4. UI nhất quán với design 360px của Extension
5. Tái sử dụng các functions từ `@shared` để đảm bảo logic đồng bộ với PWA
