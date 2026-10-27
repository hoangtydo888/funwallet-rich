import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { popupRpc } from '../popupRpc';
import { Eye, EyeOff } from 'lucide-react';

interface UnlockPageProps {
  onUnlock: (result?:{autoApproved?:string[]}) => void;
  origin?:string;
  onCancel?:()=>void;
}

function UnlockPage({ onUnlock,origin,onCancel }: UnlockPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get redirect path if coming from transaction/sign request
  const redirectPath = searchParams.get('redirect');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result=await popupRpc<{autoApproved?:string[]}>('UNLOCK_WALLET',{password});
      setPassword('');onUnlock(result);
      if(redirectPath&&/^(request|connect|approve-tx|approve-sign)\?/.test(redirectPath))navigate(`/${redirectPath}`,{replace:true});
    } catch (err) {
      setError(err instanceof Error?err.message:'Có lỗi xảy ra, vui lòng thử lại');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6">
      {/* Logo Header - giống MetaMask */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <img
          src="/icons/icon-128.png"
          alt="FUN Wallet"
          className="w-24 h-24 mb-4"
        />
        <h1 className="text-xl font-bold">Chào mừng trở lại!</h1>
        {(redirectPath||origin) && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Mở khóa ví để tiếp tục yêu cầu của {origin||"ứng dụng"}
          </p>
        )}
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
              aria-label="Mật khẩu FUN Wallet"
              autoComplete="current-password"
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

        <div className="mt-auto pt-6 space-y-3">
          <button
            type="submit"
            disabled={loading||!password}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Đang mở khóa...' : 'Mở khóa'}
          </button>
          {onCancel&&<button type="button" className="approval-button w-full" disabled={loading} onClick={onCancel}>Hủy kết nối</button>}
        </div>
      </form>
    </div>
  );
}

export default UnlockPage;
