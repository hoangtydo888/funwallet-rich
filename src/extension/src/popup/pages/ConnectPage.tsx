import { useSearchParams } from 'react-router-dom';
import { Shield, X, Check } from 'lucide-react';

function ConnectPage() {
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') || 'Unknown';
  const requestId = searchParams.get('requestId');

  const handleApprove = async () => {
    if (requestId) {
      await chrome.runtime.sendMessage({
        type: 'CONNECT_DAPP',
        payload: { requestId, origin }
      });
    }
    window.close();
  };

  const handleReject = () => {
    window.close();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold text-center">Yêu cầu kết nối</h1>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-lg font-medium mb-2">Kết nối với DApp</h2>
        
        <div className="bg-muted px-4 py-2 rounded-lg mb-4">
          <p className="text-sm font-mono">{new URL(origin).hostname}</p>
        </div>
        
        <p className="text-sm text-muted-foreground text-center mb-6">
          Trang web này muốn kết nối với ví của bạn để xem địa chỉ ví.
        </p>
        
        <div className="w-full space-y-2">
          <button 
            onClick={handleApprove}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            <Check className="w-5 h-5" />
            Cho phép
          </button>
          <button 
            onClick={handleReject}
            className="w-full flex items-center justify-center gap-2 py-3 bg-muted rounded-xl font-medium"
          >
            <X className="w-5 h-5" />
            Từ chối
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConnectPage;
