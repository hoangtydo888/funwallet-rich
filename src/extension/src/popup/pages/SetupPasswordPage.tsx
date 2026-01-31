import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { encryptPrivateKey, getPasswordStrength } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
import { SecureWalletStorage, WalletAccount } from '@shared/types';

interface SetupPasswordPageProps {
  walletAddress: string;
  privateKey: string;
  mnemonic?: string; // Only present when creating new wallet
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Setup Password Page - Create password to encrypt wallet
 */
function SetupPasswordPage({ 
  walletAddress, 
  privateKey,
  mnemonic,
  onComplete, 
  onBack 
}: SetupPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSetup = async () => {
    setError('');

    // Validate password
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      // 1. Encrypt private key with password
      const encryptedData = await encryptPrivateKey(privateKey, password);

      // 2. Create wallet storage structure
      const walletStorage: SecureWalletStorage = {
        version: 1,
        wallets: { [walletAddress]: encryptedData },
        lastAccess: Date.now()
      };

      // 2b. If mnemonic exists (new wallet), encrypt and store it too
      if (mnemonic) {
        const encryptedMnemonic = await encryptPrivateKey(mnemonic, password);
        walletStorage.mnemonics = { [walletAddress]: encryptedMnemonic };
      }

      // 3. Create wallet account
      const walletAccount: WalletAccount = {
        address: walletAddress,
        name: 'Ví của tôi',
        isPrimary: true,
        createdAt: Date.now()
      };

      // 4. Save to chrome.storage.local
      await chrome.storage.local.set({
        [STORAGE_KEYS.ENCRYPTED_KEYS]: JSON.stringify(walletStorage),
        [STORAGE_KEYS.WALLETS]: JSON.stringify([walletAccount]),
        [STORAGE_KEYS.ACTIVE_WALLET]: walletAddress
      });

      // 5. Send message to background to unlock with the new password
      await chrome.runtime.sendMessage({
        type: 'UNLOCK_WALLET',
        payload: { password }
      });

      // 6. Complete setup
      onComplete();
    } catch (err) {
      console.error('Setup error:', err);
      setError('Đã xảy ra lỗi khi thiết lập mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (color: string) => {
    switch (color) {
      case 'destructive': return 'bg-destructive';
      case 'warning': return 'bg-warning';
      case 'success': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          aria-label="Quay lại"
          disabled={loading}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Thiết lập mật khẩu</h1>
      </div>

      {/* Wallet Address Preview */}
      <div className="bg-muted rounded-lg p-3 mb-6">
        <p className="text-xs text-muted-foreground mb-1">Địa chỉ ví</p>
        <p className="text-sm font-mono break-all">
          {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-4">
        {/* Password Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Mật khẩu</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
              className="w-full pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Ẩn' : 'Hiện'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength.score
                        ? getStrengthColor(passwordStrength.color)
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${
                passwordStrength.color === 'destructive' ? 'text-destructive' :
                passwordStrength.color === 'warning' ? 'text-warning' :
                'text-success'
              }`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Xác nhận mật khẩu</label>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Nhập lại mật khẩu"
              className="w-full pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Ẩn' : 'Hiện'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Password match indicator */}
          {confirmPassword && password && (
            <p className={`text-xs mt-1 ${
              password === confirmPassword ? 'text-success' : 'text-destructive'
            }`}>
              {password === confirmPassword ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp'}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="bg-primary/10 rounded-lg p-3 mb-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Bảo mật AES-256-GCM</p>
          <p className="text-xs text-muted-foreground mt-1">
            Private key sẽ được mã hóa với chuẩn bảo mật cao nhất và chỉ lưu trên thiết bị của bạn.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={handleSetup}
        className="w-full h-12 text-base font-medium"
        disabled={loading || !password || !confirmPassword}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Đang mã hóa...
          </>
        ) : (
          'Hoàn tất thiết lập'
        )}
      </Button>
    </div>
  );
}

export default SetupPasswordPage;
