import { useEffect,useState,useRef } from 'react';
import { formatEther } from 'ethers';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { pendingTransactions,rememberTransaction,type PendingWalletTransaction } from '@/lib/transactionQueue';
import { prepareReplacement,validateReplacement,refreshPending,type ReplacementPlan } from '@/lib/pendingActions';
import { createSessionSigner } from '@/lib/guardedSigner';
import { getProviderForChain,type Chain } from '@/lib/chains';
import { useWalletSecurity } from '@/contexts/WalletSecurityContext';
export function PendingTransactionsPanel({account,chain}:{account:string;chain:Chain}) {
  const security=useWalletSecurity();
  const context=useRef({account,chainId:chain.chainId}),generation=useRef(0);context.current={account,chainId:chain.chainId};
  useEffect(()=>()=>{generation.current++;},[]);
  const [rows,setRows]=useState<PendingWalletTransaction[]>([]),[plan,setPlan]=useState<ReplacementPlan|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const reload=()=>{try{setRows(pendingTransactions().filter(row=>row.account.toLowerCase()===account.toLowerCase()&&row.chainId===chain.chainId).reverse().slice(0,12));}catch{setError('Chưa đọc được lịch sử giao dịch cục bộ');}};
  useEffect(()=>{reload();const listener=()=>reload();window.addEventListener('fun-wallet-transactions',listener);window.addEventListener('storage',listener);return()=>{window.removeEventListener('fun-wallet-transactions',listener);window.removeEventListener('storage',listener);};},[account,chain.chainId]);
  useEffect(()=>{generation.current++;setPlan(null);setError('');},[account,chain.chainId,security.isUnlocked]);
  const refresh=async()=>{setBusy(true);setError('');try{const provider=getProviderForChain(chain);for(const row of rows)rememberTransaction(await refreshPending(provider,row));reload();}catch{setError('Chưa xác minh được trạng thái từ RPC. Không gửi lại tiền.');}finally{setBusy(false);}};
  const prepare=async(hash:string,kind:'speedup'|'cancel')=>{const id=generation.current;setBusy(true);setError('');try{const next=await prepareReplacement(getProviderForChain(chain),hash,account,chain.chainId,kind);if(id===generation.current)setPlan(next);}catch(failure){setError(failure instanceof Error?failure.message:'Không chuẩn bị được giao dịch');}finally{setBusy(false);}};
  const submit=async()=>{if(!plan)return;const id=generation.current;setBusy(true);setError('');try{
    const provider=getProviderForChain(chain);await validateReplacement(provider,plan,account);
    const key=security.getUnlockedKey(account);if(!key)throw Error('Mở khóa ví trước khi ký giao dịch thay thế');
    await createSessionSigner(key,provider,chain.chainId,()=>{if(id!==generation.current||context.current.account.toLowerCase()!==account.toLowerCase()||context.current.chainId!==chain.chainId)throw Error('Ví hoặc mạng đã thay đổi trước khi ký');}).sendTransaction(plan.request);
    setPlan(null);reload();
  }catch(failure){setError(failure instanceof Error?failure.message:'Chưa gửi được yêu cầu thay thế');}finally{setBusy(false);}};
  if(!rows.length&&!error)return null;
  const labels={broadcasting:'Đang gửi',pending:'Đang chờ',unknown:'Chưa rõ trạng thái',confirmed:'Đã xác nhận',failed:'Bị hoàn tác',replaced:'Nonce đã được dùng'};
  return <section className="mb-5 rounded-xl border bg-card p-4 text-card-foreground space-y-3" aria-label="Giao dịch trên thiết bị">
    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Giao dịch trên thiết bị</h2><Button size="sm" variant="outline" disabled={busy} onClick={refresh}>Kiểm tra trạng thái</Button></div>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {rows.map(row=><div key={row.hash} className="rounded border p-3 space-y-2 text-sm"><p className="break-all font-mono">{row.hash}</p><p>{labels[row.status]} · Nonce {row.nonce}</p>
      <a className="text-primary underline" target="_blank" rel="noopener noreferrer" href={`${chain.explorer}/tx/${row.hash}`}>Xem trên trình khám phá</a>
      {row.status==='pending'&&<div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>prepare(row.hash,'speedup')}>Tăng phí</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>prepare(row.hash,'cancel')}>Yêu cầu hủy</Button></div>}
    </div>)}
    <Dialog open={!!plan} onOpenChange={open=>{if(!open&&!busy)setPlan(null);}}><DialogContent><DialogHeader><DialogTitle>{plan?.kind==='cancel'?'Xác nhận yêu cầu hủy':'Xác nhận tăng phí'}</DialogTitle><DialogDescription>Gửi giao dịch thay thế cùng nonce. Vẫn mất phí mạng và không bảo đảm thay thế nếu giao dịch gốc được xử lý trước.</DialogDescription></DialogHeader>
      {plan&&<div className="space-y-2 text-sm"><p>Nonce: {plan.request.nonce}</p><p className="break-all">Mã gốc: {plan.originalHash}</p><p>Phí mạng tối đa: {formatEther(plan.maximumFee)} {chain.symbol}</p><p>{plan.kind==='cancel'?'Gửi 0 về chính địa chỉ ví; không gửi lại số tiền gốc.':'Giữ nguyên người nhận, dữ liệu và số tiền gốc.'}</p><Button disabled={busy||!security.isUnlocked} onClick={submit}>{busy?'Đang ký…':'Xác nhận ký giao dịch thay thế'}</Button>{!security.isUnlocked&&<p>Mở khóa ví trong mục bảo vệ trước khi ký.</p>}</div>}
    </DialogContent></Dialog>
  </section>;
}
