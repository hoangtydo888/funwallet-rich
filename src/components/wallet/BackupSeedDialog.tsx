/**
 * FUN Wallet - Backup Seed Dialog
 * 
 * Educational flow for backing up seed phrase
 * Follows MetaMask/Trust Wallet best practices
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Copy, 
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logBackupViewed } from '@/lib/securityLogger';

interface BackupSeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mnemonic: string;
  walletAddress?: string;
  onBackupComplete: () => void;
  onStartQuiz: () => void;
  onSkip?: () => void;
}

type Step = 'education' | 'display' | 'confirm';

export const BackupSeedDialog = ({
  open,
  onOpenChange,
  mnemonic,
  walletAddress,
  onBackupComplete,
  onStartQuiz,
  onSkip,
}: BackupSeedDialogProps) => {
  const [step, setStep] = useState<Step>('education');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = mnemonic.split(' ').filter(w => w.trim());

  const resetAndClose = () => {
    setStep('education');
    setShowMnemonic(false);
    setUnderstood(false);
    setCopied(false);
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    toast({
      title: 'Đã sao chép',
      description: 'Seed phrase đã được sao chép. Hãy lưu trữ an toàn!',
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleProceedToDisplay = async () => {
    if (!understood) {
      toast({
        title: 'Vui lòng xác nhận',
        description: 'Bạn cần xác nhận đã hiểu các cảnh báo bảo mật',
        variant: 'destructive',
      });
      return;
    }
    
    if (walletAddress) {
      await logBackupViewed(walletAddress);
    }
    setStep('display');
  };

  const handleProceedToConfirm = () => {
    setStep('confirm');
  };

  const handleStartQuiz = () => {
    resetAndClose();
    onStartQuiz();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    resetAndClose();
    onBackupComplete();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'education' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Shield className="h-5 w-5 text-primary" />
                Bảo mật Seed Phrase
              </DialogTitle>
              <DialogDescription>
                Hiểu cách bảo vệ tài sản crypto của bạn
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* What is seed phrase */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">
                  🔑 Seed Phrase là gì?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Seed phrase (cụm từ khôi phục) là 12 từ tiếng Anh duy nhất đại diện cho ví của bạn. 
                  Đây là <strong>cách duy nhất</strong> để khôi phục ví nếu bạn mất thiết bị.
                </p>
              </div>

              {/* Security warnings */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2 text-destructive">
                  ⚠️ Cảnh báo bảo mật quan trọng
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <span><strong>Không bao giờ</strong> chia sẻ seed phrase với bất kỳ ai</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <span><strong>Không chụp ảnh</strong> màn hình hoặc lưu trên đám mây</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <span>FUN Wallet sẽ <strong>không bao giờ</strong> hỏi seed phrase của bạn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span><strong>Viết ra giấy</strong> và cất giữ ở nơi an toàn</span>
                  </li>
                </ul>
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="understand"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <label htmlFor="understand" className="text-sm leading-relaxed cursor-pointer">
                  Tôi hiểu rằng nếu mất seed phrase, tôi sẽ mất quyền truy cập vào tất cả tài sản 
                  trong ví và không ai có thể giúp khôi phục.
                </label>
              </div>

              <Button 
                onClick={handleProceedToDisplay} 
                className="w-full"
                disabled={!understood}
              >
                Tiếp tục
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 'display' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Seed Phrase của bạn
              </DialogTitle>
              <DialogDescription>
                Ghi lại 12 từ này theo đúng thứ tự
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Mnemonic grid */}
              <div className="relative">
                <div 
                  className={`grid grid-cols-3 gap-2 p-4 bg-muted rounded-lg ${
                    !showMnemonic ? 'blur-md select-none' : ''
                  }`}
                >
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-background rounded px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="font-mono text-sm">{word}</span>
                    </div>
                  ))}
                </div>

                {!showMnemonic && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      onClick={() => setShowMnemonic(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Nhấn để hiển thị
                    </Button>
                  </div>
                )}
              </div>

              {showMnemonic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMnemonic(false)}
                  className="w-full text-muted-foreground"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ẩn seed phrase
                </Button>
              )}

              {/* Copy button */}
              <Button 
                variant="outline" 
                onClick={handleCopy} 
                className="w-full"
                disabled={!showMnemonic}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Sao chép Seed Phrase
                  </>
                )}
              </Button>

              {/* Warning */}
              <div className="text-xs text-center text-muted-foreground bg-warning/10 p-2 rounded">
                ⚠️ Đảm bảo không có ai đang nhìn màn hình của bạn
              </div>

              <Button onClick={handleProceedToConfirm} className="w-full">
                Tôi đã ghi lại
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading">
                <Check className="h-5 w-5 text-success" />
                Xác minh backup
              </DialogTitle>
              <DialogDescription>
                Hoàn tất quá trình sao lưu bằng cách xác minh seed phrase
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="bg-success/5 border border-success/20 rounded-lg p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <h4 className="font-semibold mb-1">Gần hoàn tất!</h4>
                <p className="text-sm text-muted-foreground">
                  Xác minh seed phrase để đảm bảo bạn đã ghi đúng.
                  Điều này giúp bảo vệ tài sản của bạn.
                </p>
              </div>

              <div className="grid gap-2">
                <Button onClick={handleStartQuiz} className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Xác minh ngay
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleSkip}
                  className="w-full text-muted-foreground"
                >
                  Bỏ qua (không khuyến khích)
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Bạn có thể xác minh lại sau trong phần Cài đặt → Bảo mật
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
