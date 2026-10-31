import { useEffect, useState } from "react";
import { getDepth, getLifiPriceUsd, getTickers, type Depth, type Ticker, type TradeAsset } from "@/lib/marketOrder";

const price = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: n >= 100 ? 2 : 4, maximumFractionDigits: n >= 100 ? 2 : n >= 1 ? 4 : 8 });
const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 5 });

/** Live 24 h ticker for a coin, refreshed every 5 s. */
export function useTicker(asset: TradeAsset) {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  useEffect(() => {
    let live = true;
    setTicker(null);
    const load = async () => {
      try {
        if (asset.binance) { const t = (await getTickers([asset.binance]))[asset.binance]; if (live && t) setTicker(t); }
        else { const p = await getLifiPriceUsd(asset); if (live && p) setTicker({ symbol: asset.symbol, price: p, changePct: 0, high: 0, low: 0, quoteVolume: 0 }); }
      } catch { /* keep the last value */ }
    };
    void load();
    const timer = setInterval(() => void load(), asset.binance ? 5_000 : 30_000);
    return () => { live = false; clearInterval(timer); };
  }, [asset]);
  return ticker;
}

/** Binance order book (5 asks, last price, 5 bids) for reference, refreshed every 3 s. */
export const OrderBook = ({ asset, ticker }: { asset: TradeAsset; ticker: Ticker | null }) => {
  const [depth, setDepth] = useState<Depth | null>(null);
  useEffect(() => {
    let live = true;
    setDepth(null);
    if (!asset.binance) return;
    const load = () => getDepth(asset.binance!, 5).then(d => live && setDepth(d)).catch(() => {});
    void load();
    const timer = setInterval(load, 3_000);
    return () => { live = false; clearInterval(timer); };
  }, [asset]);

  const up = (ticker?.changePct ?? 0) >= 0;
  const bidSum = depth?.bids.reduce((s, [, q]) => s + q, 0) ?? 0;
  const askSum = depth?.asks.reduce((s, [, q]) => s + q, 0) ?? 0;
  const bidPct = bidSum + askSum > 0 ? (bidSum / (bidSum + askSum)) * 100 : 50;

  return (
    <div className="text-xs space-y-1">
      <div className="flex justify-between text-muted-foreground"><span>Giá (USDT)</span><span>Số lượng ({asset.symbol})</span></div>
      {asset.binance ? (
        <>
          {(depth?.asks.slice(0, 5).reverse() ?? Array(5).fill(null)).map((row, i) => (
            <div key={`a${i}`} className="flex justify-between font-mono"><span className="text-red-500">{row ? price(row[0]) : "—"}</span><span>{row ? qty(row[1]) : ""}</span></div>
          ))}
          <div className="py-1.5 text-center">
            <div className={`text-lg font-bold ${up ? "text-green-600" : "text-red-500"}`}>{ticker ? price(ticker.price) : "…"}</div>
            <div className="text-muted-foreground">≈ ${ticker ? price(ticker.price) : "…"}</div>
          </div>
          {(depth?.bids.slice(0, 5) ?? Array(5).fill(null)).map((row, i) => (
            <div key={`b${i}`} className="flex justify-between font-mono"><span className="text-green-600">{row ? price(row[0]) : "—"}</span><span>{row ? qty(row[1]) : ""}</span></div>
          ))}
          <div className="flex items-center gap-1 pt-1">
            <span className="text-green-600">{bidPct.toFixed(1)}%</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden flex"><div className="bg-green-600" style={{ width: `${bidPct}%` }} /><div className="bg-red-500 flex-1" /></div>
            <span className="text-red-500">{(100 - bidPct).toFixed(1)}%</span>
          </div>
        </>
      ) : (
        <div className="py-6 text-center space-y-1">
          <div className="text-lg font-bold">{ticker ? `$${price(ticker.price)}` : "…"}</div>
          <p className="text-muted-foreground">{asset.symbol} chưa niêm yết trên Binance; giá từ LI.FI.</p>
        </div>
      )}
    </div>
  );
};
