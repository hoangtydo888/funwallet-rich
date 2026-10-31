import { useState } from "react";
import { formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Loader2 } from "lucide-react";
import { TRADE_ASSETS, QUOTE_ASSET, type TradeAsset } from "@/lib/marketOrder";
import { fmtUnits, maxSpendable, quoteSummary, useMarketQuote } from "@/hooks/useMarketTrade";
import { AssetPicker } from "./AssetPicker";
import { OrderBook, useTicker } from "./OrderBook";
import { OrderPreviewDialog } from "./OrderPreviewDialog";
import { SLIPPAGES, type TradeContext } from "./ConvertPanel";

const STEPS = [0, 25, 50, 75, 100];

/** Binance "Giao ngay" with market orders: pick a COIN/USDT pair, buy with a USDT
 * total or sell a coin quantity, beside the live Binance order book. */
export const SpotPanel = ({ ctx }: { ctx: TradeContext }) => {
  const [base, setBase] = useState<TradeAsset>(TRADE_ASSETS[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [preview, setPreview] = useState(false);
  const ticker = useTicker(base);
  const from = side === "buy" ? QUOTE_ASSET : base;
  const to = side === "buy" ? base : QUOTE_ASSET;
  const { quote, order, error, loading, refresh } = useMarketQuote({ from, to, amount, slippage, evmAddress: ctx.evmAddress, btcAddress: ctx.btcAddress });
  const s = quoteSummary(quote, from, to);
  const balance = ctx.balances[from.key];
  const available = balance !== undefined ? Number(formatUnits(balance, from.decimals)) : null;
  const overBalance = available !== null && Number(amount) > available;
  const buy = side === "buy";

  const setPercent = async (p: number) => {
    setPct(p);
    const max = await maxSpendable(from, balance);
    setAmount(p === 0 ? "" : formatUnits(max * BigInt(p) / 100n, from.decimals));
  };
  const switchSide = (next: "buy" | "sell") => { setSide(next); setAmount(""); setPct(0); };
  const maxOther = available !== null && ticker?.price ? (buy ? available / ticker.price : available * ticker.price) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AssetPicker value={base} onChange={a => { setBase(a); setAmount(""); setPct(0); }} balances={ctx.balances} exclude={[QUOTE_ASSET.key]}
          label={`${base.symbol}/USDT`} className="text-xl" />
        {ticker && <span className={`text-sm font-medium ${ticker.changePct >= 0 ? "text-green-600" : "text-red-500"}`}>{ticker.changePct >= 0 ? "+" : ""}{ticker.changePct.toFixed(2)}%</span>}
      </div>

      <div className="grid grid-cols-[1fr_minmax(0,0.85fr)] gap-4">
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 rounded-lg bg-muted/60 p-0.5">
            {(["buy", "sell"] as const).map(v => (
              <button key={v} type="button" onClick={() => switchSide(v)}
                className={`py-2 rounded-md text-sm font-semibold transition ${side === v ? (v === "buy" ? "bg-green-600 text-white" : "bg-red-500 text-white") : "text-muted-foreground"}`}>
                {v === "buy" ? "Mua" : "Bán"}
              </button>
            ))}
          </div>

          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm flex justify-between items-center">
            <span className="font-medium">Market</span><Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="rounded-lg bg-muted/60 px-3 py-1 flex items-center gap-2">
            <Input inputMode="decimal" value={amount} placeholder={buy ? "Tổng" : "Số lượng"} onChange={e => { setAmount(e.target.value.replace(",", ".")); setPct(0); }}
              className="border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none" />
            <span className="text-sm font-medium shrink-0">{from.symbol}</span>
          </div>

          <div className="relative flex justify-between items-center px-1 pt-1">
            <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-border mt-0.5" />
            {STEPS.map(p => (
              <button key={p} type="button" aria-label={`${p}%`} onClick={() => void setPercent(p)}
                className={`relative h-3 w-3 rotate-45 border-2 ${pct >= p && pct > 0 ? (buy ? "bg-green-600 border-green-600" : "bg-red-500 border-red-500") : "bg-background border-muted-foreground"}`} />
            ))}
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Khả dụng</span><span>{fmtUnits(balance, from.decimals, 8)} {from.symbol}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{buy ? "Mua tối đa" : "Nhận tối đa"}</span><span>{maxOther !== null ? maxOther.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "--"} {to.symbol}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Nhận ước tính</span><span>{loading ? "…" : s ? `${s.toAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${to.symbol}` : `-- ${to.symbol}`}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phí dự kiến</span><span>{s ? `≈ $${s.feesUsd.toFixed(2)}` : "--"}</span></div>
            <div className="flex justify-between items-center gap-2"><span className="text-muted-foreground whitespace-nowrap">Trượt giá</span>
              <span className="flex gap-1">{SLIPPAGES.map(v => (
                <button key={v} type="button" onClick={() => setSlippage(v)} className={`px-1.5 rounded border ${slippage === v ? "border-foreground font-semibold" : "border-border"}`}>{v}%</button>
              ))}</span>
            </div>
          </div>

          {overBalance && <p className="text-destructive text-xs">Số dư {from.symbol} không đủ</p>}
          {error && !overBalance && <p className="text-destructive text-xs">{error}</p>}

          {ctx.unlocked ? (
            <Button className={`w-full h-11 text-white ${buy ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
              disabled={!quote || overBalance || loading} onClick={() => setPreview(true)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${buy ? "Mua" : "Bán"} ${base.symbol}`}
            </Button>
          ) : (
            <Button className="w-full h-11" onClick={ctx.onUnlock}>Mở khóa ví</Button>
          )}
        </div>

        <OrderBook asset={base} ticker={ticker} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Sổ lệnh và giá tham khảo từ Binance. Lệnh Market khớp qua LI.FI (PancakeSwap, 1inch… trên BSC) theo giá báo trong hộp xác nhận; coin về thẳng ví của bạn.
        {base.key === "btc" && " BTC là Bitcoin thật trên mạng Bitcoin, thường mất 10–30 phút."}
      </p>

      <OrderPreviewDialog open={preview} onOpenChange={setPreview} quote={quote} order={order} onRefresh={() => void refresh()}
        getPrivateKey={ctx.getPrivateKey} onDone={() => { setAmount(""); setPct(0); ctx.onTraded(); }}
        action={{ label: `${buy ? "Mua" : "Bán"} ${base.symbol}`, className: `text-white ${buy ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}` }} />
    </div>
  );
};
