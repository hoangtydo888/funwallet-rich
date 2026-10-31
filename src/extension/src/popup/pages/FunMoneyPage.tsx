import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import { decryptPrivateKey } from '@shared/lib/encryption';
import { STORAGE_KEYS } from '@shared/storage/types';
import { FUN_MIN_GAS, FUN_MONEY, formatFun, getFunMoneyState, parseFunAmount, runFunMoneyWith, withFunRpc, type FunAction, type FunMoneyState } from '@shared/lib/funMoney';

type Tab = 'send' | 'receive' | 'activate';
const DONE: Record<FunAction, string> = { send: 'Đã gửi', activate: 'Đã kích hoạt', claim: 'Đã nhận về ví' };

/** FUN Money on BSC Testnet inside the extension: balances, send, receive, activate and claim. */
function FunMoneyPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [state, setState] = useState<FunMoneyState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>('send');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<{ action: FunAction; raw: bigint; to?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ text: string; hash: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (addr: string) => {
    setLoadError(false);
    try {
      const s = await getFunMoneyState(addr);
      setState(s);
      if (s.locked > 0n || s.activated > 0n) setTab(t => (t === 'send' && s.balance === 0n ? 'activate' : t));
    } catch { setLoadError(true); }
  }, []);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET).then(data => {
      const addr = data[STORAGE_KEYS.ACTIVE_WALLET];
      if (typeof addr === 'string') { setAddress(addr); void load(addr); }
    });
  }, [load]);

  // Every transaction asks for the wallet password, like the extension's Send page
  const ask = (action: FunAction, raw: bigint | null, recipient?: string) => {
    setError(''); setDone(null);
    if (!raw) { setError('Nhập số FUN hợp lệ'); return; }
    setPendingAction({ action, raw, to: recipient });
  };

  const confirm = async () => {
    if (!pendingAction || !password) return;
    setBusy(true); setError('');
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEYS.ENCRYPTED_KEYS, STORAGE_KEYS.ACTIVE_WALLET]);
      const vault = stored[STORAGE_KEYS.ENCRYPTED_KEYS];
      const active = stored[STORAGE_KEYS.ACTIVE_WALLET];
      if (typeof vault !== 'string' || typeof active !== 'string') throw Error('Không tìm thấy ví');
      const keyData = JSON.parse(vault).wallets?.[active];
      if (!keyData) throw Error('Không tìm thấy khóa ví');
      const key = await decryptPrivateKey(keyData, password).catch(() => { throw Error('Mật khẩu không đúng'); });
      const { action, raw, to: recipient } = pendingAction;
      const hash = await withFunRpc(p => runFunMoneyWith(new ethers.Wallet(key, p), action, raw, recipient));
      setDone({ text: `${DONE[action]} ${formatFun(raw)} FUN`, hash });
      setPendingAction(null); setPassword(''); setAmount(''); setLockAmount(''); setTo('');
      void load(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giao dịch thất bại');
    } finally { setBusy(false); }
  };

  const copy = async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const noGas = state !== null && state.gas < FUN_MIN_GAS;
  const sendRaw = parseFunAmount(amount);
  const lockRaw = parseFunAmount(lockAmount);
  const tabClass = (t: Tab) => `flex-1 py-1.5 rounded-lg text-sm ${tab === t ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground'}`;
  const btn = 'w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50';
  const input = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <img src="/tokens/fun-money.png" alt="" className="w-8 h-8 rounded-full" />
        <h1 className="font-semibold flex-1">FUN Money</h1>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">Testnet</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!state ? (
          <div className="flex justify-center py-8">
            {loadError ? <button onClick={() => load(address)} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm"><RefreshCw className="w-4 h-4" />Tải lại số dư</button> : <Loader2 className="w-6 h-6 animate-spin" />}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {([['Trong ví', state.balance], ['Đã kích hoạt', state.activated], ['Đang khóa', state.locked]] as const).map(([label, v]) => (
                <div key={label} className="rounded-xl bg-muted/60 px-1 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="font-bold text-sm">{formatFun(v)}</p>
                </div>
              ))}
            </div>
            <p className={`rounded-xl p-2.5 text-xs ${noGas ? 'bg-amber-500/10 text-amber-700' : 'bg-muted/40 text-muted-foreground'}`}>
              Phí mạng testnet: {formatFun(state.gas)} tBNB.
              {noGas && <> Cần ít nhất 0.0003 tBNB. Nhận miễn phí tại <a href={FUN_MONEY.faucet} target="_blank" rel="noopener noreferrer" className="underline font-semibold">vòi testnet BNB Chain</a>.</>}
            </p>

            {done && (
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm">
                <p className="font-semibold text-green-600">{done.text} ✅</p>
                <a href={`${FUN_MONEY.explorer}/tx/${done.hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline">Xem trên BscScan Testnet <ExternalLink className="w-3 h-3" /></a>
              </div>
            )}

            {pendingAction ? (
              <div className="rounded-xl border p-3 space-y-3">
                <p className="text-sm">
                  {pendingAction.action === 'send' ? `Gửi ${formatFun(pendingAction.raw)} FUN đến ${pendingAction.to?.slice(0, 8)}…${pendingAction.to?.slice(-6)}`
                    : pendingAction.action === 'activate' ? `Kích hoạt ${formatFun(pendingAction.raw)} FUN` : `Nhận ${formatFun(pendingAction.raw)} FUN về ví`}
                </p>
                <input type="password" autoFocus className={input} placeholder="Mật khẩu ví" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void confirm(); }} />
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-xl border text-sm" disabled={busy} onClick={() => { setPendingAction(null); setPassword(''); }}>Hủy</button>
                  <button className={btn + ' flex-1'} disabled={busy || !password} onClick={() => void confirm()}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Xác nhận</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                  <button className={tabClass('send')} onClick={() => setTab('send')}>Gửi</button>
                  <button className={tabClass('receive')} onClick={() => setTab('receive')}>Nhận</button>
                  <button className={tabClass('activate')} onClick={() => setTab('activate')}>Kích hoạt</button>
                </div>

                {tab === 'send' && (
                  <div className="space-y-2.5">
                    <input className={input} placeholder="Địa chỉ ví người nhận (0x…)" value={to} onChange={e => setTo(e.target.value.trim())} />
                    <div className="flex gap-2">
                      <input className={input} inputMode="decimal" placeholder="Số FUN" value={amount} onChange={e => setAmount(e.target.value)} />
                      <button className="px-3 rounded-xl border text-sm" onClick={() => setAmount(ethers.formatUnits(state.balance, FUN_MONEY.decimals))}>Tối đa</button>
                    </div>
                    {sendRaw !== null && sendRaw > state.balance && <p className="text-xs text-destructive">Vượt số FUN trong ví</p>}
                    <button className={btn} disabled={noGas || !to || sendRaw === null || sendRaw > state.balance} onClick={() => ask('send', sendRaw, to)}>Gửi FUN</button>
                    <p className="text-xs text-muted-foreground">Chỉ gửi được FUN đang nằm trong ví. FUN đang khóa hoặc đã kích hoạt cần nhận về ví trước.</p>
                  </div>
                )}

                {tab === 'receive' && (
                  <div className="space-y-3 text-center">
                    <div className="inline-block bg-white p-3 rounded-2xl">
                      <QRCodeSVG value={address} size={170} level="H" imageSettings={{ src: '/tokens/fun-money.png', width: 40, height: 40, excavate: true }} />
                    </div>
                    <button onClick={copy} className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-muted text-xs font-mono break-all text-left">
                      <span className="flex-1">{address}</span>{copied ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                    </button>
                    <p className="text-xs text-muted-foreground">Người gửi phải chọn mạng <b>BSC Testnet</b>. Cùng một địa chỉ ví dùng cho cả mạng chính và testnet.</p>
                  </div>
                )}

                {tab === 'activate' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border p-3 space-y-2">
                      <p className="text-sm"><b>Bước 1 · Kích hoạt</b> FUN đang khóa ({formatFun(state.locked)})</p>
                      <div className="flex gap-2">
                        <input className={input} inputMode="decimal" placeholder="Số FUN" value={lockAmount} onChange={e => setLockAmount(e.target.value)} disabled={state.locked === 0n} />
                        <button className="px-3 rounded-xl border text-sm" disabled={state.locked === 0n} onClick={() => setLockAmount(ethers.formatUnits(state.locked, FUN_MONEY.decimals))}>Tất cả</button>
                      </div>
                      <button className={btn} disabled={noGas || lockRaw === null || lockRaw > state.locked} onClick={() => ask('activate', lockRaw)}>Kích hoạt</button>
                    </div>
                    <div className="rounded-xl border p-3 space-y-2">
                      <p className="text-sm"><b>Bước 2 · Nhận về ví</b> FUN đã kích hoạt ({formatFun(state.activated)})</p>
                      <button className={btn} disabled={noGas || state.activated === 0n} onClick={() => ask('claim', state.activated)}>Nhận {formatFun(state.activated)} FUN về ví</button>
                    </div>
                  </div>
                )}
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default FunMoneyPage;
