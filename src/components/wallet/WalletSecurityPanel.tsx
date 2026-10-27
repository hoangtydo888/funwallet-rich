import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { SetupPasswordDialog } from './SetupPasswordDialog';
import { UnlockWalletDialog } from './UnlockWalletDialog';
import { useSecureWallet } from '@/hooks/useSecureWallet';
import { exportEncryptedVault,restoreEncryptedVault } from '@/lib/vaultBackup';

export function WalletSecurityPanel() {
  const security=useSecureWallet();
  const [unlock,setUnlock]=useState(false),[protect,setProtect]=useState(false),[backup,setBackup]=useState(false),[rotate,setRotate]=useState(false),[restore,setRestore]=useState(false);
  const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const clear=()=>{setOldPassword('');setNewPassword('');setConfirm('');setFile(null);setError('');};
  const legacy=security.hasOldStorageData();
  const protectKeys=async(password:string)=>{
    if(!await security.setupPassword(password))throw Error('Chưa bảo vệ được khóa cũ; dữ liệu gốc được giữ nguyên');
    setProtect(false);setNotice('Khóa cũ đã được chuyển sang kho mã hóa. Hãy sao lưu tệp.');
  };
  const exportBackup=async(password:string)=>{
    if(!await security.unlock(password))throw Error('Mật khẩu không đúng hoặc đang tạm khóa');
    const url=URL.createObjectURL(new Blob([exportEncryptedVault()],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`fun-wallet-encrypted-${Date.now()}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setBackup(false);setNotice('Đã tải bản sao lưu mã hóa. Giữ tệp và mật khẩu ở nơi an toàn, tách biệt.');
  };
  const submit=async()=>{
    setBusy(true);setError('');
    try {
      if(newPassword!==confirm)throw Error('Mật khẩu xác nhận chưa khớp');
      if(rotate) {
        if(!await security.changePassword(oldPassword,newPassword))throw Error('Không đổi được mật khẩu; bản gốc không bị ghi đè nếu bước chuẩn bị lỗi');
        setRotate(false);setNotice('Đã đổi mật khẩu toàn bộ kho khóa.');
      } else {
        if(!file||file.size>2_000_000)throw Error('Chọn bản sao lưu JSON dưới 2 MB');
        const count=await restoreEncryptedVault(await file.text(),oldPassword,newPassword);
        if(!await security.unlock(newPassword))throw Error('Đã lưu bản mã; vui lòng mở khóa bằng mật khẩu mới');
        setRestore(false);setNotice(`Đã khôi phục ${count} khóa trên thiết bị. Nếu chưa có địa chỉ trong danh sách tài khoản, hãy thêm lại địa chỉ dưới dạng ví chỉ xem.`);
      }
      clear();
    } catch(failure) { setError(failure instanceof Error?failure.message:'Không hoàn tất được thao tác'); }
    finally {setBusy(false);}
  };
  return <section className="mb-5 rounded-xl border bg-card p-4 space-y-3 text-card-foreground" aria-label="Bảo vệ khóa ví">
    <div><h2 className="font-semibold">Bảo vệ khóa ví</h2><p className="text-sm text-muted-foreground">{security.isUnlocked?'Ví đã mở khóa trên thiết bị này.':security.isPasswordSet?'Ví đang khóa. Mở khóa trước khi ký hoặc gửi.':'Địa chỉ không có khóa trên thiết bị chỉ có thể xem số dư.'}</p></div>
    {legacy&&<p className="text-sm text-destructive">Thiết bị còn dữ liệu khóa cũ. Chọn bảo vệ khóa cũ trước khi tiếp tục sử dụng.</p>}
    {notice&&<p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      {security.isPasswordSet&&(security.isUnlocked?<Button size="sm" variant="outline" onClick={security.lock}>Khóa ví ngay</Button>:<Button size="sm" onClick={()=>setUnlock(true)}>Mở khóa ví</Button>)}
      {legacy&&!security.isPasswordSet&&<Button size="sm" onClick={()=>setProtect(true)}>Bảo vệ khóa cũ</Button>}
      {security.isPasswordSet&&<Button size="sm" variant="outline" onClick={()=>{clear();setRotate(true);}}>Đổi mật khẩu{legacy?' và bảo vệ khóa cũ':''}</Button>}
      {security.isPasswordSet&&<Button size="sm" variant="outline" onClick={()=>setBackup(true)}>Sao lưu tệp mã hóa</Button>}
      <Button size="sm" variant="outline" onClick={()=>{clear();setRestore(true);}}>Khôi phục tệp mã hóa</Button>
    </div>
    <UnlockWalletDialog open={unlock} onOpenChange={setUnlock} onUnlock={security.unlock} failedAttempts={security.failedAttempts} isLocked={security.isLocked} lockoutEndTime={security.lockoutEndTime}/>
    <SetupPasswordDialog open={protect} onOpenChange={setProtect} onPasswordSet={protectKeys}/>
    <SetupPasswordDialog open={backup} onOpenChange={setBackup} mode="enter" title="Xác nhận sao lưu kho khóa" onPasswordSet={exportBackup} description="Nhập mật khẩu ví hiện tại. Tệp tải về chỉ chứa khóa đã mã hóa, không phải bản sao lưu trên máy chủ."/>
    <Dialog open={rotate||restore} onOpenChange={open=>{if(!open&&!busy){setRotate(false);setRestore(false);clear();}}}>
      <DialogContent><DialogHeader><DialogTitle>{rotate?'Đổi mật khẩu kho khóa':'Khôi phục bản sao lưu mã hóa'}</DialogTitle><DialogDescription>{rotate?'Mọi khóa được kiểm tra và mã hóa lại trước khi lưu toàn bộ một lần.':'Chỉ xử lý tệp trên thiết bị. Mật khẩu đích phải là mật khẩu ví hiện tại nếu đã có kho khóa.'}</DialogDescription></DialogHeader>
        {restore&&<div className="space-y-2"><Label htmlFor="vault-file">Tệp sao lưu JSON</Label><Input id="vault-file" type="file" accept=".json,application/json" onChange={e=>setFile(e.target.files?.[0]??null)}/></div>}
        <div className="space-y-2"><Label htmlFor="vault-old">{rotate?'Mật khẩu hiện tại':'Mật khẩu của bản sao lưu'}</Label><Input id="vault-old" type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></div>
        <div className="space-y-2"><Label htmlFor="vault-new">{rotate?'Mật khẩu mới':'Mật khẩu kho khóa đích'} (ít nhất 12 ký tự)</Label><Input id="vault-new" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></div>
        <div className="space-y-2"><Label htmlFor="vault-confirm">Nhập lại mật khẩu đích</Label><Input id="vault-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={busy} onClick={submit}>{busy?'Đang kiểm tra và mã hóa…':'Xác nhận'}</Button>
      </DialogContent>
    </Dialog>
  </section>;
}
