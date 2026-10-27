import {useEffect,useRef,useState} from 'react';
import {formatEther,type Provider} from 'ethers';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {getProviderForChain,type Chain} from '@/lib/chains';
import {readTokenApproval,displayAllowance,prepareRevocation,submitRevocation,type ApprovalSnapshot,type RevocationPlan} from '@/lib/tokenApprovals';
import {createSessionSigner} from '@/lib/guardedSigner';
import {useWalletSecurity} from '@/contexts/WalletSecurityContext';
export function TokenApprovalsPanel({account,chain,providerFactory=getProviderForChain}:{account:string;chain:Chain;providerFactory?:(chain:Chain)=>Provider}){
 const security=useWalletSecurity();
 const [token,setToken]=useState(''),[spender,setSpender]=useState(''),[snapshot,setSnapshot]=useState<ApprovalSnapshot|null>(null),[plan,setPlan]=useState<RevocationPlan|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hash,setHash]=useState('');
 const generation=useRef(0),context=useRef({account,chainId:chain.chainId,token,spender});context.current={account,chainId:chain.chainId,token,spender};
 useEffect(()=>()=>{generation.current++;},[]);
 const reset=()=>{generation.current++;setSnapshot(null);setPlan(null);setError('');setHash('');};
 useEffect(()=>{reset();setBusy(false);},[account,chain.chainId]);
 useEffect(()=>{if(!security.isUnlocked)setPlan(null);},[security.isUnlocked]);
 const query=async()=>{const id=++generation.current;setBusy(true);setError('');setHash('');setPlan(null);setSnapshot(null);try{const result=await readTokenApproval(providerFactory(chain),account,chain.chainId,token.trim(),spender.trim());if(id===generation.current)setSnapshot(result);}catch(e){if(id===generation.current)setError(e instanceof Error?e.message:'Chưa đọc được quyền token');}finally{if(id===generation.current)setBusy(false);}};
 const prepare=async()=>{if(!snapshot)return;const id=++generation.current;setBusy(true);setError('');try{const result=await prepareRevocation(providerFactory(chain),snapshot);if(id===generation.current)setPlan(result);}catch(e){if(id===generation.current)setError(e instanceof Error?e.message:'Chưa chuẩn bị được giao dịch');}finally{if(id===generation.current)setBusy(false);}};
 const submit=async()=>{if(!plan)return;const id=++generation.current;setBusy(true);setError('');try{
  const current=context.current;
  if(current.account.toLowerCase()!==plan.snapshot.account||current.chainId!==plan.snapshot.chainId||current.token.trim().toLowerCase()!==plan.snapshot.token||current.spender.trim().toLowerCase()!==plan.snapshot.spender)throw Error('Ví, mạng hoặc địa chỉ đã thay đổi');
  const key=security.getUnlockedKey(account);if(!key)throw Error('Mở khóa ví trước khi thu hồi quyền');
  const assertContext=()=>{const live=context.current;if(id!==generation.current||live.account.toLowerCase()!==plan.snapshot.account||live.chainId!==plan.snapshot.chainId||live.token.trim().toLowerCase()!==plan.snapshot.token||live.spender.trim().toLowerCase()!==plan.snapshot.spender)throw Error('Ví hoặc mạng đã thay đổi trong khi chuẩn bị ký');};
  const provider=providerFactory(chain);const result=await submitRevocation(provider,createSessionSigner(key,provider,chain.chainId,assertContext),plan,Date.now(),assertContext);
  if(id===generation.current){setHash(result);setSnapshot(null);setPlan(null);}
 }catch(e){if(id===generation.current)setError(e instanceof Error?e.message:'Chưa gửi được giao dịch');}finally{if(id===generation.current)setBusy(false);}};
 return <section className="mb-5 rounded-xl border bg-card p-4 text-card-foreground space-y-3" aria-label="Quyền sử dụng token">
  <h2 className="font-semibold">Quyền sử dụng token</h2>
  <p className="text-sm text-muted-foreground">Kiểm tra và thu hồi quyền chi tiêu ERC20 trên {chain.name}. Nhập địa chỉ hợp đồng token và địa chỉ đã được cấp quyền. Màn này kiểm tra từng cặp địa chỉ, chưa quét toàn bộ quyền của ví.</p>
  <p className="text-xs break-all">Ví: {account}</p>
  <label className="block space-y-1 text-sm"><span>Hợp đồng token</span><Input aria-label="Hợp đồng token" value={token} disabled={busy} autoComplete="off" placeholder="0x…" onChange={e=>{reset();setToken(e.target.value);}}/></label>
  <label className="block space-y-1 text-sm"><span>Địa chỉ được cấp quyền (spender)</span><Input aria-label="Địa chỉ được cấp quyền" value={spender} disabled={busy} autoComplete="off" placeholder="0x…" onChange={e=>{reset();setSpender(e.target.value);}}/></label>
  <Button variant="outline" disabled={busy||!token.trim()||!spender.trim()} onClick={query}>{busy?'Đang kiểm tra…':'Kiểm tra quyền'}</Button>
  {snapshot&&<div className="rounded border p-3 space-y-2 text-sm"><p className="break-all">Hạn mức hiện tại: {displayAllowance(snapshot)} {snapshot.symbol}</p><p>Hạn mức sau thu hồi: 0</p><Button variant="outline" disabled={busy||snapshot.allowance==='0'} onClick={prepare}>Chuẩn bị thu hồi</Button></div>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {hash&&<div className="text-sm space-y-1"><p>Đã gửi yêu cầu thu hồi, chờ xác nhận mạng. Kiểm tra lại quyền sau khi giao dịch được xử lý.</p><a className="text-primary underline break-all" href={`${chain.explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer">{hash}</a></div>}
  <Dialog open={!!plan} onOpenChange={open=>{if(!open&&!busy)setPlan(null);}}><DialogContent><DialogHeader><DialogTitle>Thu hồi quyền chi tiêu token</DialogTitle><DialogDescription>Gửi approve(spender, 0) đến hợp đồng token. Giao dịch mất phí mạng; không chuyển token. Ngắt kết nối DApp không tự thu hồi quyền on-chain.</DialogDescription></DialogHeader>
   {plan&&<div className="space-y-2 text-sm"><p>Mạng: {chain.name} ({chain.chainId})</p><p className="break-all">Token: {plan.snapshot.token}</p><p className="break-all">Spender: {plan.snapshot.spender}</p><p>Hạn mức: {displayAllowance(plan.snapshot)} {plan.snapshot.symbol} → 0</p><p>Phí mạng tối đa: {formatEther(plan.maximumFee)} {chain.symbol}</p><Button disabled={busy||!security.isUnlocked} onClick={submit}>{busy?'Đang gửi…':'Xác nhận ký thu hồi quyền'}</Button>{!security.isUnlocked&&<p>Mở khóa ví trong mục bảo vệ để ký.</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}</div>}
  </DialogContent></Dialog>
 </section>;
}
