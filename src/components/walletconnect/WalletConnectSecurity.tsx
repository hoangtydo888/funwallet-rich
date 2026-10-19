import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SetupPasswordDialog } from '@/components/wallet/SetupPasswordDialog';
import { UnlockWalletDialog } from '@/components/wallet/UnlockWalletDialog';
import { useSecureWallet } from '@/hooks/useSecureWallet';
import { getEncryptedKey } from '@/lib/keyEncryption';
import { hasLocalDappKey, protectDappKey } from '@/lib/dappKeyProtection';
export function WalletConnectSecurity({address}:{address:string}) {
  const security=useSecureWallet();
  const [setup,setSetup]=useState(false);
  const [unlock,setUnlock]=useState(false);
  const [error,setError]=useState('');
  const [,refresh]=useState(0);
  const protectedKey=Boolean(getEncryptedKey(address));
  const local=hasLocalDappKey(address);
  const protect=async(password:string)=>{
    if(security.isPasswordSet&&!security.isUnlocked)throw Error('Hãy mở khóa ví trước');
    await protectDappKey(address,password);
    if(!await security.unlock(password))throw Error('Không mở khóa được bản mã hóa');
    setSetup(false);refresh(n=>n+1);
  };
  return <section className="rounded border p-3 space-y-2 text-sm">
    <p>{!local?'Ví chỉ xem: chưa có khóa ký trên thiết bị này.':protectedKey&&security.isUnlocked?'Ví đã mở khóa cho yêu cầu DApp.':protectedKey?'Ví đang khóa. Hãy mở khóa trước khi duyệt.':'Cần bảo vệ khóa ví trước khi duyệt DApp.'}</p>
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
