import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { validPairingUri } from '@/lib/walletconnect';
export default function ConnectWallet() {
  const {user,loading}=useAuth();
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const uri=params.get('wc_uri')??'';
  useEffect(()=>{
    if(!validPairingUri(uri)||loading)return;
    sessionStorage.setItem('fun_wallet_pending_wc',uri);
    // Remove pairing secret from the URL and history; never send it to analytics.
    navigate(user?'/dashboard':'/auth',{replace:true});
  },[uri,user,loading,navigate]);
  return <main className="p-6"><h1>Kết nối FUN Wallet</h1><p>{validPairingUri(uri)?'Đang mở ví để Cha kiểm tra yêu cầu kết nối…':'Liên kết không hợp lệ. Hãy tạo kết nối mới từ FUN Profile.'}</p></main>;
}
