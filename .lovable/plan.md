
# Thêm Tính Năng Create New Wallet Trong Chrome Extension

## Tổng Quan

Thêm khả năng tạo ví mới trực tiếp trong Extension với đầy đủ flow bảo mật: Tạo ví → Hiển thị Seed Phrase → Quiz xác minh → Setup Password → Hoàn tất.

---

## Kiến Trúc Giải Pháp

```text
+----------------------------------+
|       OnboardingPage.tsx         |
|  - [Tạo Ví Mới] button  (MỚI!)   |
|  - [Import Ví] button            |
|  - [Mở PWA] link                 |
+----------------------------------+
            |
            v (click Tạo Ví Mới)
+----------------------------------+
|      CreateWalletPage.tsx        |
|  - Generating animation          |
|  - Security education            |
+----------------------------------+
            |
            v (auto-generate)
+----------------------------------+
|      BackupSeedPage.tsx          |
|  - Hiển thị 12 từ (blur/reveal)  |
|  - Nút Copy                      |
|  - Checkbox xác nhận đã ghi lại  |
|  - [Tiếp tục xác minh] button    |
+----------------------------------+
            |
            v
+----------------------------------+
|       SeedQuizPage.tsx           |
|  - 3 câu hỏi random              |
|  - Chọn đúng từ thứ N            |
|  - Progress bar                  |
+----------------------------------+
            |
            v (pass quiz)
+----------------------------------+
|     SetupPasswordPage.tsx        |
|  - (đã có sẵn)                   |
+----------------------------------+
            |
            v
+----------------------------------+
|      CompletePage.tsx            |
|  - (đã có sẵn, thêm info backup) |
+----------------------------------+
```

---

## Files Cần Tạo/Sửa

### 1. **SỬA:** `OnboardingPage.tsx`
Thêm nút "Tạo Ví Mới" làm primary action:

```tsx
interface OnboardingPageProps {
  version: string;
  onImportWallet: () => void;
  onCreateWallet: () => void;  // MỚI
}

// UI với 3 options:
// 1. [Tạo Ví Mới] - Primary button với icon Wallet
// 2. [Import Ví Có Sẵn] - Secondary button với icon Download
// 3. [Mở PWA] - Text link nhỏ ở dưới
```

---

### 2. **TẠO MỚI:** `CreateWalletPage.tsx`
Trang education + generating animation:

```tsx
interface CreateWalletPageProps {
  onBack: () => void;
  onWalletCreated: (address: string, privateKey: string, mnemonic: string) => void;
}

function CreateWalletPage({ onBack, onWalletCreated }: CreateWalletPageProps) {
  const [step, setStep] = useState<'education' | 'generating'>('education');
  const [understood, setUnderstood] = useState(false);

  const handleGenerate = async () => {
    setStep('generating');
    
    // Small delay for UX
    await new Promise(r => setTimeout(r, 1500));
    
    // Use @shared/lib/wallet createNewWallet
    const wallet = createNewWallet();
    onWalletCreated(wallet.address, wallet.privateKey, wallet.mnemonic);
  };

  // UI:
  // Step 1 (education): Security warnings + checkbox + "Tạo Ví" button
  // Step 2 (generating): Loading animation + "Đang tạo ví an toàn..."
}
```

---

### 3. **TẠO MỚI:** `BackupSeedPage.tsx`
Hiển thị seed phrase với blur/reveal:

```tsx
interface BackupSeedPageProps {
  mnemonic: string;
  onBack: () => void;
  onContinue: () => void;
}

function BackupSeedPage({ mnemonic, onBack, onContinue }: BackupSeedPageProps) {
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const words = mnemonic.split(' ');

  // UI:
  // - Header: "Ghi lại Seed Phrase"
  // - Grid 3x4 hiển thị 12 từ (blur khi chưa reveal)
  // - Nút "Nhấn để hiển thị" overlay
  // - Nút Copy
  // - Checkbox "Tôi đã ghi lại seed phrase"
  // - Warning text
  // - [Quay lại] [Tiếp tục xác minh] buttons
}
```

