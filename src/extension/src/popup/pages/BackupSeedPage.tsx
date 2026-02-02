import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { Button } from '../../components/ui/Button';

interface BackupSeedPageProps {
  mnemonic: string;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Backup Seed Page - Display seed phrase with blur/reveal
 */
function BackupSeedPage({ mnemonic, onBack, onContinue }: BackupSeedPageProps) {
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const words = mnemonic.split(' ');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Cố định */}
      <div className="flex items-center gap-3 p-4 pb-2 flex-shrink-0">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Ghi lại Seed Phrase</h1>
      </div>

      {/* Content - Cuộn được */}
      <ScrollAreaPrimitive.Root className="flex-1 overflow-hidden">
        <ScrollAreaPrimitive.Viewport className="h-full w-full">
          <div className="px-4 pb-4 space-y-4">
            {/* Warning */}
            <div className="bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Không chụp màn hình! Ghi lại bằng giấy và lưu ở nơi an toàn.
              </p>
            </div>

            {/* Seed Phrase Grid */}
            <div className="relative">
              <div className={`grid grid-cols-3 gap-2 ${!showSeed ? 'blur-md select-none' : ''}`}>
                {words.map((word, index) => (
                  <div 
                    key={index}
                    className="bg-muted rounded-lg p-2 text-center"
                  >
                    <span className="text-xs text-muted-foreground">{index + 1}.</span>
                    <span className="text-sm font-mono ml-1">{word}</span>
                  </div>
                ))}
              </div>

              {/* Reveal Overlay */}
              {!showSeed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    onClick={() => setShowSeed(true)}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Nhấn để hiển thị
                  </Button>
                </div>
              )}
            </div>

            {/* Copy & Hide buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 gap-2"
                disabled={!showSeed}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
              {showSeed && (
                <Button
                  onClick={() => setShowSeed(false)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <EyeOff className="w-4 h-4" />
                  Ẩn đi
                </Button>
              )}
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-primary text-primary focus:ring-primary"
              />
              <span className="text-sm">
                Tôi đã ghi lại seed phrase ở nơi an toàn
              </span>
            </label>
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar 
          orientation="vertical"
          className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
        </ScrollAreaPrimitive.Scrollbar>
      </ScrollAreaPrimitive.Root>

      {/* Footer - Cố định */}
      <div className="p-4 pt-3 flex-shrink-0 border-t border-border/50">
        <Button
          onClick={onContinue}
          disabled={!confirmed || !showSeed}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          Tiếp tục xác minh
        </Button>
      </div>
    </div>
  );
}

export default BackupSeedPage;
