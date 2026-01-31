import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { 
  isValidAddress, 
  formatBalance,
  sendNativeToken,
  sendToken,
  getNativeBalance,
  getTokenBalance 
} from '@shared/lib/wallet';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';

interface TokenOption {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  logo: string;
  balance: string;
}

function SendPage() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [showTokenSelect, setShowTokenSelect] = useState(false);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    loadTokenBalances();
  }, []);

  const loadTokenBalances = async () => {
    setLoadingBalances(true);
    try {
      const walletData = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET);
      const address = walletData[STORAGE_KEYS.ACTIVE_WALLET];
      
      if (!address) return;

      // Load top tokens with balances
      const topTokens = COMMON_TOKENS.slice(0, 5);
      const tokenBalances: TokenOption[] = [];

      for (const token of topTokens) {
        let balance = '0';
        try {
          if (token.address === null) {
            balance = await getNativeBalance(address);
          } else {
            balance = await getTokenBalance(token.address, address);
          }
        } catch {
          balance = '0';
        }
        
        tokenBalances.push({
          ...token,
          balance,
        });
      }

      setTokens(tokenBalances);
      if (tokenBalances.length > 0) {
        setSelectedToken(tokenBalances[0]);
      }
    } catch (err) {
      console.error('Error loading balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleMaxAmount = () => {
    if (selectedToken) {
      // For native token, leave some for gas
      if (selectedToken.address === null) {
        const max = Math.max(0, parseFloat(selectedToken.balance) - 0.005);
        setAmount(max.toString());
      } else {
        setAmount(selectedToken.balance);
      }
    }
  };

  const handleSend = async () => {
    setError('');
    setTxHash('');

    // Validate inputs
    if (!selectedToken) {
      setError('Vui lòng chọn token');
      return;
    }

    if (!isValidAddress(toAddress)) {
      setError('Địa chỉ ví không hợp lệ');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Số lượng không hợp lệ');
      return;
    }

    if (amountNum > parseFloat(selectedToken.balance)) {
      setError('Số dư không đủ');
      return;
    }

    setLoading(true);

    try {
      // Get encrypted private key
      const encryptedData = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTED_KEYS);
      const walletData = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET);
      const activeAddress = walletData[STORAGE_KEYS.ACTIVE_WALLET];

      if (!encryptedData[STORAGE_KEYS.ENCRYPTED_KEYS] || !activeAddress) {
        setError('Không tìm thấy ví');
        return;
      }

      // For now, we need to prompt for password to decrypt
      // In a real implementation, we'd cache the decrypted key in memory after unlock
      const password = prompt('Nhập mật khẩu để xác nhận giao dịch:');
      if (!password) {
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(encryptedData[STORAGE_KEYS.ENCRYPTED_KEYS]);
      const keyData = parsed.wallets[activeAddress];
      
      if (!keyData) {
        setError('Không tìm thấy private key');
        return;
      }

      const privateKey = await decryptPrivateKey(keyData, password);

      // Send transaction
      let result;
      if (selectedToken.address === null) {
        // Native token (BNB)
        result = await sendNativeToken(privateKey, toAddress, amount);
      } else {
        // ERC-20 token
        result = await sendToken(privateKey, selectedToken.address, toAddress, amount, selectedToken.decimals);
      }

      if (result.success && 'data' in result) {
        setTxHash(result.data.hash);
        // Reload balances
        setTimeout(loadTokenBalances, 2000);
      } else if ('hash' in result) {
        setTxHash(result.hash);
        setTimeout(loadTokenBalances, 2000);
      } else if ('error' in result) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giao dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getAssetUrl = (path: string) => {
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return path;
    }
  };

  if (txHash) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Giao dịch thành công</h1>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-lg font-medium mb-2">Đã gửi thành công!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {amount} {selectedToken?.symbol}
          </p>
          <button
            onClick={() => {
              chrome.tabs.create({ url: `https://bscscan.com/tx/${txHash}` });
            }}
            className="text-sm text-primary underline"
          >
            Xem trên BSCScan
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Gửi Crypto</h1>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Token Select */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Chọn token</label>
          <button
            onClick={() => setShowTokenSelect(!showTokenSelect)}
            className="w-full flex items-center justify-between p-3 bg-muted rounded-xl"
            disabled={loadingBalances}
          >
            {loadingBalances ? (
              <span className="text-muted-foreground">Đang tải...</span>
            ) : selectedToken ? (
              <div className="flex items-center gap-2">
                <img 
                  src={getAssetUrl(selectedToken.logo)} 
                  alt={selectedToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = getAssetUrl('/tokens/default.svg'); }}
                />
                <span className="font-medium">{selectedToken.symbol}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Chọn token</span>
            )}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showTokenSelect && (
            <div className="mt-2 bg-muted rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {tokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    setSelectedToken(token);
                    setShowTokenSelect(false);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/80"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={getAssetUrl(token.logo)} 
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).src = getAssetUrl('/tokens/default.svg'); }}
                    />
                    <span>{token.symbol}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatBalance(token.balance)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* To Address */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Địa chỉ nhận</label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none font-mono text-sm"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Số lượng</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 pr-16 bg-muted rounded-xl border border-border focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleMaxAmount}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
            >
              MAX
            </button>
          </div>
          {selectedToken && (
            <p className="text-xs text-muted-foreground mt-1">
              Số dư: {formatBalance(selectedToken.balance)} {selectedToken.symbol}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Submit */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleSend}
          disabled={loading || !selectedToken || !toAddress || !amount}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            'Gửi'
          )}
        </button>
      </div>
    </div>
  );
}

export default SendPage;
