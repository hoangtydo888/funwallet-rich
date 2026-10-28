import { ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface OnboardingPageProps {
  version: string;
  onImportWallet: () => void;
  onCreateWallet: () => void;
}

/**
 * Onboarding Page - Welcome screen with Create, Import and PWA options
 */
function OnboardingPage({ version, onImportWallet, onCreateWallet }: OnboardingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center relative">
      {/* Logo */}
      <img 
        src="/icons/icon-128.png" 
        alt="FUN Wallet" 
        className="w-32 h-32 mb-6 drop-shadow-xl"
      />
      
      {/* Welcome Message */}
      <h1 className="text-2xl font-bold mb-2">Chào mừng đến FUN Wallet</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Ví Web3 tự quản của bạn. Khóa riêng chỉ nằm trên máy này.
      </p>
      
      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {/* Create Wallet Button - Primary */}
        <Button
          onClick={onCreateWallet}
          className="w-full h-12 text-base font-semibold rounded-full"
          size="lg"
        >
          Tạo ví mới
        </Button>
        
        {/* Import Wallet Button - Secondary */}
        <Button
          onClick={onImportWallet}
          variant="outline"
          className="w-full h-12 text-base font-semibold rounded-full"
          size="lg"
        >
          Tôi đã có ví
        </Button>
      </div>
      
      {/* PWA Link */}
      <a
        href="https://wallet.fun.rich"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-6 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Mở ứng dụng PWA đầy đủ
      </a>
      
      {/* Version Footer */}
      <div className="absolute bottom-4 text-xs text-muted-foreground">
        v{version}
      </div>
    </div>
  );
}

export default OnboardingPage;
