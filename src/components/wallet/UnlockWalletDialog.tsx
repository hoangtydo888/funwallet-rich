/**
 * FUN Wallet - Unlock Wallet Dialog
 * 
 * Prompts user to enter password to unlock wallet
 * Includes failed attempts counter and lockout handling
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, AlertTriangle, Fingerprint } from 'lucide-react';

interface UnlockWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: (password: string) => Promise<boolean>;
  failedAttempts?: number;
  isLocked?: boolean;
  lockoutEndTime?: number | null;
  title?: string;
  description?: string;
}

export const UnlockWalletDialog = ({
  open,
  onOpenChange,
  onUnlock,
  failedAttempts = 0,
  isLocked = false,
  lockoutEndTime = null,
  title = 'Mở khóa ví',
  description = 'Nhập mật khẩu để tiếp tục',
}: UnlockWalletDialogProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setError('');
    }
  }, [open]);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked || !lockoutEndTime) {
      setRemainingTime(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, lockoutEndTime - Date.now());
      setRemainingTime(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || isLocked) return;

    setLoading(true);
    setError('');

    try {
      const success = await onUnlock(password);
      
      if (success) {
        setPassword('');
        onOpenChange(false);
      } else {
        setError('Mật khẩu không đúng');
        setPassword('');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingAttempts = 5 - failedAttempts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Lock className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {isLocked && remainingTime > 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Tài khoản bị khóa</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quá nhiều lần thử sai. Vui lòng đợi:
              </p>
              <p className="text-2xl font-mono font-bold mt-2">
                {formatTime(remainingTime)}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoFocus
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            {failedAttempts > 0 && failedAttempts < 5 && (
              <div className="text-sm text-warning bg-warning/10 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Còn {remainingAttempts} lần thử</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !password}
              >
                {loading ? 'Đang xử lý...' : 'Mở khóa'}
              </Button>
            </div>

            {/* Biometric option placeholder */}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Sử dụng vân tay (sắp có)
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Quên mật khẩu? Bạn có thể khôi phục ví bằng seed phrase
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
