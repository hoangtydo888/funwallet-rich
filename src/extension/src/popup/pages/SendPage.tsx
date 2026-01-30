import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function SendPage() {
  const navigate = useNavigate();

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
        <h1 className="font-semibold">Gửi Crypto</h1>
      </div>
      
      <div className="flex-1 p-4">
        <p className="text-muted-foreground text-center mt-8">
          Tính năng gửi crypto sẽ được triển khai trong phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}

export default SendPage;
