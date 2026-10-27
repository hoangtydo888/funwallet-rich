import {createPopupPairingGate} from '@/lib/popupPairing';
import {dappKeyReadiness} from '@/lib/dappKeyProtection';
import { createSessionSigner } from "@/lib/guardedSigner";
import { useEffect, useRef, useState } from 'react';
import { JsonRpcProvider, Wallet, formatEther, type TransactionRequest } from 'ethers';
import { buildApprovedNamespaces } from '@walletconnect/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletSecurity } from '@/contexts/WalletSecurityContext';
import { decryptPrivateKey, getEncryptedKey } from '@/lib/keyEncryption';
import { getWalletKit, validPairingUri, isProfilePeer, rejected, WC_METHODS, PROFILE_ORIGIN, type Proposal, type Request } from '@/lib/walletconnect';
import { personalSignMessage, unsignedTransfer } from '@/lib/walletconnectPolicy';
import { getChainById } from '@/lib/chains';
import { WalletConnectSecurity } from './WalletConnectSecurity';

type Kit = Awaited<ReturnType<typeof getWalletKit>>;
type Review = { request: Request; text: string; tx?: TransactionRequest; account:string };
const reason = (message:string) => ({code:4001,message});
export const WalletConnectDialog = ({open,onOpenChange,walletAddress,onImportWallet,onChooseWallet,automaticPairing=false}:{open:boolean;onOpenChange:(value:boolean)=>void;walletAddress:string;onImportWallet?:()=>void;onChooseWallet?:()=>void;automaticPairing?:boolean}) => {
  const security = useWalletSecurity();
  const current = useRef({security,walletAddress,onOpenChange});
  current.current = {security,walletAddress,onOpenChange};
  const [kit,setKit] = useState<Kit>();
  const [uri,setUri] = useState('');
  const [proposal,setProposal] = useState<Proposal>();
  const [review,setReview] = useState<Review>();
  const [sessions,setSessions] = useState<ReturnType<Kit['getActiveSessions']>>({});
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const inFlight = useRef(false);
  const pairOnce = useRef(createPopupPairingGate());
  const provider = useRef(new JsonRpcProvider(getChainById(56)!.rpcUrl,56));
  const refresh = (client:Kit) => setSessions({...client.getActiveSessions()});
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    getWalletKit().then(client => {
      if (!alive) return;
      setKit(client); refresh(client);
      const show = () => {
        if (!alive) return;
        const proposals = Object.values(client.getPendingSessionProposals());
        const requests = client.getPendingSessionRequests();
        setProposal(old => proposals[0] ? (old?.id === proposals[0].id ? old : {id:proposals[0].id,params:proposals[0]}) : undefined);
        if (proposals.length || requests.length) current.current.onOpenChange(true);
        refresh(client);
      };
      const incomingProposal = (event: Proposal) => {setProposal(event);show();};
      client.on('session_proposal',incomingProposal); client.on('session_request',show);
      client.on('session_delete',show); client.on('proposal_expire',show);
      client.on('session_request_expire',show);
      const interval = window.setInterval(show,2000);
      cleanup = () => { clearInterval(interval); client.off('session_proposal',incomingProposal);client.off('session_request',show);client.off('session_delete',show);client.off('proposal_expire',show);client.off('session_request_expire',show); };
      show();
      const pending = sessionStorage.getItem('fun_wallet_pending_wc');
      if (pending && validPairingUri(pending)) { setUri(pending); current.current.onOpenChange(true); }
    }).catch(() => { if (alive) setError('Chưa kết nối được máy chủ WalletConnect. Vui lòng thử lại.'); });
    return () => { alive = false; cleanup(); };
  },[]);
  const run = async (action:()=>Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');
    try { await action(); } catch(e) {setError(e instanceof Error ? e.message : 'Không thể xử lý yêu cầu');}
    finally {inFlight.current=false;setBusy(false);}
  };
  // Pairing only receives a proposal. It never grants an account, signs or sends.
  useEffect(() => {
    if (!automaticPairing || !kit || !validPairingUri(uri)) return;
    void run(async () => {
      const paired = await pairOnce.current(uri, value => kit.pair({uri:value}));
      if (!paired) return;
      sessionStorage.removeItem('fun_wallet_pending_wc');
      setUri('');
    });
  }, [automaticPairing, kit, uri]);
  const checkUnlocked = () => {
    const ready=dappKeyReadiness(current.current.walletAddress,current.current.security.checkSession()&&Boolean(current.current.security.getUnlockedKey(current.current.walletAddress)));
    if(!ready.canPair)throw Error(ready.message);
  };
  const approveSession = () => run(async()=>{
    if (!kit || !proposal) return;
    checkUnlocked();
    if (!isProfilePeer(proposal.params.proposer.metadata.url) || proposal.verifyContext?.verified?.validation === 'INVALID') throw Error('Chỉ nhận kết nối từ FUN Profile chính thức.');
    const address=current.current.walletAddress.toLowerCase();
    const namespaces=buildApprovedNamespaces({proposal:proposal.params,supportedNamespaces:{eip155:{chains:['eip155:56'],methods:WC_METHODS,events:['accountsChanged','chainChanged'],accounts:[`eip155:56:${address}`]}}});
    await kit.approveSession({id:proposal.id,namespaces});setProposal(undefined);refresh(kit);
  });
  const rejectProposal = () => run(async()=>{if(kit&&proposal){await kit.rejectSession({id:proposal.id,reason:rejected});setProposal(undefined);}});
  const prepare = () => run(async()=>{
    if (!kit) return;
    const request=kit.getPendingSessionRequests()[0];
    if (!request) throw Error('Không còn yêu cầu chờ duyệt.');
    const session=kit.getActiveSessions()[request.topic];
    const account=current.current.walletAddress.toLowerCase();
    try {
      checkUnlocked();
      if (!session || session.expiry*1000<=Date.now() || !isProfilePeer(session.peer.metadata.url)) throw Error('Phiên không hợp lệ');
      if (request.params.chainId!=='eip155:56' || !session.namespaces.eip155?.accounts.includes(`eip155:56:${account}`) || !session.namespaces.eip155?.methods.includes(request.params.request.method)) throw Error('Sai tài khoản hoặc mạng');
      const {method,params}=request.params.request;
      if (method==='personal_sign') {
        const consent=personalSignMessage(params,account);
        setReview({request,account,text:consent.review});
      } else if(method==='eth_sendTransaction') {
        if(params.length!==1) throw Error('Giao dịch không hợp lệ');
        const decoded=unsignedTransfer(params[0],account);
        const code=await provider.current.getCode(decoded.to);
        if(decoded.data==='0x' && code!=='0x') throw Error('Chưa hỗ trợ chuyển BNB kèm thực thi hợp đồng');
        if(decoded.data!=='0x' && code==='0x') throw Error('Không tìm thấy hợp đồng token');
        const gasEstimate=await provider.current.estimateGas({from:account,to:decoded.to,data:decoded.data,value:decoded.value});
        const gasLimit=gasEstimate*120n/100n;
        const fees=await provider.current.getFeeData();
        if(!fees.gasPrice) throw Error('Chưa lấy được phí mạng');
        const tx={to:decoded.to,data:decoded.data,value:decoded.value,gasLimit,gasPrice:fees.gasPrice,chainId:56};
        setReview({request,account,tx,text:`Gửi ${decoded.amount} ${decoded.symbol}\nNgười nhận: ${decoded.recipient}\nHợp đồng/đích: ${decoded.to}\nMạng: BNB Smart Chain (56)\nPhí mạng tối đa: ${formatEther(gasLimit*fees.gasPrice)} BNB`});
      } else if(method==='wallet_switchEthereumChain' && params?.[0]?.chainId==='0x38') {
        setReview({request,account,text:'Cho phép FUN Profile sử dụng BNB Smart Chain (56). Không gửi tiền.'});
      } else throw Error('Phương thức chưa được hỗ trợ');
    } catch(e) {
      await kit.respondSessionRequest({topic:request.topic,response:{id:request.id,jsonrpc:'2.0',error:reason(e instanceof Error?e.message:'Yêu cầu không hợp lệ')}});throw e;
    }
  });
  const respond = (approve:boolean) => run(async()=>{
    if(!kit||!review) return;
    const {request,account}=review;
    if(!approve) {await kit.respondSessionRequest({topic:request.topic,response:{id:request.id,jsonrpc:'2.0',error:reason('Người dùng từ chối')}});setReview(undefined);return;}
    if(!navigator.locks) throw Error('Trình duyệt chưa hỗ trợ khóa chống gửi trùng.');
    await navigator.locks.request(`fun-wallet-sign-${account}`,{ifAvailable:true},async lock=>{
      if(!lock) throw Error('Một cửa sổ khác đang xử lý ví.');
      checkUnlocked();
      if(current.current.walletAddress.toLowerCase()!==account) throw Error('Ví đang chọn đã thay đổi');
      const pending=kit.getPendingSessionRequests().some(item=>item.id===request.id&&item.topic===request.topic);
      const session=kit.getActiveSessions()[request.topic];
      if(!pending||!session||session.expiry*1000<=Date.now()) {setReview(undefined);throw Error('Yêu cầu đã hết hạn');}
      const password=current.current.security.getCachedPassword();
      const encrypted=getEncryptedKey(account);
      if(!password||!encrypted) throw Error('Hãy mở khóa ví trước');
      const signer=createSessionSigner(await decryptPrivateKey(encrypted,password),provider.current);
      if(signer.address.toLowerCase()!==account) throw Error('Khóa không khớp với ví');
      checkUnlocked();
      const requestKey = `fun_wallet_wc_handled:${request.topic}:${request.id}`;
      const handled = localStorage.getItem(requestKey);
      if (handled) throw Error('Yêu cầu này đã xử lý hoặc đang chờ kết quả mạng. Không gửi lại; hãy kiểm tra lịch sử ví.');
      let result: string|null = null;
      if(review.tx) {
        const fingerprint=JSON.stringify({account,to:review.tx.to,data:review.tx.data,value:String(review.tx.value)});
        const previous=localStorage.getItem('fun_wallet_last_dapp_send');
        if(previous){const parsed=JSON.parse(previous);if(parsed.key===fingerprint&&Date.now()-parsed.at<30000)throw Error('Vui lòng chờ 30 giây trước khi gửi lại cùng giao dịch.');}
        // Record before broadcasting; a network timeout must never trigger an automatic retry.
        localStorage.setItem('fun_wallet_last_dapp_send',JSON.stringify({key:fingerprint,at:Date.now()}));
        localStorage.setItem(requestKey,'broadcast-started');
        const tx=await signer.sendTransaction(review.tx);result=tx.hash;
        localStorage.setItem(requestKey,result);
        setError(`Đã phát giao dịch: ${result}. Không gửi lại nếu phản hồi mạng bị gián đoạn.`);
      } else if(request.params.request.method==='personal_sign') result=await signer.signMessage(personalSignMessage(request.params.request.params,account).bytes);
      localStorage.setItem(requestKey,result??'confirmed');
      setReview(undefined);
      await kit.respondSessionRequest({topic:request.topic,response:{id:request.id,jsonrpc:'2.0',result}});
    });
  });
  const readiness=dappKeyReadiness(walletAddress,security.isUnlocked&&Boolean(security.getUnlockedKey(walletAddress)));
  const pendingCount=kit?.getPendingSessionRequests().length??0;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Kết nối FUN Profile</DialogTitle><DialogDescription>Giữ trang FUN Wallet mở để nhận yêu cầu. Mỗi lần ký và gửi tiền đều cần Cha duyệt.</DialogDescription></DialogHeader>
    <p className="break-all text-sm">Ví: {walletAddress.toLowerCase()} · BSC</p>
    <WalletConnectSecurity address={walletAddress.toLowerCase()} onImportWallet={onImportWallet} onChooseWallet={onChooseWallet} autoUnlock={automaticPairing} />
    {error&&<p role="alert" className="text-destructive break-words">{error}</p>}
    {proposal ? <div className="space-y-3"><p>Ứng dụng xin kết nối: {proposal.params.proposer.metadata.name}</p><p className="break-all">{proposal.params.proposer.metadata.url}</p><p>Trạng thái xác minh nguồn: {proposal.verifyContext?.verified?.validation??'UNKNOWN'}</p><p>Chia sẻ địa chỉ ví trên BSC. Ký đăng nhập và chuyển tiền chỉ thực hiện sau khi duyệt từng yêu cầu.</p><Button disabled={busy||!readiness.canPair} onClick={approveSession}>Kết nối</Button><Button variant="outline" disabled={busy} onClick={rejectProposal}>Từ chối</Button></div> : review ? <div className="space-y-3"><pre className="whitespace-pre-wrap break-all text-sm">{review.text}</pre><Button disabled={busy||!readiness.canPair} onClick={()=>respond(true)}>{review.tx?'Xác nhận gửi tiền':'Đồng ý ký / xác nhận'}</Button><Button variant="outline" disabled={busy} onClick={()=>respond(false)}>Từ chối</Button></div> : <div className="space-y-3">{automaticPairing ? <p role="status">{busy?'Đang nhận yêu cầu kết nối từ FUN Profile…':error?'Chưa nhận được đề nghị. Hãy tạo kết nối mới từ FUN Profile.':'Đang chờ đề nghị kết nối. Không cần dán mã thủ công.'}</p> : <><Input aria-label="WalletConnect URI" placeholder="Dán wc:… từ FUN Profile" value={uri} onChange={e=>setUri(e.target.value)} /><Button disabled={busy||!kit||!readiness.canPair} onClick={()=>run(async()=>{checkUnlocked();if(!validPairingUri(uri.trim()))throw Error('WalletConnect URI không hợp lệ');await kit!.pair({uri:uri.trim()});sessionStorage.removeItem('fun_wallet_pending_wc');setUri('');})}>Kết nối WalletConnect</Button></>}{pendingCount>0&&<Button disabled={busy} onClick={prepare}>Kiểm tra yêu cầu chờ duyệt ({pendingCount})</Button>}</div>}
    <div className="space-y-2">{Object.keys(sessions).length > 0 && <div className="space-y-2"><p className="text-sm">Kết nối xong. Mở FUN Profile ở tab mới và giữ tab ví này mở để duyệt yêu cầu ký.</p><Button asChild><a href={`${PROFILE_ORIGIN}/auth`} target="_blank" rel="noopener noreferrer">Mở FUN Profile ở tab mới</a></Button></div>}<p className="font-medium">Kết nối hiện có</p>{Object.values(sessions).map(session=><div key={session.topic} className="rounded border p-3 text-sm"><p>{session.peer.metadata.name}</p><p className="break-all">{session.peer.metadata.url}</p><Button variant="outline" disabled={busy} onClick={()=>run(async()=>{await kit!.disconnectSession({topic:session.topic,reason:rejected});refresh(kit!);setReview(undefined);})}>Ngắt kết nối</Button></div>)}</div>
  </DialogContent></Dialog>;
};
