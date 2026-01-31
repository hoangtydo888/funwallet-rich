import { ExternalLink, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface OnboardingPageProps {
  version: string;
  onImportWallet: () => void;
}

/**
 * Onboarding Page - Welcome screen with Import and PWA options
 */
function OnboardingPage({ version, onImportWallet }: OnboardingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center relative">
      {/* Logo */}
      <img 
        src="/icons/icon-128.png" 
        alt="FUN Wallet" 
        className="w-20 h-20 mb-6"
      />
      
      {/* Welcome Message */}
      <h1 className="text-xl font-bold mb-2">Chào mừng đến FUN Wallet</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Tạo ví mới trên PWA hoặc import ví có sẵn
      </p>
      
      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {/* Import Wallet Button - Primary */}
        <Button
          onClick={onImportWallet}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Import Ví Có Sẵn
        </Button>
        
        {/* Open PWA Button - Secondary */}
        <a
          href="https://wallet-fun-rich.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Tạo Ví Mới (PWA)
          </Button>
        </a>
      </div>
      
      {/* Info Text */}
      <p className="text-xs text-muted-foreground mt-6 px-4">
        Import ví bằng Seed Phrase hoặc Private Key nếu bạn đã có ví. 
        Hoặc mở PWA để tạo ví mới.
      </p>
      
      {/* Version Footer */}
      <div className="absolute bottom-4 text-xs text-muted-foreground">
        v{version}
      </div>
    </div>
  );
}

export default OnboardingPage;
