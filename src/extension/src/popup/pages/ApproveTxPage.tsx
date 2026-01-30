import { useSearchParams } from 'react-router-dom';
import { Send, X, Check, AlertTriangle } from 'lucide-react';

function ApproveTxPage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');

  // Parse transaction data from URL
  const txData = {
    to: searchParams.get('to') || '',
    value: searchParams.get('value') || '0',
    origin: searchParams.get('origin') || 'Unknown',
  };

  const handleApprove = async () => {
    // TODO: Sign and send transaction
    window.close();
  };

  const handleReject = () => {
    window.close();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="font-semibold text-center">Phê duyệt giao dịch</h1>
      </div>
      
      <div className="flex-1 p-4">
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-primary" />
            <span className="font-medium">Gửi</span>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Đến</span>
              <span className="font-mono">
                {txData.to.slice(0, 10)}...{txData.to.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số lượng</span>
              <span className="font-medium">{txData.value} BNB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Từ</span>
              <span>{new URL(txData.origin).hostname}</span>
            </div>
          </div>
        </div>
        
        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg mb-4">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            Hãy kiểm tra kỹ thông tin giao dịch trước khi phê duyệt.
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button 
          onClick={handleApprove}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
        >
          <Check className="w-5 h-5" />
          Phê duyệt
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
  );
}

export default ApproveTxPage;
