import { ExternalLink, Download, Wallet } from 'lucide-react';
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
        src="/icons/logo.gif" 
        alt="FUN Wallet" 
        className="w-24 h-24 mb-6"
      />
      
      {/* Welcome Message */}
      <h1 className="text-xl font-bold mb-2">Chào mừng đến FUN Wallet</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Tạo ví mới hoặc import ví có sẵn
      </p>
      
      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {/* Create Wallet Button - Primary */}
        <Button
          onClick={onCreateWallet}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Tạo Ví Mới
        </Button>
        
        {/* Import Wallet Button - Secondary */}
        <Button
          onClick={onImportWallet}
          variant="outline"
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Import Ví Có Sẵn
        </Button>
      </div>
      
      {/* PWA Link */}
      <a
        href="https://wallet-fun-rich.lovable.app"
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
