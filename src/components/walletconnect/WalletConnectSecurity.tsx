import {useWalletSecurity} from '@/contexts/WalletSecurityContext';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SetupPasswordDialog } from '@/components/wallet/SetupPasswordDialog';
import { UnlockWalletDialog } from '@/components/wallet/UnlockWalletDialog';
import { useSecureWallet } from '@/hooks/useSecureWallet';
import { dappKeyReadiness, protectDappKey } from '@/lib/dappKeyProtection';
export function WalletConnectSecurity({address,onImportWallet,onChooseWallet,autoUnlock=false}:{address:string;onImportWallet?:()=>void;onChooseWallet?:()=>void;autoUnlock?:boolean}) {
  const security=useSecureWallet();
  const session=useWalletSecurity();
  const [setup,setSetup]=useState(false);
  const [unlock,setUnlock]=useState(false);
  const [error,setError]=useState('');
  const [,refresh]=useState(0);
  const readiness=dappKeyReadiness(address,Boolean(session.getUnlockedKey(address)));
  const prompted=useRef(false);
  useEffect(()=>{
    if(autoUnlock && readiness.state==='locked' && !prompted.current){prompted.current=true;setUnlock(true);}
  },[autoUnlock,readiness.state]);
  const protectedKey=['locked','ready'].includes(readiness.state);
  const local=['legacy','locked','ready'].includes(readiness.state);
  const protect=async(password:string)=>{
    if(security.isPasswordSet&&!security.isUnlocked)throw Error('Hãy mở khóa ví trước');
    await protectDappKey(address,password);
    if(!await security.unlock(password))throw Error('Không mở khóa được bản mã hóa');
    setSetup(false);refresh(n=>n+1);
  };
  return <section className="rounded border p-3 space-y-2 text-sm">
    <p role="status">{readiness.message}</p>
    {readiness.state==='missing'&&<><p>Đăng nhập tài khoản chỉ tải danh sách địa chỉ. Khóa của ví web được lưu riêng theo trình duyệt và tên miền; bản xem trước Lovable và tiện ích Chrome có kho khóa riêng.</p><div className="flex flex-wrap gap-2">{onImportWallet&&<Button variant="outline" onClick={onImportWallet}>Thêm / import ví có khóa</Button>}{onChooseWallet&&<Button variant="outline" onClick={onChooseWallet}>Chọn tài khoản khác</Button>}</div><p>Để khôi phục tệp JSON mã hóa: đóng cửa sổ này → Bảo vệ khóa ví → Khôi phục tệp mã hóa. Tự thao tác với bản sao lưu của Cha; không gửi mật khẩu, seed hoặc khóa vào chat.</p></>}

    {error&&<p role="alert" className="text-destructive">{error}</p>}
    {local&&!security.isUnlocked&&security.isPasswordSet&&<Button variant="outline" onClick={()=>setUnlock(true)}>Mở khóa ví để kết nối</Button>}
    {local&&!protectedKey&&(!security.isPasswordSet||security.isUnlocked)&&<Button variant="outline" onClick={()=>{
      setError('');const password=security.getCachedPassword();
      if(password)void protect(password).catch(()=>setError('Không bảo vệ được khóa ví. Hãy kiểm tra khóa và mật khẩu trong ví.'));
      else setSetup(true);
    }}>{security.isPasswordSet?'Bảo vệ ví đang chọn':'Thiết lập mật khẩu ví'}</Button>}
    <SetupPasswordDialog open={setup} onOpenChange={setSetup} onPasswordSet={protect} description="Tự đặt mật khẩu ví ít nhất 12 ký tự để bảo vệ khóa ký trên thiết bị. Đây là mật khẩu ví, khác mật khẩu đăng nhập tài khoản. Giữ bản sao lưu ví của Cha; không gửi mật khẩu hoặc khóa vào chat." />
    <UnlockWalletDialog open={unlock} onOpenChange={setUnlock} onUnlock={security.unlock} failedAttempts={security.failedAttempts} isLocked={security.isLocked} lockoutEndTime={security.lockoutEndTime}/>
  </section>;
}
