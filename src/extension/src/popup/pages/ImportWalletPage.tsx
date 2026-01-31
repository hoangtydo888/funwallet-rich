import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { importWalletFromMnemonic, importWalletFromPrivateKey } from '@shared/lib/wallet';

interface ImportWalletPageProps {
  onBack: () => void;
  onImportSuccess: (address: string, privateKey: string) => void;
}

type ImportType = 'mnemonic' | 'privateKey';

/**
 * Import Wallet Page - Form to import via Seed Phrase or Private Key
 */
function ImportWalletPage({ onBack, onImportSuccess }: ImportWalletPageProps) {
  const [importType, setImportType] = useState<ImportType>('mnemonic');
  const [input, setInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setError('');
    setLoading(true);

    try {
      // Validate input
      const trimmedInput = input.trim();
      if (!trimmedInput) {
        setError(importType === 'mnemonic' 
          ? 'Vui lòng nhập Seed Phrase' 
          : 'Vui lòng nhập Private Key'
        );
        setLoading(false);
        return;
      }

      if (importType === 'mnemonic') {
        // Validate seed phrase word count
        const words = trimmedInput.split(/\s+/);
        if (![12, 15, 18, 21, 24].includes(words.length)) {
          setError('Seed phrase phải có 12, 15, 18, 21 hoặc 24 từ');
          setLoading(false);
          return;
        }

        const result = importWalletFromMnemonic(trimmedInput);
        if (result) {
          onImportSuccess(result.address, result.privateKey);
        } else {
          setError('Seed phrase không hợp lệ. Vui lòng kiểm tra lại.');
        }
      } else {
        // Validate private key format
        let formattedKey = trimmedInput;
        if (!formattedKey.startsWith('0x')) {
          formattedKey = '0x' + formattedKey;
        }

        if (formattedKey.length !== 66) {
          setError('Private key không hợp lệ. Key phải có 64 ký tự hex.');
          setLoading(false);
          return;
        }

        const result = importWalletFromPrivateKey(formattedKey);
        if (result) {
          onImportSuccess(result.address, formattedKey);
        } else {
          setError('Private key không hợp lệ. Vui lòng kiểm tra lại.');
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Đã xảy ra lỗi khi import ví. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (type: ImportType) => {
    setImportType(type);
    setInput('');
    setError('');
    setShowSecret(false);
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Import Ví</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-lg p-1 mb-6">
        <button
          onClick={() => handleTabChange('mnemonic')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            importType === 'mnemonic'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Seed Phrase
        </button>
        <button
          onClick={() => handleTabChange('privateKey')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            importType === 'privateKey'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Private Key
        </button>
      </div>

      {/* Input Form */}
      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">
          {importType === 'mnemonic' ? 'Nhập Seed Phrase' : 'Nhập Private Key'}
        </label>
        
        <div className="relative">
          {importType === 'mnemonic' ? (
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              placeholder="Nhập các từ cách nhau bằng dấu cách..."
              className="w-full h-32 p-3 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ 
                WebkitTextSecurity: showSecret ? 'none' : 'disc' 
              } as React.CSSProperties}
            />
          ) : (
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                }}
                placeholder="0x..."
                className="w-full pr-12 font-mono text-sm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          )}
          
          {/* Toggle visibility */}
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showSecret ? 'Ẩn' : 'Hiện'}
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground mt-2">
          {importType === 'mnemonic'
            ? 'Seed phrase 12-24 từ, cách nhau bằng dấu cách'
            : 'Private key hex 64 ký tự (có hoặc không có 0x)'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Security Warning */}
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
        <p className="text-xs text-warning">
          ⚠️ Không bao giờ chia sẻ seed phrase hoặc private key với bất kỳ ai. 
          FUN Wallet sẽ mã hóa và lưu trữ an toàn trên thiết bị của bạn.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={loading}
        >
          Quay lại
        </Button>
        <Button
          onClick={handleImport}
          className="flex-1"
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            'Import'
          )}
        </Button>
      </div>
    </div>
  );
}

export default ImportWalletPage;