---

### 4. **TẠO MỚI:** `SeedQuizPage.tsx`
Quiz xác minh seed phrase (3 câu hỏi):

```tsx
interface SeedQuizPageProps {
  mnemonic: string;
  onBack: () => void;  // Quay lại xem seed
  onComplete: () => void;
}

function SeedQuizPage({ mnemonic, onBack, onComplete }: SeedQuizPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Logic tương tự SeedQuizDialog trong PWA:
  // - Pick 3 random word positions
  // - Generate 4 options (1 correct + 3 decoys)
  // - Auto-advance on correct
  // - Show "Xem lại" button on wrong

  // UI:
  // - Progress bar (1/3, 2/3, 3/3)
  // - "Từ thứ X là gì?"
  // - Grid 2x2 options
  // - Feedback (correct/wrong)
}
```

---

### 5. **SỬA:** `PopupApp.tsx`
Cập nhật state machine cho create flow:

```tsx
type OnboardingStep = 
  | 'onboarding'      // Welcome screen
  | 'import'          // Import existing wallet
  | 'create'          // Create new - education
  | 'backup'          // Show seed phrase
  | 'quiz'            // Verify seed
  | 'password'        // Setup password
  | 'complete';       // Done

interface CreatedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

// State additions:
const [createdWallet, setCreatedWallet] = useState<CreatedWallet | null>(null);

// Handlers:
const handleCreateWallet = () => setOnboardingStep('create');
const handleWalletCreated = (address, privateKey, mnemonic) => {
  setCreatedWallet({ address, privateKey, mnemonic });
  setOnboardingStep('backup');
};
const handleBackupComplete = () => setOnboardingStep('quiz');
const handleQuizComplete = () => setOnboardingStep('password');
```

---

### 6. **SỬA:** `CompletePage.tsx`
Thêm thông tin backup nếu là create flow:

```tsx
interface CompletePageProps {
  walletAddress: string;
  isNewWallet?: boolean;  // MỚI: true nếu vừa create
  onStart: () => void;
}

// Thêm bullet point nếu isNewWallet:
// ✓ Seed phrase đã được xác minh
```

---

## Import Dependencies

```tsx
// CreateWalletPage.tsx
import { createNewWallet } from '@shared/lib/wallet';

// SeedQuizPage.tsx
// - Sử dụng DECOY_WORDS array (có thể copy từ PWA hoặc tạo shared constant)
```

---

## Tóm Tắt Thay Đổi

| File | Loại | Mô tả |
|------|------|-------|
| `OnboardingPage.tsx` | Sửa | Thêm nút "Tạo Ví Mới" |
| `CreateWalletPage.tsx` | Tạo mới | Education + generating |
| `BackupSeedPage.tsx` | Tạo mới | Hiển thị seed phrase |
| `SeedQuizPage.tsx` | Tạo mới | Quiz xác minh 3 câu |
| `PopupApp.tsx` | Sửa | Thêm create flow routing |
| `CompletePage.tsx` | Sửa | Thêm prop isNewWallet |

---

## Flow Người Dùng

```text
1. Mở Extension lần đầu
2. Thấy 3 options: Tạo Mới / Import / Mở PWA
3. Click "Tạo Ví Mới"
4. Đọc cảnh báo bảo mật, tick checkbox
5. Click "Tạo Ví" → Loading 1.5s
6. Thấy 12 từ seed phrase (blur)
7. Click reveal, copy/ghi lại
8. Tick "Đã ghi lại", click "Tiếp tục xác minh"
9. Trả lời 3 câu quiz đúng
10. Setup mật khẩu
11. Hoàn tất → Vào HomePage
```

---

## Kết Quả Mong Đợi

1. Người dùng có thể tạo ví mới hoàn toàn trong Extension
2. Flow backup seed phrase đầy đủ và an toàn
3. Quiz xác minh đảm bảo user đã ghi đúng
4. Không cần redirect sang PWA
5. Trải nghiệm nhất quán với design 360x540px của Extension
