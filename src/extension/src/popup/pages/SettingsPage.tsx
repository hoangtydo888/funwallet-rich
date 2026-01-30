import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ExternalLink, Trash2 } from 'lucide-react';

function SettingsPage() {
  const navigate = useNavigate();

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
        
        {/* Connected Sites */}
        <button 
          className="w-full flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-muted/80"
        >
          <Trash2 className="w-5 h-5 text-muted-foreground" />
          <span>Quản lý kết nối DApp</span>
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
