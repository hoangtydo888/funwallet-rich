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
import { formatAddress } from '@shared/lib/wallet';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { STORAGE_KEYS } from '@shared/storage/types';
import { useTokenPrices } from '@shared/hooks/useTokenPrices';
import { useBalance } from '@shared/hooks/useBalance';
import { formatPrice } from '@shared/lib/priceTracker';
import { TokenList } from '../../components/TokenList';

function HomePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Get all tokens (không giới hạn 5)
  const topTokens = COMMON_TOKENS;
  const tokenSymbols = topTokens.map(t => t.symbol);

  // Fetch prices using shared hook
  const { priceMap, loading: pricesLoading, refetch: refetchPrices } = useTokenPrices(
    tokenSymbols,
    { autoRefresh: true, refreshInterval: 30000 }
  );

  // Fetch balances using shared hook
  const { balances, totalUsd, loading: balancesLoading, refresh: refreshBalances } = useBalance(
    address,
    topTokens,
    priceMap,
    { autoRefresh: false }
  );

  const loading = pricesLoading || balancesLoading;

  useEffect(() => {
    loadWalletAddress();
  }, []);

  // Auto-refresh balances khi popup được mở/focus hoặc sau khi connect
  useEffect(() => {
    if (address) {
      // Trigger refresh ngay khi có address
      refreshBalances();
    }
    
    // Refresh khi popup được focus lại
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && address) {
        refreshBalances();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [address, refreshBalances]);

  const loadWalletAddress = async () => {
    try {
      const walletData = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET);
      const activeAddress = walletData[STORAGE_KEYS.ACTIVE_WALLET];
      if (activeAddress) {
        setAddress(activeAddress);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchPrices(), refreshBalances()]);
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

  // Convert balances to TokenList format
  const tokenListData = balances.map(b => ({
    symbol: b.symbol,
    name: b.name,
    balance: b.balance,
    logo: b.logo,
    balanceUsd: b.balanceUsd,
    address: b.address,
  }));

  if (loading && !address) {
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
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
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
            <p className="text-3xl font-bold">{formatPrice(totalUsd)}</p>
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
        <TokenList 
          tokens={tokenListData} 
          loading={loading}
        />
      </div>
    </div>
  );
}

export default HomePage;
