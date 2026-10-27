import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { validPairingUri } from '@/lib/walletconnect';
import { getSecureStorage } from '@/lib/keyEncryption';
import { WalletConnectDialog } from '@/components/walletconnect/WalletConnectDialog';
import { Button } from '@/components/ui/button';

// Public route: local signing keys stay on wallet.fun.rich, never on the dApp.
export default function ConnectWallet() {
  const navigate = useNavigate();
  const {user, loading: authLoading} = useAuth();
  const [incoming] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const uri = fragment.get('wc_uri') ?? query.get('wc_uri') ?? '';
    const waiting = fragment.get('waiting') === '1';
    return { uri, valid: validPairingUri(uri) || validPairingUri(sessionStorage.getItem('fun_wallet_pending_wc') ?? ''), waiting };
  });
  const [accounts, setAccounts] = useState(() => {
    try { return Object.keys(getSecureStorage().wallets).filter(address => /^0x[a-f0-9]{40}$/.test(address)); }
    catch { return []; }
  });
  const [address, setAddress] = useState(accounts[0] ?? '');
  const [defaultReady, setDefaultReady] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    setDefaultReady(false);
    // A paused backend must not leave the connection window spinning forever.
    const timeout = window.setTimeout(() => {if(alive){alive=false;setDefaultReady(true);}}, 5000);
    if (!user) {setDefaultReady(true);clearTimeout(timeout);return;}
    void supabase.from('wallets').select('address').eq('user_id',user.id).eq('is_primary',true).maybeSingle().then(({data})=>{
      if(!alive)return;
      // Do not swap accounts after a proposal was already shown following timeout.
      clearTimeout(timeout);
      if(data && /^0x[a-f0-9]{40}$/i.test(data.address)) {
        const primary=data.address.toLowerCase();
        setAccounts(previous=>[primary,...previous.filter(account=>account!==primary)]);
        setAddress(primary);
      }
      setDefaultReady(true);
    });
    return ()=>{alive=false;clearTimeout(timeout);};
  }, [user?.id, authLoading]);
  useEffect(() => {
    window.history.replaceState(null, '', '/connect');
    if (validPairingUri(incoming.uri)) sessionStorage.setItem('fun_wallet_pending_wc', incoming.uri);
  }, [incoming.uri]);
  const [open, setOpen] = useState(true);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!incoming.waiting) return;
    const timer = window.setTimeout(() => setExpired(true), 30000);
    return () => clearTimeout(timer);
  }, [incoming.waiting]);
  return <main className="mx-auto min-h-screen max-w-lg bg-background p-6 text-foreground space-y-6">
    <h1 className="text-2xl font-bold">FUN Wallet</h1>
    <p>Kết nối với FUN Profile</p>
    <p className="text-sm">Ví được chọn sẵn. Kiểm tra website và bấm Kết nối một lần để dùng với FUN Profile. Nếu ví đang khóa, mở khóa bằng mật khẩu ví trước.</p>
    {incoming.waiting ? <p role="status">{expired ? 'Chưa nhận được yêu cầu. Quay lại FUN Profile để kiểm tra kết nối hoặc bấm Mở FUN Wallet trong hướng dẫn.' : 'Đang chuẩn bị yêu cầu từ FUN Profile…'}</p> : !incoming.valid ? <p role="alert">Liên kết hết hạn hoặc không hợp lệ. Hãy tạo kết nối mới từ FUN Profile.</p> : !defaultReady ? <p role="status">Đang chọn ví mặc định…</p> : accounts.length === 0 ? <section className="space-y-3"><p>Thiết bị này chưa có ví được mã hóa để ký. Đăng nhập rồi khôi phục bản sao lưu của chính Cha trong mục Bảo vệ khóa ví.</p><Button onClick={() => navigate('/auth')}>Mở tài khoản FUN Wallet</Button></section> : <section className="space-y-4"><label htmlFor="connection-account">Tài khoản chia sẻ với FUN Profile</label><select id="connection-account" className="w-full rounded border bg-background p-3 text-foreground" value={address} onChange={event => setAddress(event.target.value)}>{accounts.map(account => <option key={account} value={account}>{account}</option>)}</select><p className="text-sm">Kết nối chỉ chia sẻ địa chỉ. Mỗi lần ký hoặc gửi tiền đều cần duyệt riêng.</p>{!open && <Button onClick={() => setOpen(true)}>Xem yêu cầu kết nối</Button>}</section>}
    {incoming.valid && !incoming.waiting && defaultReady && address && <WalletConnectDialog key={address} open={open} onOpenChange={setOpen} walletAddress={address} automaticPairing onChooseWallet={() => setOpen(false)} onImportWallet={() => navigate('/dashboard')} />}
  </main>;
}
