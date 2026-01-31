import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';
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
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Ghi lại Seed Phrase</h1>
      </div>

      {/* Warning */}
      <div className="bg-destructive/10 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-xs text-destructive">
          Không chụp màn hình! Ghi lại bằng giấy và lưu ở nơi an toàn.
        </p>
      </div>

      {/* Seed Phrase Grid */}
      <div className="relative flex-1">
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

      {/* Actions */}
      <div className="space-y-3 pt-4">
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

        {/* Continue Button */}
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
