import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Users } from "lucide-react";
import { formatPrice, formatUsdValue } from "@/lib/priceTracker";
import { compactAmount, getTokenMarketInfo, getTokenTrades, timeAgo, type MarketTrade, type TokenMarketInfo } from "@/lib/marketTrades";

type Filter = "all" | "buy" | "sell" | "mine";
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Live on-chain buys and sells of one BSC token, with the wallets behind them. */
export const MarketTradesPanel = ({ token, symbol, myAddress }: { token: string | null; symbol: string; myAddress?: string }) => {
  const [trades, setTrades] = useState<MarketTrade[] | null>(null);
  const [info, setInfo] = useState<TokenMarketInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState(false);

  useEffect(() => {
    setTrades(null); setInfo(null); setError(false);
    if (!token) return;
    let live = true;
    getTokenMarketInfo(token).then(i => live && setInfo(i)).catch(() => {});
    const load = () => getTokenTrades(token).then(t => { if (live) { setTrades(t); setError(false); } }).catch(() => live && setError(true));
    void load();
    const timer = setInterval(load, 30_000);
    return () => { live = false; clearInterval(timer); };
  }, [token]);

  if (!token) return null;
  const mine = myAddress?.toLowerCase();
  const rows = (trades ?? []).filter(t => filter === "all" || (filter === "mine" ? t.wallet.toLowerCase() === mine : t.side === filter));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold border-b-2 border-yellow-400 inline-block pb-1">Lịch sử giao dịch {symbol}</h2>
        {info?.holders && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{info.holders.toLocaleString("en-US")} người nắm giữ</span>}
      </div>
      {info && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-muted-foreground">Thanh khoản</p><p className="font-semibold">{formatUsdValue(info.liquidityUsd)}</p></div>
          <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-muted-foreground">Khối lượng 24h</p><p className="font-semibold">{formatUsdValue(info.volume24hUsd)}</p></div>
        </div>
      )}
      <div className="flex gap-1.5 text-xs">
        {([["all", "Tất cả"], ["buy", "Mua"], ["sell", "Bán"], ["mine", "Của tôi"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} disabled={k === "mine" && !mine}
            className={`px-2.5 py-1 rounded-full border ${filter === k ? "border-foreground font-semibold" : "border-border text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs text-muted-foreground px-1"><span>Thời gian / số lượng</span><span className="text-right">Giá trị / Giá</span><span className="text-right">Ví</span></div>
      {trades === null ? (
        <div className="flex justify-center py-6">{error ? <p className="text-sm text-muted-foreground">Chưa tải được lịch sử; thử lại sau</p> : <Loader2 className="h-5 w-5 animate-spin" />}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{filter === "mine" ? "Bạn chưa có giao dịch gần đây" : "Chưa có giao dịch trong 24 giờ qua"}</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((t, i) => {
            const me = t.wallet.toLowerCase() === mine;
            return (
              <div key={`${t.hash}${i}`} className="grid grid-cols-[1fr_auto_auto] gap-x-3 py-2 text-sm items-center">
                <div className="min-w-0">
                  <p><span className={`text-xs px-1.5 py-0.5 rounded ${t.side === "buy" ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"}`}>{t.side === "buy" ? "Mua" : "Bán"}</span>
                    <span className={`ml-1.5 font-medium ${t.side === "buy" ? "text-green-600" : "text-red-500"}`}>{t.side === "buy" ? "+" : "-"}{compactAmount(t.amount)}</span></p>
                  <p className="text-xs text-muted-foreground">{timeAgo(t.time)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatUsdValue(t.valueUsd)}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(t.priceUsd)}</p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <a href={`https://bscscan.com/address/${t.wallet}`} target="_blank" rel="noopener noreferrer" className={`font-mono flex items-center justify-end gap-1 hover:underline ${me ? "text-yellow-600 font-semibold" : ""}`}>{me ? "Bạn" : short(t.wallet)}<ExternalLink className="h-3 w-3" /></a>
                  <a href={`https://bscscan.com/tx/${t.hash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">Xem giao dịch</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Giao dịch trên các pool BSC (PancakeSwap…), cập nhật mỗi 30 giây · nguồn GeckoTerminal.</p>
    </section>
  );
};
