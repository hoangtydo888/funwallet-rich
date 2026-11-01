import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Copy, DollarSign, ExternalLink, Globe2, History, Home, Loader2, RefreshCw, Settings } from 'lucide-react';
import { formatAddress } from '@shared/lib/wallet';
import { COMMON_TOKENS } from '@shared/constants/tokens';
import { formatFun, getFunMoneyState } from '@shared/lib/funMoney';
import { STORAGE_KEYS } from '@shared/storage/types';
import { useTokenPrices } from '@shared/hooks/useTokenPrices';
import { useBalance } from '@shared/hooks/useBalance';
import { getBtcBalance } from '../../../../lib/bitcoin';
import { deriveBtcAddress, getSavedBtcAddress } from '../../lib/btcAddress';
import { ConnectedSiteBar } from '../components/ConnectedSiteBar';
import RecentActivity from '../components/RecentActivity';

const WEB = 'https://wallet.fun.rich';
const topTokens = COMMON_TOKENS;
const priceSymbols = [...topTokens.map(t => t.symbol), 'BTC'];

interface Row { key: string; symbol: string; name: string; logo: string; amount: number | null; usd: number | null; change: number | null; badge?: string; onClick?: () => void }

const usdText = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
// MetaMask-style amounts: 1.01B CAMLY, 0.00840 BTC
const amountText = (n: number) => n >= 1_000_000
  ? n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })
  : n.toLocaleString('en-US', { maximumFractionDigits: n >= 1 ? 4 : 8 });

