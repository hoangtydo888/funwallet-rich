import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface UnlockPageProps {
  onUnlock: () => void;
}

function UnlockPage({ onUnlock }: UnlockPageProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UNLOCK_WALLET',
        payload: { password }
      });
      
      if (response?.success) {
        onUnlock();
      } else {
        setError(response?.error || 'Mật khẩu không đúng');
      }
    } catch (err) {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex flex-col items-center py-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">FUN Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Ví đang bị khóa</p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleUnlock} className="flex-1 flex flex-col">
        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full px-4 py-3 pr-12 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        
        <div className="mt-auto">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Đang mở khóa...' : 'Mở khóa'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UnlockPage;
