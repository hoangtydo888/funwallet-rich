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
import { formatAddress, formatBalance, getNativeBalance, getTokenBalance } from '../../../shared/lib/wallet';
import { COMMON_TOKENS } from '../../../shared/constants/tokens';
import { STORAGE_KEYS } from '../../../shared/storage/types';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  logo: string;
  priceUsd?: number;
  address: string | null;
}

// Cached prices (in real app, fetch from API)
const TOKEN_PRICES: Record<string, number> = {
  BNB: 600,
  USDT: 1,
  USDC: 1,
  BTCB: 42000,
  ETH: 2500,
  CAMLY: 0.001,
  CAKE: 2.5,
};

function HomePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<string>('');
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Get active wallet
      const walletData = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET);
      const activeAddress = walletData[STORAGE_KEYS.ACTIVE_WALLET];
      
      if (activeAddress) {
        setAddress(activeAddress);
        
        // Load real balances from blockchain
        const tokenBalances: TokenBalance[] = [];
        let total = 0;

        // Load top 5 tokens
        const topTokens = COMMON_TOKENS.slice(0, 5);

        for (const token of topTokens) {
          let balance = '0';
          try {
            if (token.address === null) {
              balance = await getNativeBalance(activeAddress);
            } else {
              balance = await getTokenBalance(token.address, activeAddress);
            }
          } catch (err) {
            console.error(`Error loading ${token.symbol} balance:`, err);
          }

          const priceUsd = TOKEN_PRICES[token.symbol] || 0;
          const valueUsd = parseFloat(balance) * priceUsd;
          total += valueUsd;

          tokenBalances.push({
            symbol: token.symbol,
            name: token.name,
            balance,
            logo: token.logo,
            priceUsd,
            address: token.address,
          });
        }

        // Sort by USD value
        tokenBalances.sort((a, b) => {
          const aValue = parseFloat(a.balance) * (a.priceUsd || 0);
          const bValue = parseFloat(b.balance) * (b.priceUsd || 0);
          return bValue - aValue;
        });

        setBalances(tokenBalances);
        setTotalUsd(total);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const getAssetUrl = (path: string) => {
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return path;
    }
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
          <img 
            src={getAssetUrl('/logo.png')} 
            alt="FUN Wallet" 
            className="w-8 h-8"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="font-semibold">FUN Wallet</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => loadWalletData(true)}
            disabled={refreshing}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
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
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium btn-hover-scale"
            >
              <Send className="w-4 h-4" />
              Gửi
            </button>
            <button 
              onClick={() => navigate('/receive')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted rounded-xl font-medium btn-hover-scale"
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
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl token-card-hover"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={getAssetUrl(token.logo)} 
                  alt={token.symbol}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getAssetUrl('/tokens/default.svg');
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

          {balances.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Không tìm thấy token
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
