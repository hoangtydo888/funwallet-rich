import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Shield, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
import { SecureWalletStorage } from '@shared/types';

type Step = 'loading' | 'no-mnemonic' | 'verify' | 'show';

/**
 * Backup Seed Phrase Settings Page
 * Allows users to view their seed phrase after password verification
 */
function BackupSeedSettingsPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [encryptedMnemonic, setEncryptedMnemonic] = useState<SecureWalletStorage['mnemonics'] | null>(null);

  useEffect(() => {
    checkMnemonicAvailability();
  }, []);

  const checkMnemonicAvailability = async () => {
    try {
      // Get active wallet and encrypted storage
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.ACTIVE_WALLET,
        STORAGE_KEYS.ENCRYPTED_KEYS
      ]);

      const wallet = result[STORAGE_KEYS.ACTIVE_WALLET];
      setActiveWallet(wallet);

      if (!wallet) {
        setStep('no-mnemonic');
        return;
      }

      const storageData = result[STORAGE_KEYS.ENCRYPTED_KEYS];
      if (!storageData) {
        setStep('no-mnemonic');
        return;
      }

      const walletStorage: SecureWalletStorage = JSON.parse(storageData);
      
      // Check if mnemonic exists for this wallet
      if (walletStorage.mnemonics && walletStorage.mnemonics[wallet]) {
        setEncryptedMnemonic(walletStorage.mnemonics);
        setStep('verify');
      } else {
        setStep('no-mnemonic');
      }
    } catch (err) {
      console.error('Error checking mnemonic:', err);
      setStep('no-mnemonic');
    }
  };

  const handleVerify = async () => {
    if (!password || !activeWallet || !encryptedMnemonic) return;

    setError('');
    setLoading(true);

    try {
      const encryptedData = encryptedMnemonic[activeWallet];
      const decryptedMnemonic = await decryptPrivateKey(encryptedData, password);
      
      setMnemonic(decryptedMnemonic);
      setStep('show');
    } catch (err) {
      console.error('Decryption error:', err);
      setError('Mật khẩu không đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!mnemonic) return;

    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const words = mnemonic?.split(' ') || [];

  // Loading state
  if (step === 'loading') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Sao lưu Seed Phrase</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // No mnemonic available (imported wallet)
  if (step === 'no-mnemonic') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Sao lưu Seed Phrase</h1>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Không có Seed Phrase</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ví này được import từ Private Key nên không có seed phrase để sao lưu.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Chỉ các ví được tạo mới trong ứng dụng mới có seed phrase.
          </p>
        </div>

        <div className="p-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  // Password verification step
  if (step === 'verify') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Sao lưu Seed Phrase</h1>
        </div>
        
        <div className="flex-1 p-4">
          {/* Security Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold mb-2">Xác minh danh tính</h2>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Nhập mật khẩu ví để xem seed phrase của bạn
          </p>

          {/* Password Input */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Nhập mật khẩu"
                className="w-full pr-12"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) {
                    handleVerify();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              onClick={handleVerify}
              disabled={!password || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xác minh...
                </>
              ) : (
                'Xác minh'
              )}
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4">
          <div className="bg-destructive/10 rounded-lg p-3">
            <p className="text-xs text-destructive text-center">
              ⚠️ Không bao giờ chia sẻ seed phrase với bất kỳ ai
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show seed phrase step
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Seed Phrase của bạn</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Cảnh báo bảo mật</p>
              <p className="text-xs text-destructive/80 mt-1">
                Không chia sẻ seed phrase với bất kỳ ai. Bất kỳ ai có seed phrase đều có thể truy cập ví của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Seed Phrase Grid */}
        <div className="relative">
          <div className={`grid grid-cols-3 gap-2 p-4 bg-muted rounded-xl transition-all ${
            !showSeed ? 'blur-md select-none' : ''
          }`}>
            {words.map((word, index) => (
              <div
                key={index}
                className="bg-background rounded-lg p-2 text-center"
              >
                <span className="text-xs text-muted-foreground">{index + 1}.</span>
                <span className="text-sm font-medium ml-1">{word}</span>
              </div>
            ))}
          </div>

          {/* Reveal overlay */}
          {!showSeed && (
            <button
              onClick={() => setShowSeed(true)}
              className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-xl"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Nhấn để hiển thị</span>
              </div>
            </button>
          )}
        </div>

        {/* Copy Button */}
        {showSeed && (
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full mt-4"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-success" />
                Đã copy!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Seed Phrase
              </>
            )}
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="w-full"
        >
          Xong
        </Button>
      </div>
    </div>
  );
}

export default BackupSeedSettingsPage;
