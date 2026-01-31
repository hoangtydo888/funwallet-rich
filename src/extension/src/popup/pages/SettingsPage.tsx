import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ExternalLink, Link2, ChevronRight, Shield } from 'lucide-react';
import { DAppConnection } from '@shared/types';

function SettingsPage() {
  const navigate = useNavigate();
  const [dappsCount, setDappsCount] = useState(0);

  useEffect(() => {
    loadDAppsCount();
  }, []);

  const loadDAppsCount = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTED_DAPPS' });
      if (response?.success) {
        setDappsCount((response.data as DAppConnection[])?.length || 0);
      }
    } catch {
      // Ignore errors
    }
  };

  const handleLock = async () => {
    await chrome.runtime.sendMessage({ type: 'LOCK_WALLET' });
    navigate('/unlock');
  };

  const openPWA = () => {
    chrome.tabs.create({ 
      url: 'https://wallet-fun-rich.lovable.app' 
    });
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
        <h1 className="font-semibold">Cài đặt</h1>
      </div>
      
      <div className="flex-1 p-4 space-y-2">
        {/* Backup Seed Phrase */}
        <button 
          onClick={() => navigate('/backup-seed')}
          className="w-full flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-muted/80"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span>Sao lưu Seed Phrase</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Connected DApps */}
        <button 
          onClick={() => navigate('/connected-dapps')}
          className="w-full flex items-center justify-between p-3 bg-muted rounded-xl hover:bg-muted/80"
        >
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <span className="block">DApps đã kết nối</span>
              {dappsCount > 0 && (
                <span className="text-xs text-muted-foreground">{dappsCount} DApp</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        
        {/* Lock Wallet */}
        <button 
          onClick={handleLock}
          className="w-full flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-muted/80"
        >
          <Lock className="w-5 h-5 text-muted-foreground" />
          <span>Khóa ví</span>
        </button>
        
        {/* Open PWA */}
        <button 
          onClick={openPWA}
          className="w-full flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-muted/80"
        >
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
          <span>Mở FUN Wallet PWA</span>
        </button>
      </div>
      
      {/* Version */}
      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          FUN Wallet Extension v1.0.0
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
