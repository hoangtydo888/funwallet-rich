import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Check, CheckCircle2, Globe2, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { ethers } from 'ethers';
import { getChainById } from '@shared/constants/chains';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { ApprovalRequest, TransactionReview, RpcTransaction, displayAmount, REQUEST_TTL } from '../../lib/approval';
import UnlockPage from './UnlockPage';

async function call<T>(type: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (!response?.success) throw new Error(response?.error || 'Không thể liên lạc với ví');
  return response.data as T;
}
function messageText(request: ApprovalRequest) {
  const content = request.params[0] as string;
  try {
    return request.method === 'personal_sign' ? ethers.toUtf8String(content) : JSON.stringify(JSON.parse(content), null, 2);
  } catch { return content; }
}

export default function RequestPage({ onUnlock }: { onUnlock?: () => void }) {
  const [params] = useSearchParams();
  const requestId = params.get('requestId') || '';
  const navigate = useNavigate();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<TransactionReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [hash, setHash] = useState('');
  const [now, setNow] = useState(Date.now());
  const actionInFlight = useRef(false);
  const reviewSequence = useRef(0);
  const invalidateReview = useCallback(() => { reviewSequence.current++; }, []);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setReview(null); setPassword(''); setDone(null); setRequest(null);
    Promise.all([call<ApprovalRequest>('GET_PENDING_REQUEST', { requestId }), call<{ unlocked: boolean }>('IS_UNLOCKED')])
      .then(([next, state]) => { if (live) { setRequest(next); setUnlocked(state.unlocked); } })
      .catch(e => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => { live = false; clearInterval(interval); };
  }, [requestId]);

  const refreshReview = useCallback(async () => {
    const sequence = ++reviewSequence.current;
    setReviewing(true); setReview(null); setError('');
    try {
      const next = await call<TransactionReview>('REVIEW_TRANSACTION', { requestId });
      if (sequence === reviewSequence.current) setReview(next);
    } catch (e) { if (sequence === reviewSequence.current) setError(e instanceof Error ? e.message : 'Không lấy được phí'); }
    finally { if (sequence === reviewSequence.current) setReviewing(false); }
  }, [requestId]);
  useEffect(() => {
    if (request?.method === 'eth_sendTransaction' && unlocked) void refreshReview();
    return invalidateReview;
  }, [request?.id, request?.method, unlocked, refreshReview, invalidateReview]);

  const close = () => {
    if (new URLSearchParams(window.location.search).get('surface') === 'approval') window.close();
    else navigate('/');
  };
  const isTransaction = request?.method === 'eth_sendTransaction';
  const isSign = request?.method === 'personal_sign' || request?.method === 'eth_signTypedData_v4';
  const isSwitch = request?.method === 'wallet_switchEthereumChain' || request?.method === 'wallet_addEthereumChain';
  const isConnect = !!request && !isTransaction && !isSign && !isSwitch;
  const expired = !!request && now >= request.timestamp + REQUEST_TTL;
  const quoteExpired = !!review && now >= review.expiresAt;
  const chain = request ? getChainById(request.chainId) : undefined;
  const targetChain = isSwitch ? getChainById((request!.params[0] as { chainId: number }).chainId) : undefined;
  const token = request?.chainId === 56 && review?.contract ? COMMON_TOKENS.find(t => t.address?.toLowerCase() === review.contract!.toLowerCase()) : undefined;
  const canApprove = request && !expired && !working && unlocked && (!isSign || password) && (!isTransaction || (review && !quoteExpired && !reviewing && password));

  const act = async (approve: boolean) => {
    if (actionInFlight.current || !request || (approve && !canApprove)) return;
    actionInFlight.current = true; setWorking(true); setError('');
    const suffix = isTransaction ? 'TRANSACTION' : isSign ? 'SIGN' : 'CONNECTION';
    try {
      const result = await call<unknown>(`${approve ? 'APPROVE' : 'REJECT'}_${suffix}`, { requestId, ...(approve ? { password, reviewId: review?.id } : {}) });
      setPassword(''); setDone(approve ? 'approved' : 'rejected');
      if (approve && isTransaction && typeof result === 'string') setHash(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xử lý yêu cầu'); }
    finally { setWorking(false); actionInFlight.current = false; }
  };

  // Connection results need no follow-up, so return to the wallet like MetaMask.
  useEffect(() => {
    if (!done || hash) return;
    const timer = setTimeout(close, 1200);
    return () => clearTimeout(timer);
  // close only reads the URL and router; re-arming every clock tick would never fire.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, hash]);

  if (!loading && request && !unlocked && !done) return <UnlockPage site={new URL(request.origin).host} onUnlock={result => {
    setUnlocked(true); onUnlock?.();
    if (result?.autoApproved?.includes(request.id)) setDone('approved');
  }} />;

  return <div className="approval-shell">
    <header className="approval-header">
      <img src="/icons/icon-48.png" alt="" width="30" height="30" />
      <strong className="text-base">FUN Wallet</strong>
      <span className="ml-auto flex items-center gap-1 text-xs text-emerald-700"><ShieldCheck size={14} /> Bạn kiểm soát</span>
    </header>
    <main className="approval-content" aria-busy={loading || reviewing || working}>
      {loading ? <p role="status">Đang đọc yêu cầu…</p> : done ? <>
        <CheckCircle2 size={40} className="text-emerald-700 mb-4" />
        <h1 className="text-2xl font-semibold">{done === 'rejected' ? 'Đã hủy yêu cầu' : hash ? 'Đã gửi lên mạng' : isConnect ? 'Đã kết nối' : 'Đã phê duyệt'}</h1>
        <p className="approval-label mt-3">{hash ? 'Giao dịch đang chờ xác nhận on-chain.' : 'Ứng dụng đã được thông báo kết quả.'}</p>
        {hash && <a className="approval-address underline mt-5" target="_blank" rel="noreferrer" href={`${chain?.explorer}/tx/${hash}`}>{hash} ↗</a>}
      </> : request && isConnect ? <>
        <div className="flex flex-col items-center text-center">
          {request.siteIcon ? <img src={request.siteIcon} alt="" width="56" height="56" className="rounded-full border border-slate-200 bg-white" referrerPolicy="no-referrer" />
            : <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center"><Globe2 size={26} className="text-slate-500" /></span>}
          <h1 className="text-2xl font-semibold mt-3 break-all">{new URL(request.origin).host}</h1>
          <p className="approval-label mt-1">Kết nối trang web này với FUN Wallet</p>
        </div>
        <span className="approval-label block mt-6">Tài khoản</span>
        <section className="approval-card !mt-2 flex items-center gap-3">
          <span aria-hidden className="w-10 h-10 rounded-full shrink-0" style={{ background: `conic-gradient(from ${parseInt(request.account.slice(2, 6), 16) % 360}deg, #116149, #f4b23e, #e4572e, #116149)` }} />
          <span className="min-w-0"><strong className="block text-sm">FUN Wallet</strong><span className="approval-address !mt-0">{request.account.slice(0, 8)}…{request.account.slice(-6)}</span></span>
        </section>
        <span className="approval-label block mt-6">Quyền</span>
        <ul className="mt-2 space-y-3 text-sm">
          <li className="flex gap-3"><Check size={18} className="text-emerald-700 shrink-0" />Xem địa chỉ, số dư và hoạt động</li>
          <li className="flex gap-3"><Check size={18} className="text-emerald-700 shrink-0" />Gửi yêu cầu giao dịch và chữ ký</li>
          <li className="flex gap-3"><X size={18} className="text-red-600 shrink-0" />Không thể chuyển tiền nếu không có sự cho phép của bạn</li>
        </ul>
        {request.method === 'wallet_requestPermissions' && <p className="approval-label mt-4">Ứng dụng yêu cầu chọn lại tài khoản kết nối.</p>}
        {expired && <p className="approval-warning" role="status">Yêu cầu đã hết hạn. Hãy tạo lại từ ứng dụng.</p>}
      </> : request ? <>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-5"><Globe2 size={16} /><span className="break-all">{request.origin}</span></div>
        <p className="approval-label">{isTransaction ? (review?.kind === 'approve' ? 'Cấp quyền chi tiêu' : review?.kind === 'contract' ? 'Tương tác hợp đồng' : 'Yêu cầu gửi') : isSign ? 'Yêu cầu chữ ký' : isSwitch ? 'Chuyển mạng' : 'Kết nối ứng dụng'}</p>
        <div className="flex items-start gap-3 mt-2">
          <h1 className="text-3xl font-semibold leading-tight break-words min-w-0 flex-1">
            {isTransaction ? (review ? `${review.unlimited ? 'Không giới hạn' : displayAmount(review.amount)} ${review.symbol}` : 'Kiểm tra giao dịch') : isSign ? 'Kiểm tra nội dung ký' : isSwitch ? targetChain?.name : 'Kết nối FUN Wallet'}
          </h1>
          {isTransaction && <img src={token?.logo || chain?.logo || '/tokens/default.svg'} alt="" className="w-11 h-11 rounded-full" />}
        </div>
        <section className="approval-card">
          <span className="approval-label">{isTransaction ? 'Từ tài khoản' : 'Tài khoản kết nối'}</span>
          <span className="approval-address">{request.account}</span>
          {isTransaction && <div className="border-t border-slate-200 mt-4 pt-4">
            <span className="approval-label">{review?.kind === 'approve' ? 'Bên được cấp quyền' : review?.kind === 'contract' ? 'Hợp đồng tương tác' : 'Đến'}</span>
            <span className="approval-address">{review?.recipient || (request.params[0] as RpcTransaction).to}</span>
          </div>}
        </section>
        {isTransaction && review && <section className="approval-card">
          <span className="approval-label">{review.kind === 'approve' ? 'Hạn mức yêu cầu' : 'Giá trị theo yêu cầu'}</span>
          <div className="approval-row font-semibold"><span>{review.kind === 'approve' ? 'Cho phép chi tiêu' : 'Bạn gửi'}</span><span className="text-red-700">{review.unlimited ? 'Không giới hạn' : displayAmount(review.amount)} {review.symbol}</span></div>
          {review.contract && <><span className="approval-label">Hợp đồng token</span><span className="approval-address">{review.contract}</span>
            {review.nativeAmount !== '0.0' && review.nativeAmount !== '0' && <div className="approval-row"><span>Gửi kèm</span><span>{displayAmount(review.nativeAmount)} {chain?.symbol}</span></div>}
          </>}
          <p className="approval-label mt-3">Đây là dữ liệu yêu cầu, chưa phải mô phỏng thay đổi số dư. Token có thể thu phí khi chuyển.</p>
        </section>}
        {isSign && <>
          <section className="approval-card"><span className="approval-label">{request.method}</span><pre className="text-xs whitespace-pre-wrap break-all mt-3 max-h-64 overflow-y-auto">{messageText(request)}</pre></section>
          <div className="approval-warning">Chữ ký có thể cấp quyền sử dụng tài sản. Đọc đầy đủ nội dung và chỉ ký yêu cầu bạn hiểu.</div>
        </>}
        <section className="approval-card">
          <div className="approval-row"><span className="approval-label">Mạng</span><span>{chain?.name}</span></div>
          {isSwitch && <div className="approval-row"><span className="approval-label">Chuyển sang</span><strong>{targetChain?.name}</strong></div>}
          <div className="approval-row"><span className="approval-label">Yêu cầu từ</span><span>{new URL(request.origin).host}</span></div>
          {isTransaction && <>
            <div className="approval-row"><span className="approval-label">Phí mạng tối đa ước tính</span><span>{review ? `${displayAmount(review.fee)} ${chain?.symbol}` : 'Chưa xác định'}</span></div>
            <button type="button" disabled={reviewing || working || expired} onClick={refreshReview} className="text-xs text-emerald-700 flex items-center gap-1 underline"><RefreshCw size={12} />{reviewing ? 'Đang ước tính…' : 'Cập nhật phí'}</button>
          </>}
        </section>
        {isTransaction && <details className="mt-4 text-xs"><summary className="cursor-pointer text-slate-500">Xem dữ liệu giao dịch gốc</summary><pre className="mt-2 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{JSON.stringify(request.params[0], null, 2)}</pre></details>}
        {(review?.kind === 'contract' || review?.unlimited) && <div className="approval-warning">{review.unlimited ? 'Ứng dụng yêu cầu hạn mức không giới hạn. Quyền này có thể tiếp tục tồn tại sau khi ngắt kết nối ví.' : 'Chưa giải mã được tác động của hợp đồng. Kiểm tra dữ liệu trước khi xác nhận.'}</div>}
        {(isTransaction || isSign) && <div className="mt-5">
          <label htmlFor="approval-password" className="approval-label">Mật khẩu xác nhận</label>
          <input id="approval-password" type="password" autoComplete="current-password" value={password} disabled={working} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-emerald-600" placeholder="Nhập mật khẩu ví" />
        </div>}
        {(expired || quoteExpired) && <p className="approval-warning" role="status">{expired ? 'Yêu cầu đã hết hạn. Hãy tạo lại từ ứng dụng.' : 'Ước tính phí đã hết hạn. Cập nhật phí để tiếp tục.'}</p>}
      </> : null}
      {error && <p role="alert" className="approval-warning text-red-800">{error}</p>}
    </main>
    <footer className="approval-footer">
      {done || (!loading && !request) ? <button className="approval-button primary col-span-2" onClick={close}>Đóng</button> : <>
        <button className="approval-button" disabled={working || loading} onClick={() => expired ? close() : act(false)}>Hủy</button>
        <button className="approval-button primary" disabled={!canApprove} onClick={() => act(true)}>{working ? 'Đang xử lý…' : isTransaction ? 'Xác nhận' : isSign ? 'Ký thông điệp' : isSwitch ? 'Chuyển mạng' : 'Kết nối'}{!working && <ArrowUpRight size={14} className="inline ml-1" />}</button>
      </>}
    </footer>
  </div>;
}
