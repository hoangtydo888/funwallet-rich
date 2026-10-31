import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUp, BarChart3, ChevronUp, ChevronDown, Clock, Hexagon, Info, Plus, Repeat, ShieldCheck, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { fetchTokenPrices, formatUsdValue, type TokenPrice } from "@/lib/priceTracker";
import { formatBalance } from "@/lib/wallet";
import BottomNav from "@/components/layout/BottomNav";

// Preferred spending order and which coins may be spent; a per-device preference
const PREFS_KEY = "fun_card_prefs_v1";
interface CardPrefs { order: string[]; off: string[] }
const STABLES = ["USDT", "USDC", "BUSD", "FDUSD", "DAI"];

const loadPrefs = (): CardPrefs => {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (Array.isArray(p?.order) && Array.isArray(p?.off)) return p;
  } catch { /* no storage */ }
  return { order: [], off: [] };
};
const savePrefs = (p: CardPrefs) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* no storage */ } };

// Planned cashback tiers by monthly spend; final rates depend on the issuing partner
const TIERS = [{ name: "T1", rate: "1.5%", spend: 0 }, { name: "T2", rate: "2%", spend: 100 }, { name: "T3", rate: "3%", spend: 1000 }];

/** FUN Card: spends the wallet's real coins once a licensed card issuer is connected.
 * Until then it shows the real spendable balance and preferences, and takes no payments. */
