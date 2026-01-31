import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2Off, Globe, Trash2 } from 'lucide-react';
import { DAppConnection } from '@shared/types';

function ConnectedDAppsPage() {
  const navigate = useNavigate();
  const [dapps, setDapps] = useState<DAppConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnectedDApps();
  }, []);

  const loadConnectedDApps = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTED_DAPPS' });
      if (response?.success) {
        setDapps(response.data || []);
      }
    } catch (error) {
      console.error('[ConnectedDApps] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (origin: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'DISCONNECT_DAPP',
        payload: { origin }
      });
      // Remove from local state
      setDapps(prev => prev.filter(d => d.origin !== origin));
    } catch (error) {
      console.error('[ConnectedDApps] Disconnect error:', error);
    }
  };

  const handleDisconnectAll = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'DISCONNECT_ALL_DAPPS' });
      setDapps([]);
    } catch (error) {
      console.error('[ConnectedDApps] Disconnect all error:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return `${weeks} tuần trước`;
  };

  const getDAppIcon = (name: string) => {
    const icons: Record<string, string> = {
      'pancakeswap': '🥞',
      'uniswap': '🦄',
      'opensea': '⛵',
      'raydium': '☀️',
      'aave': '👻',
      'compound': '🔮',
    };
    
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(icons)) {
      if (lower.includes(key)) return emoji;
    }
    return '🌐';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">DApps đã kết nối</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : dapps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Chưa có DApp nào</h3>
            <p className="text-sm text-muted-foreground">
              Kết nối với DApp để xem ở đây
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dapps.map((dapp) => (
              <div 
                key={dapp.origin}
                className="flex items-center gap-3 p-3 bg-muted rounded-xl"
              >
                <div className="text-2xl">
                  {getDAppIcon(dapp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{dapp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(dapp.connectedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(dapp.origin)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                  title="Ngắt kết nối"
                >
                  <Link2Off className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Disconnect All Button */}
      {dapps.length > 0 && (
        <div className="p-4 border-t border-border">
          <button
            onClick={handleDisconnectAll}
            className="w-full flex items-center justify-center gap-2 py-3 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/20"
          >
            <Trash2 className="w-5 h-5" />
            Ngắt kết nối tất cả
          </button>
        </div>
      )}
    </div>
  );
}

export default ConnectedDAppsPage;
