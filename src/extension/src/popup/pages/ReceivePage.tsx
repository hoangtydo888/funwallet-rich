import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatAddress } from '../../../shared/lib/wallet';

function ReceivePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAddress();
  }, []);

  const loadAddress = async () => {
    const walletData = await chrome.storage.local.get('fun_wallet_active');
    if (walletData.fun_wallet_active) {
      setAddress(walletData.fun_wallet_active);
    }
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <h1 className="font-semibold">Nhận Crypto</h1>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* QR Code */}
        <div className="bg-white p-4 rounded-2xl mb-4">
          <QRCodeSVG 
            value={address || 'loading'} 
            size={180}
            level="M"
          />
        </div>
        
        {/* Address */}
        <div className="w-full">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Địa chỉ ví của bạn
          </p>
          <div 
            onClick={copyAddress}
            className="flex items-center justify-center gap-2 p-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80"
          >
            <span className="font-mono text-sm">{formatAddress(address, 12)}</span>
            <Copy className="w-4 h-4" />
          </div>
          {copied && (
            <p className="text-sm text-primary text-center mt-2">Đã copy địa chỉ!</p>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4 px-4">
          Chỉ gửi token BEP-20 trên BNB Smart Chain đến địa chỉ này
        </p>
      </div>
    </div>
  );
}

export default ReceivePage;