const FunCard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { balances } = useWallet();
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [prefs, setPrefs] = useState<CardPrefs>(loadPrefs);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const symbolKey = balances.map(b => b.symbol).join(",");
  useEffect(() => {
    if (!symbolKey) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchTokenPrices(symbolKey.split(","));
      if (!cancelled) setPrices(Object.fromEntries(data.map(p => [p.symbol.toUpperCase(), p])));
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [symbolKey]);

  // Coins with a real balance and a market price, in the user's spending order
  // (default: stablecoins first, then by value)
  const coins = useMemo(() => {
    const held = balances
      .map(b => ({ symbol: b.symbol, logo: b.logo, balance: b.balance, usd: (parseFloat(b.balance) || 0) * (prices[b.symbol.toUpperCase()]?.price ?? 0) }))
      .filter(c => c.usd >= 0.01);
    const rank = (s: string) => { const i = prefs.order.indexOf(s); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
    return held.sort((a, b) => rank(a.symbol) - rank(b.symbol)
      || Number(STABLES.includes(b.symbol.toUpperCase())) - Number(STABLES.includes(a.symbol.toUpperCase()))
      || b.usd - a.usd);
  }, [balances, prices, prefs.order]);

  const spendable = coins.filter(c => !prefs.off.includes(c.symbol)).reduce((s, c) => s + c.usd, 0);

  const update = (next: CardPrefs) => { setPrefs(next); savePrefs(next); };
  const move = (i: number, dir: -1 | 1) => {
    const order = coins.map(c => c.symbol);
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    update({ ...prefs, order });
  };
  const toggle = (symbol: string, on: boolean) =>
    update({ ...prefs, off: on ? prefs.off.filter(s => s !== symbol) : [...prefs.off, symbol] });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const soon = "Có khi thẻ được phát hành";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl font-heading font-bold">Thẻ FUN</h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-xl mx-auto">
        <div className="flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm">
          <Clock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Thẻ đang chờ đối tác phát hành</p>
            <p className="text-muted-foreground">Thẻ FUN chưa thanh toán được tại cửa hàng. Khi FUN Wallet ký với đơn vị phát hành thẻ được cấp phép, thẻ sẽ chi tiêu trực tiếp bằng các coin trong ví theo thứ tự bạn chọn dưới đây.</p>
          </div>
        </div>

        {/* Spendable balance from the wallet's real coins */}
        <section className="space-y-3">
          <button type="button" onClick={() => setShowBalance(v => !v)} className="flex items-center gap-1 text-sm text-muted-foreground">
            Số dư khả dụng (USD) {showBalance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <p className="text-4xl font-bold tracking-tight">{showBalance ? spendable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "******"}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-11" onClick={() => navigate("/trading")}><Repeat className="w-4 h-4 mr-2" />Đổi coin</Button>
            <Button className="h-11 bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => navigate("/qr-payment")}><Plus className="w-4 h-4 mr-2" />Nạp tiền</Button>
          </div>
        </section>

        {/* Card */}
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Thẻ của tôi</h2>
          <div className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-yellow-400/60" style={{ aspectRatio: "1.6 / 1" }}>
            <img src="/cards/fun-card.webp" alt="Thẻ FUN" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">Ảo · Chờ phát hành</span>
            <span className="absolute bottom-[9%] right-[6%] font-heading text-lg sm:text-2xl font-bold tracking-widest text-yellow-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">FUN CARD</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[[Hexagon, "Quản lý thẻ"], [Snowflake, "Khóa"], [BarChart3, "Hạn mức giao dịch"]].map(([Icon, label]) => {
              const I = Icon as typeof Hexagon;
              return (
                <div key={label as string} title={soon} className="flex flex-col items-center gap-1.5 text-muted-foreground opacity-60">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><I className="w-5 h-5" /></span>{label as string}
                </div>
              );
            })}
          </div>
        </section>

        {/* Which coins the card spends, and in which order */}
        <section className="rounded-2xl bg-muted/40 p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Đồng tiền ưu tiên</h2>
            <p className="text-xs text-muted-foreground">Khi thanh toán, thẻ trừ coin theo thứ tự từ trên xuống. Tắt coin nào thì thẻ không dùng coin đó.</p>
          </div>
          {coins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Ví chưa có coin có giá trị. Nạp hoặc đổi coin để có số dư cho thẻ.</p>
          ) : coins.map((c, i) => (
            <div key={c.symbol} className="flex items-center gap-3">
              <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
              <img src={c.logo} alt="" className="h-8 w-8 rounded-full" onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{c.symbol}</p>
                <p className="text-xs text-muted-foreground truncate">{formatBalance(c.balance)} · ≈ {formatUsdValue(c.usd)}</p>
              </div>
              <div className="flex flex-col">
                <button type="button" aria-label={`Đưa ${c.symbol} lên`} disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" aria-label={`Đưa ${c.symbol} xuống`} disabled={i === coins.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
              </div>
              <Switch checked={!prefs.off.includes(c.symbol)} onCheckedChange={on => toggle(c.symbol, on)} aria-label={`Dùng ${c.symbol} để thanh toán`} />
            </div>
          ))}
        </section>

        {/* Planned cashback */}
        <section className="rounded-2xl bg-muted/40 p-4 space-y-3">
          <div className="flex items-center gap-1.5"><h2 className="font-semibold">Hoàn tiền</h2><span className="text-xs text-muted-foreground">(dự kiến)</span></div>
          <div className="grid grid-cols-3 text-sm">
            {TIERS.map((t, i) => (
              <div key={t.name} className={i === 0 ? "text-yellow-600" : i === 1 ? "text-center" : "text-right"}>
                <p className="font-semibold">{t.rate}</p><p className="text-xs text-muted-foreground">{t.name} · ${t.spend.toLocaleString("en-US")}</p>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-muted"><div className="h-full w-1.5 rounded-full bg-yellow-400" /></div>
          <p className="flex gap-1.5 text-xs text-muted-foreground"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Mức hoàn tiền theo chi tiêu mỗi tháng; tỷ lệ chính thức sẽ công bố khi thẻ ra mắt.</p>
        </section>

        {/* Card history */}
        <section className="space-y-2">
          <h2 className="font-semibold text-lg">Lịch sử thẻ</h2>
          <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">Chưa có giao dịch thẻ.</p>
        </section>

        {/* What to prepare */}
        <section className="rounded-2xl border border-border p-4 space-y-2 text-sm">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Chuẩn bị để nhận thẻ</h2>
          <p className="text-muted-foreground">Thẻ thanh toán bắt buộc xác minh danh tính. Hoàn tất KYC trước để được cấp thẻ ngay khi ra mắt.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/kyc")}>Xác minh danh tính (KYC)</Button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default FunCard;
