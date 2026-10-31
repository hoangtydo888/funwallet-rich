import { useState } from "react";
import { formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Loader2, Wallet } from "lucide-react";
import { TRADE_ASSETS, QUOTE_ASSET, type TradeAsset } from "@/lib/marketOrder";
import { fmtUnits, maxSpendable, quoteSummary, rateLabel, useMarketQuote } from "@/hooks/useMarketTrade";
import { AssetPicker } from "./AssetPicker";
import { OrderPreviewDialog } from "./OrderPreviewDialog";

export interface TradeContext {
  evmAddress: string;
  btcAddress: string | null;
  balances: Record<string, bigint>;
  unlocked: boolean;
  onUnlock: () => void;
  getPrivateKey: () => string | null;
  onTraded: () => void;
}

export const SLIPPAGES = [0.5, 1, 2, 3];

/** Binance "Mua/Bán → Tức thì": convert any coin to any other at market price. */
export const ConvertPanel = ({ ctx }: { ctx: TradeContext }) => {
  const [from, setFrom] = useState<TradeAsset>(TRADE_ASSETS[0]);
  const [to, setTo] = useState<TradeAsset>(QUOTE_ASSET);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [preview, setPreview] = useState(false);
  const { quote, order, error, loading, refresh } = useMarketQuote({ from, to, amount, slippage, evmAddress: ctx.evmAddress, btcAddress: ctx.btcAddress });
  const s = quoteSummary(quote, from, to);
  const balance = ctx.balances[from.key];
  const overBalance = (() => { try { return balance !== undefined && Number(amount) > Number(formatUnits(balance, from.decimals)); } catch { return false; } })();

  const pick = (side: "from" | "to") => (asset: TradeAsset) => {
    const other = side === "from" ? to : from;
    if (asset.key === other.key) { setFrom(side === "from" ? asset : to); setTo(side === "from" ? from : asset); }
    else if (side === "from") setFrom(asset); else setTo(asset);
    setAmount("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Từ</span>
          <button type="button" className="flex items-center gap-1 underline decoration-dotted" onClick={() => balance !== undefined && setAmount(formatUnits(balance, from.decimals))}>
            <Wallet className="h-3.5 w-3.5" /> {fmtUnits(balance, from.decimals, 8)} {from.symbol}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <AssetPicker value={from} onChange={pick("from")} balances={ctx.balances} />
          <Input inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))}
            className="text-right text-2xl font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none" />
        </div>
        <div className="flex justify-end">
          <button type="button" className="text-sm font-medium text-yellow-600" onClick={async () => setAmount(formatUnits(await maxSpendable(from, balance), from.decimals))}>Tối đa</button>
        </div>
      </div>

      <div className="flex justify-center -my-5 relative z-10">
        <button type="button" aria-label="Đảo chiều" onClick={() => { setFrom(to); setTo(from); setAmount(""); }}
          className="h-10 w-10 rounded-full bg-background border shadow flex items-center justify-center"><ArrowUpDown className="h-4 w-4" /></button>
      </div>

      <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground"><span>Sang</span><span>{fmtUnits(ctx.balances[to.key], to.decimals, 8)} {to.symbol}</span></div>
        <div className="flex items-center gap-3">
          <AssetPicker value={to} onChange={pick("to")} balances={ctx.balances} />
          <div className="flex-1 text-right text-2xl font-semibold text-muted-foreground truncate">
            {loading ? <Loader2 className="h-5 w-5 animate-spin ml-auto" /> : s ? s.toAmount.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "0.00"}
          </div>
        </div>
      </div>

      <div className="text-sm space-y-2 px-1">
        {s && <div className="flex justify-between"><span className="text-muted-foreground">Tỷ giá</span><span>{rateLabel(s.rate, from, to)}</span></div>}
        {s && <div className="flex justify-between"><span className="text-muted-foreground">Phí</span><span>≈ ${s.feesUsd.toFixed(2)}</span></div>}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Trượt giá</span>
          <div className="flex gap-1">{SLIPPAGES.map(v => (
            <button key={v} type="button" onClick={() => setSlippage(v)} className={`px-2 py-0.5 rounded text-xs border ${slippage === v ? "border-yellow-500 bg-yellow-400/20 font-semibold" : "border-border"}`}>{v}%</button>
          ))}</div>
        </div>
        {overBalance && <p className="text-destructive text-xs">Số dư {from.symbol} không đủ</p>}
        {error && !overBalance && <p className="text-destructive text-xs">{error}</p>}
      </div>

      {ctx.unlocked ? (
        <Button className="w-full h-12 text-base bg-yellow-400 hover:bg-yellow-500 text-black disabled:opacity-50" disabled={!quote || overBalance} onClick={() => setPreview(true)}>Xem trước lệnh</Button>
      ) : (
        <Button className="w-full h-12 text-base" onClick={ctx.onUnlock}>Mở khóa ví để giao dịch</Button>
      )}

      <OrderPreviewDialog open={preview} onOpenChange={setPreview} quote={quote} order={order} onRefresh={() => void refresh()}
        getPrivateKey={ctx.getPrivateKey} onDone={() => { setAmount(""); ctx.onTraded(); }} action={{ label: "Chuyển đổi", className: "bg-yellow-400 hover:bg-yellow-500 text-black" }} />
    </div>
  );
};
