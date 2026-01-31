import { Check, Shield, Lock, Sparkles, FileCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface CompletePageProps {
  walletAddress: string;
  isNewWallet?: boolean;
  onStart: () => void;
}

/**
 * Complete Page - Success screen after wallet setup
 */
function CompletePage({ walletAddress, isNewWallet = false, onStart }: CompletePageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Check className="w-10 h-10 text-success" />
      </div>
      
      {/* Success Message */}
      <h1 className="text-xl font-bold mb-2">
        {isNewWallet ? 'Tạo ví thành công!' : 'Import thành công!'}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Ví của bạn đã được {isNewWallet ? 'tạo' : 'import'} và bảo mật thành công
      </p>
      
      {/* Wallet Address */}
      <div className="bg-muted rounded-lg p-3 mb-6 w-full">
        <p className="text-xs text-muted-foreground mb-1">Địa chỉ ví</p>
        <p className="text-sm font-mono break-all">
          {walletAddress.slice(0, 14)}...{walletAddress.slice(-10)}
        </p>
      </div>
      
      {/* Security Summary */}
      <div className="w-full space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
          <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-success" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Mã hóa AES-256-GCM</p>
            <p className="text-xs text-muted-foreground">Private key được mã hóa an toàn</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
          <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-success" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Mật khẩu bảo vệ</p>
            <p className="text-xs text-muted-foreground">Ví được khóa khi không sử dụng</p>
          </div>
        </div>

        {isNewWallet && (
          <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
            <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-4 h-4 text-success" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Seed phrase đã xác minh</p>
              <p className="text-xs text-muted-foreground">Bạn đã backup seed phrase thành công</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Sẵn sàng kết nối DApps</p>
            <p className="text-xs text-muted-foreground">Giao dịch trực tiếp trên BSC</p>
          </div>
        </div>
      </div>
      
      {/* Start Button */}
      <Button
        onClick={onStart}
        className="w-full h-12 text-base font-medium"
        size="lg"
      >
        Bắt đầu sử dụng
      </Button>
    </div>
  );
}

export default CompletePage;
