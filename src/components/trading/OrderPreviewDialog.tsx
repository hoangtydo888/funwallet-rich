import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowDown, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getLifiStatus, type LiFiStep } from "@/lib/lifi";
import { executeMarketOrder, isBtc, type MarketOrder } from "@/lib/marketOrder";
import { isPancakeStep } from "@/lib/pancakeDirect";
import { fmtUnits, quoteSummary, rateLabel } from "@/hooks/useMarketTrade";
import { AssetLogo } from "./AssetPicker";

const QUOTE_TTL = 60_000;

interface OrderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: LiFiStep | null;
  order: MarketOrder | null;
  onRefresh: () => void;
  getPrivateKey: () => string | null;
  onDone: () => void;
  /** Button label and colour: Binance-style yellow for convert, green/red for spot. */
  action?: { label: string; className: string };
}

/** Last step before signing: shows exactly what will be swapped, with a countdown
 * while the quote is valid. Nothing is signed until "Xác nhận". */
export const OrderPreviewDialog = ({ open, onOpenChange, quote, order, onRefresh, getPrivateKey, onDone, action }: OrderPreviewDialogProps) => {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!open) return;
    setProgress("");
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!order) return null;
  const { from, to } = order;
  const s = quoteSummary(quote, from, to);
  const left = Math.max(0, Math.ceil((order.quotedAt + QUOTE_TTL - now) / 1000));
  const expired = left === 0;
  const receiver = isBtc(to) ? order.btcAddress ?? "" : order.evmAddress;

  const confirm = async () => {
    const key = getPrivateKey();
    if (!quote || !key) { toast({ title: "Ví đang khóa", description: "Mở khóa ví rồi thử lại", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const result = await executeMarketOrder(quote, order, key, setProgress);
      if (user) await supabase.from("transactions").insert({
        user_id: user.id, tx_hash: result.hash, from_address: isBtc(from) ? order.btcAddress ?? "" : order.evmAddress, to_address: receiver,
        amount: fmtUnits(BigInt(order.amount), from.decimals, 8).replace(/,/g, ""), token_symbol: from.symbol, status: result.crossChain ? "pending" : "success", tx_type: "swap",
      });
      toast({
        title: result.crossChain ? "Đã gửi lệnh" : `Đã đổi sang ${to.symbol} ✅`,
        description: <a href={`${result.explorer}/tx/${result.hash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">Xem giao dịch <ExternalLink className="h-3 w-3" /></a>,
      });
      if (result.crossChain) {
        toast({ title: `Đang chuyển ${to.symbol}`, description: `Thường mất khoảng ${s?.minutes ?? 20} phút. Ví sẽ báo khi nhận được.` });
        const tool = quote.tool;
        void (async () => {
          for (let i = 0; i < 90; i++) {
            await new Promise(r => setTimeout(r, 30_000));
            try {
              const st = await getLifiStatus({ txHash: result.hash, fromChain: from.chainId, toChain: to.chainId, bridge: tool });
              if (st.status === "DONE") { toast({ title: `Đã nhận ${to.symbol} ✅` }); onDone(); return; }
              if (st.status === "FAILED") { toast({ title: "Lệnh thất bại", description: "Liên hệ hỗ trợ LI.FI kèm mã giao dịch", variant: "destructive" }); return; }
            } catch { /* keep polling */ }
          }
        })();
      }
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Lệnh chưa thực hiện", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setBusy(false); setProgress(""); }
  };

  const row = (label: string, value: React.ReactNode) => <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;

  return (
    <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận lệnh</DialogTitle>
          <DialogDescription>Lệnh thị trường · coin về thẳng ví của bạn</DialogDescription>
        </DialogHeader>
        {s ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Từ</span><span className="flex items-center gap-2 font-semibold"><AssetLogo asset={from} size={22} />{fmtUnits(BigInt(order.amount), from.decimals, 8)} {from.symbol}</span></div>
              <ArrowDown className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Sang (ước tính)</span><span className="flex items-center gap-2 font-semibold text-lg"><AssetLogo asset={to} size={22} />{s.toAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })} {to.symbol}</span></div>
            </div>
            <div className="text-sm space-y-1.5">
              {row("Tỷ giá", rateLabel(s.rate, from, to))}
              {row("Nhận tối thiểu", `${fmtUnits(s.toAmountMin, to.decimals, 8)} ${to.symbol}`)}
              {row("Trượt giá tối đa", `${order.slippage}%`)}
              {row("Phí dịch vụ", s.serviceUsd > 0 ? `≈ $${s.serviceUsd.toFixed(4)}` : <span className="text-green-600 font-semibold">0 · miễn phí</span>)}
              {row("Phí mạng (gas)", `≈ $${s.gasUsd.toFixed(4)}`)}
              {row("Thời gian", isBtc(from) || isBtc(to) ? `~${s.minutes} phút` : "Vài giây")}
              {row("Qua", isPancakeStep(quote!) ? s.route : `${s.route} · LI.FI`)}
              {row("Ví nhận", <span className="font-mono text-xs">{receiver.slice(0, 8)}…{receiver.slice(-6)} ({to.chainName === "Bitcoin" ? "Bitcoin" : "BSC"})</span>)}
            </div>
            {progress && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}
            {expired ? (
              <Button className="w-full" variant="outline" disabled={busy} onClick={onRefresh}>Báo giá đã hết hạn · Làm mới</Button>
            ) : (
              <Button className={`w-full h-12 text-base ${action?.className ?? "bg-yellow-400 hover:bg-yellow-500 text-black"}`} disabled={busy} onClick={confirm}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `${action?.label ?? "Xác nhận"} (${left}s)`}
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground text-center">Giao dịch trên blockchain không thể hoàn tác. Giá thực nhận có thể chênh trong giới hạn trượt giá.</p>
          </div>
        ) : (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
      </DialogContent>
    </Dialog>
  );
};