function HomePage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'tokens' | 'activity'>('tokens');
  const [showZero, setShowZero] = useState(false);
  const [fun, setFun] = useState<bigint | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcSats, setBtcSats] = useState<bigint | null>(null);
  const [btcPrompt, setBtcPrompt] = useState(false);
  const [btcPassword, setBtcPassword] = useState('');
  const [btcBusy, setBtcBusy] = useState(false);
  const [btcError, setBtcError] = useState('');

  const { prices, priceMap, loading: pricesLoading, refetch: refetchPrices } = useTokenPrices(priceSymbols, { autoRefresh: true, refreshInterval: 30000 });
  const { balances, loading: balancesLoading, refresh: refreshBalances } = useBalance(address, topTokens, priceMap, { autoRefresh: false });
  const loading = pricesLoading || balancesLoading;
  const changeOf = useCallback((symbol: string) => prices.find(p => p.symbol.toUpperCase() === symbol.toUpperCase())?.change24h ?? null, [prices]);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.ACTIVE_WALLET).then(d => {
      const a = d[STORAGE_KEYS.ACTIVE_WALLET];
      if (typeof a === 'string' && a) setAddress(a);
    });
  }, []);

  const loadExtras = useCallback(async (addr: string) => {
    getFunMoneyState(addr).then(s => setFun(s.balance)).catch(() => setFun(null));
    const btc = await getSavedBtcAddress(addr);
    setBtcAddress(btc);
    if (btc) getBtcBalance(btc).then(b => setBtcSats(b.confirmed + b.unconfirmed)).catch(() => setBtcSats(null));
  }, []);

  useEffect(() => {
    if (!address) return;
    void refreshBalances();
    void loadExtras(address);
    const onVisible = () => { if (document.visibilityState === 'visible') { void refreshBalances(); void loadExtras(address); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [address, refreshBalances, loadExtras]);

  const refresh = async () => { await Promise.all([refetchPrices(), refreshBalances(), address ? loadExtras(address) : null]); };

  const showBitcoin = async () => {
    setBtcBusy(true); setBtcError('');
    try {
      const btc = await deriveBtcAddress(btcPassword);
      setBtcAddress(btc); setBtcPrompt(false); setBtcPassword('');
      getBtcBalance(btc).then(b => setBtcSats(b.confirmed + b.unconfirmed)).catch(() => setBtcSats(null));
    } catch (e) { setBtcError(e instanceof Error ? e.message : 'Không tạo được địa chỉ Bitcoin'); }
    finally { setBtcBusy(false); }
  };

  const openWeb = (path: string) => chrome.tabs.create({ url: `${WEB}${path}` });
  const copy = async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  // Every asset in one list, biggest value first, like MetaMask
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = balances.map(b => {
      const amount = parseFloat(b.balance) || 0;
      return { key: b.address ?? b.symbol, symbol: b.symbol, name: b.name, logo: b.logo, amount, usd: b.balanceUsd ?? null, change: changeOf(b.symbol) };
    });
    const btcPrice = priceMap.BTC;
    list.push({
      key: 'btc-native', symbol: 'BTC', name: 'Bitcoin', logo: '/tokens/btc.svg', badge: 'Mạng Bitcoin',
      amount: btcSats === null ? null : Number(btcSats) / 1e8, usd: btcSats !== null && btcPrice ? (Number(btcSats) / 1e8) * btcPrice : null,
      change: changeOf('BTC'), onClick: () => (btcAddress ? openWeb('/dashboard') : setBtcPrompt(true)),
    });
    list.push({
      key: 'fun-money', symbol: 'FUN', name: 'FUN MONEY', logo: '/tokens/fun-money.png', badge: 'Testnet',
      amount: fun === null ? null : Number(fun) / 1e18, usd: null, change: null, onClick: () => navigate('/fun-money'),
    });
    return list.sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0) || (b.amount ?? 0) - (a.amount ?? 0));
  }, [balances, priceMap, btcSats, btcAddress, fun, changeOf, navigate]);

  const pinned = (r: Row) => r.key === 'btc-native' || r.key === 'fun-money';
  const visible = rows.filter(r => showZero || pinned(r) || (r.amount ?? 0) > 0);
  const hiddenCount = rows.length - visible.length;
  const total = rows.reduce((s, r) => s + (r.usd ?? 0), 0);
  // 24h change of the whole portfolio, from each holding's own change
  const yesterday = rows.reduce((s, r) => s + (r.usd && r.change !== null ? r.usd / (1 + r.change / 100) : r.usd ?? 0), 0);
  const changeUsd = total - yesterday;
  const changePct = yesterday > 0 ? (changeUsd / yesterday) * 100 : 0;

  const action = (Icon: typeof Home, label: string, onClick: () => void) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/70 hover:bg-muted py-3 text-sm font-medium">
      <Icon className="w-5 h-5" />{label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Account header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <img src="/icons/icon-128.png" alt="" className="w-8 h-8" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">FUN Wallet</p>
          <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground">
            {formatAddress(address, 6)} {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="p-2 hover:bg-muted rounded-lg" aria-label="Làm mới"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
        <button onClick={() => chrome.tabs.create({ url: `https://bscscan.com/address/${address}` })} className="p-2 hover:bg-muted rounded-lg" aria-label="Xem trên BscScan"><ExternalLink className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Total and 24h change */}
        <div className="px-4 pt-2 pb-4">
          <p className="text-3xl font-bold tracking-tight">{usdText(total)}</p>
          {total > 0 && (
            <p className={`text-sm font-medium ${changeUsd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {changeUsd >= 0 ? '+' : '-'}{usdText(Math.abs(changeUsd))} ({changeUsd >= 0 ? '+' : ''}{changePct.toFixed(2)}%) <span className="text-muted-foreground font-normal">24 giờ</span>
            </p>
          )}
        </div>

        {/* Buy · Swap · Send · Receive */}
        <div className="px-4 grid grid-cols-4 gap-2">
          {action(DollarSign, 'Mua', () => openWeb('/trading'))}
          {action(ArrowLeftRight, 'Hoán đổi', () => openWeb('/trading'))}
          {action(ArrowUpRight, 'Gửi', () => navigate('/send'))}
          {action(ArrowDownLeft, 'Nhận', () => navigate('/receive'))}
        </div>
        <button onClick={() => openWeb('/dashboard')} className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border border-border text-muted-foreground hover:text-foreground">
          <ExternalLink className="w-3.5 h-3.5" />Mở FUN Wallet đầy đủ: Giao dịch · Thẻ · Thanh toán QR
        </button>

        {/* Tabs */}
        <div className="mt-3 px-4 flex gap-5 border-b border-border text-sm">
          {([['tokens', 'Token'], ['activity', 'Hoạt động']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`pb-2 -mb-px font-semibold ${tab === k ? 'border-b-2 border-foreground' : 'text-muted-foreground'}`}>{label}</button>
          ))}
          <button onClick={() => openWeb('/dashboard')} className="pb-2 text-muted-foreground font-semibold">NFT ↗</button>
        </div>

        {tab === 'tokens' ? (
          <div className="px-2 py-2">
            {btcPrompt && (
              <div className="mx-2 mb-2 rounded-xl border p-3 space-y-2 text-sm">
                <p>Nhập mật khẩu ví một lần để hiện ví <b>Bitcoin</b> của bạn (cùng ví với trang web).</p>
                <input type="password" autoFocus value={btcPassword} onChange={e => setBtcPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && btcPassword) void showBitcoin(); }}
                  placeholder="Mật khẩu ví" className="w-full px-3 py-2 rounded-xl border border-border bg-background" />
                {btcError && <p className="text-xs text-red-600">{btcError}</p>}
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-xl border" onClick={() => { setBtcPrompt(false); setBtcPassword(''); setBtcError(''); }}>Để sau</button>
                  <button className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-1" disabled={!btcPassword || btcBusy} onClick={() => void showBitcoin()}>
                    {btcBusy && <Loader2 className="w-4 h-4 animate-spin" />}Hiện Bitcoin
                  </button>
                </div>
              </div>
            )}
            {loading && !balances.length ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : visible.map(r => (
              <button key={r.key} onClick={r.onClick} disabled={!r.onClick} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/60 text-left disabled:cursor-default">
                <img src={r.logo} alt="" className="w-10 h-10 rounded-full" onError={e => { e.currentTarget.src = '/tokens/default.svg'; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {r.name}
                    {r.badge && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${r.badge === 'Testnet' ? 'bg-amber-500/15 text-amber-600' : 'bg-orange-500/10 text-orange-600'}`}>{r.badge}</span>}
                  </p>
                  <p className={`text-xs ${r.change === null ? 'text-muted-foreground' : r.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.key === 'btc-native' && !btcAddress ? 'Bấm để hiện ví Bitcoin' : r.change === null ? (r.key === 'fun-money' ? 'Gửi · Nhận · Kích hoạt' : '—') : `${r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}%`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{r.usd !== null ? usdText(r.usd) : '—'}</p>
                  <p className="text-xs text-muted-foreground">{r.amount === null ? '…' : `${amountText(r.amount)} ${r.symbol}`}</p>
                </div>
              </button>
            ))}
            {hiddenCount > 0 || showZero ? (
              <button onClick={() => setShowZero(v => !v)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">
                {showZero ? 'Ẩn token số dư 0' : `Hiện ${hiddenCount} token số dư 0`}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="p-4">
            <RecentActivity account={address} onConfirmed={refreshBalances} />
            <button onClick={() => openWeb('/history')} className="w-full py-2 text-sm rounded-xl border border-border">Xem toàn bộ lịch sử trên FUN Wallet ↗</button>
          </div>
        )}
      </div>

      <div className="pt-2"><ConnectedSiteBar /></div>

      {/* Bottom navigation */}
      <nav className="grid grid-cols-4 border-t border-border text-[11px]">
        {[
          [Home, 'Trang chủ', () => setTab('tokens'), tab === 'tokens'],
          [History, 'Hoạt động', () => setTab('activity'), tab === 'activity'],
          [Globe2, 'Kết nối', () => navigate('/connected-dapps'), false],
          [Settings, 'Cài đặt', () => navigate('/settings'), false],
        ].map(([Icon, label, onClick, active]) => {
          const I = Icon as typeof Home;
          return (
            <button key={label as string} onClick={onClick as () => void} className={`flex flex-col items-center gap-0.5 py-2 ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
              <I className="w-5 h-5" />{label as string}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default HomePage;
