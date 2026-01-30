import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  QrCode, 
  Settings, 
  Copy, 
  ExternalLink,
  RefreshCw 
} from 'lucide-react';
import { formatAddress, formatBalance } from '../../../shared/lib/wallet';

interface TokenBalance {
  symbol: string;
  balance: string;
  logo: string;
  priceUsd?: number;
}

function HomePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<string>('');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      // Get active wallet
      const walletData = await chrome.storage.local.get('fun_wallet_active');
      const activeAddress = walletData.fun_wallet_active;
      
      if (activeAddress) {
        setAddress(activeAddress);
        
        // Get balances (simulated for now)
        setBalances([
          { symbol: 'BNB', balance: '0.5', logo: '/tokens/bnb.png', priceUsd: 600 },
          { symbol: 'USDT', balance: '100', logo: '/tokens/usdt.svg', priceUsd: 1 },
          { symbol: 'CAMLY', balance: '1000', logo: '/tokens/camly.png', priceUsd: 0.001 },
        ]);
        
        setTotalUsd(401); // Calculated total
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = () => {
    chrome.tabs.create({ 
      url: `https://bscscan.com/address/${address}` 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="FUN Wallet" className="w-8 h-8" />
          <span className="font-semibold">FUN Wallet</span>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {/* Balance Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-4">
          {/* Address */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-mono">
              {formatAddress(address, 8)}
            </span>
            <button 
              onClick={copyAddress}
              className="p-1 hover:bg-white/10 rounded"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={openExplorer}
              className="p-1 hover:bg-white/10 rounded"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {copied && (
              <span className="text-xs text-primary">Đã copy!</span>
            )}
          </div>
          
          {/* Total Balance */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Tổng số dư</p>
            <p className="text-3xl font-bold">${totalUsd.toFixed(2)}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/send')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              <Send className="w-4 h-4" />
              Gửi
            </button>
            <button 
              onClick={() => navigate('/receive')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted rounded-xl font-medium"
            >
              <QrCode className="w-4 h-4" />
              Nhận
            </button>
          </div>
        </div>
      </div>
      
      {/* Token List */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Tokens</h3>
        <div className="space-y-2">
          {balances.map((token) => (
            <div 
              key={token.symbol}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={token.logo} 
                  alt={token.symbol}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/tokens/default.svg';
                  }}
                />
                <div>
                  <p className="font-medium">{token.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBalance(token.balance)} {token.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  ${((parseFloat(token.balance) || 0) * (token.priceUsd || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
