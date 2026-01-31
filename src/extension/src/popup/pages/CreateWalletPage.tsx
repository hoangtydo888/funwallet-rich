import { useState } from 'react';
import { ArrowLeft, Shield, AlertTriangle, Eye, Loader2, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { createNewWallet } from '@shared/lib/wallet';

interface CreateWalletPageProps {
  onBack: () => void;
  onWalletCreated: (address: string, privateKey: string, mnemonic: string) => void;
}

/**
 * Create Wallet Page - Security education and wallet generation
 */
function CreateWalletPage({ onBack, onWalletCreated }: CreateWalletPageProps) {
  const [step, setStep] = useState<'education' | 'generating'>('education');
  const [understood, setUnderstood] = useState(false);

  const handleGenerate = async () => {
    setStep('generating');
    
    // Small delay for UX feedback
    await new Promise(r => setTimeout(r, 1500));
    
    // Generate new wallet
    const wallet = createNewWallet();
    onWalletCreated(wallet.address, wallet.privateKey, wallet.mnemonic);
  };

  // Generating state
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-bold mb-2">Đang tạo ví an toàn...</h1>
        <p className="text-muted-foreground text-sm">
          Đang tạo khóa mã hóa và seed phrase
        </p>
      </div>
    );
  }

  // Education state
  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Tạo Ví Mới</h1>
      </div>

      {/* Security Education */}
      <div className="flex-1 space-y-4">
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Seed Phrase là gì?</h3>
              <p className="text-sm text-muted-foreground">
                Seed Phrase (cụm từ khôi phục) gồm 12 từ ngẫu nhiên, 
                là chìa khóa duy nhất để khôi phục ví của bạn.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-destructive/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Cảnh báo quan trọng</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Không chia sẻ seed phrase với bất kỳ ai</li>
                <li>• Ghi lại và lưu trữ ở nơi an toàn</li>
                <li>• Mất seed phrase = mất ví vĩnh viễn</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted-foreground/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Bước tiếp theo</h3>
              <p className="text-sm text-muted-foreground">
                Sau khi tạo ví, bạn sẽ thấy 12 từ. Hãy ghi lại cẩn thận 
                và xác minh bằng quiz trước khi hoàn tất.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-primary text-primary focus:ring-primary"
          />
          <span className="text-sm">
            Tôi hiểu rằng việc mất seed phrase đồng nghĩa với việc mất quyền truy cập ví vĩnh viễn
          </span>
        </label>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <Button
          onClick={handleGenerate}
          disabled={!understood}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Tạo Ví
        </Button>
      </div>
    </div>
  );
}

export default CreateWalletPage;
