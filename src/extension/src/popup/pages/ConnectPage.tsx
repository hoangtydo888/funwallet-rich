import { useSearchParams } from 'react-router-dom';
import { Shield, X, Check, Eye, Key, AlertCircle } from 'lucide-react';

function ConnectPage() {
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') || 'Unknown';
  const requestId = searchParams.get('requestId');

  const handleApprove = async () => {
    if (requestId) {
      // Send approval to background with requestId
      await chrome.runtime.sendMessage({
        type: 'APPROVE_CONNECTION',
        payload: { requestId, origin }
      });
    }
    window.close();
  };

  const handleReject = async () => {
    if (requestId) {
      await chrome.runtime.sendMessage({
        type: 'REJECT_CONNECTION',
        payload: { requestId }
      });
    }
    window.close();
  };

  const getHostname = () => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
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
          <p className="text-sm font-mono">{getHostname()}</p>
        </div>
        
        {/* Permissions List */}
        <div className="w-full bg-muted/50 rounded-xl p-3 mb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Trang web này sẽ có quyền:
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-primary" />
            <span>Xem địa chỉ ví của bạn</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-primary" />
            <span>Yêu cầu phê duyệt giao dịch</span>
          </div>
        </div>
        
        {/* Warning */}
        <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg mb-4 w-full">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            Chỉ kết nối với trang web bạn tin tưởng
          </p>
        </div>
        
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
