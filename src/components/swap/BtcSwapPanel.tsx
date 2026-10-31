import { useCallback, useEffect, useRef, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, ExternalLink, Info, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBitcoin } from "@/hooks/useBitcoin";
import { createSessionSigner } from "@/lib/guardedSigner";
import { getChainById, getProviderForChain } from "@/lib/chains";
import { getLifiStatus, type LiFiStep } from "@/lib/lifi";
import { decimalIsPositive, exactTokenUnits } from "@/lib/tokenAmounts";
import { BTC_EXPLORER, formatBtc, getBtcFeeRates, parseBtc } from "@/lib/bitcoin";
import { BTC_ASSET, EVM_SWAP_ASSETS, executeBtcBuy, executeBtcSell, quoteBtcSwap, type BtcSwapIntent } from "@/lib/btcSwap";
import { ERC20_ABI } from "@/lib/wallet";

interface BtcSwapPanelProps {
  walletAddress: string;
  getPrivateKey: (address: string) => string | null;
  onRequestUnlock?: () => void;
  onSuccess?: () => void;
}

const NATIVE = "0x0000000000000000000000000000000000000000";
const fmt = (raw: string, decimals: number, digits = 8) => Number(formatUnits(raw, decimals)).toLocaleString("en-US", { maximumFractionDigits: digits });

/** Market-price BTC ↔ USDT/BNB/ETH, like an "instant buy/sell" screen. Quotes
 * refresh every 30 s; nothing is signed until the user confirms the shown quote. */
export const BtcSwapPanel = ({ walletAddress, getPrivateKey, onSuccess, onRequestUnlock }: BtcSwapPanelProps) => {
  const { user } = useAuth();
  const btc = useBitcoin(walletAddress, getPrivateKey);
  const [side, setSide] = useState<"sell" | "buy">("sell");
  const [assetKey, setAssetKey] = useState(EVM_SWAP_ASSETS[0].key);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<LiFiStep | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState("");
  const [evmBalance, setEvmBalance] = useState<bigint | null>(null);
  const intentRef = useRef<BtcSwapIntent | null>(null);
  const generation = useRef(0);

  const asset = EVM_SWAP_ASSETS.find(a => a.key === assetKey)!;
  const from = side === "sell" ? BTC_ASSET : asset;
  const to = side === "sell" ? asset : BTC_ASSET;

  useEffect(() => {
    if (side !== "buy") return;
    let live = true;
    setEvmBalance(null);
    const provider = getProviderForChain(getChainById(asset.chainId)!);
    const read = asset.token === NATIVE
      ? provider.getBalance(walletAddress)
      : new Contract(asset.token, ERC20_ABI, provider).balanceOf(walletAddress) as Promise<bigint>;
    read.then(b => live && setEvmBalance(b)).catch(() => live && setEvmBalance(null));
    return () => { live = false; };
  }, [side, asset, walletAddress]);

  const fetchQuote = useCallback(async () => {
    setConfirmed(false);
    if (!btc.address || !decimalIsPositive(amount)) { setQuote(null); setQuoteError(""); return; }
    let raw: bigint;
    try { raw = side === "sell" ? parseBtc(amount) : exactTokenUnits(amount, asset.decimals); }
    catch { setQuote(null); setQuoteError("Số lượng có quá nhiều chữ số thập phân"); return; }
    const id = ++generation.current;
    const intent: BtcSwapIntent = { side, btcAddress: btc.address, evmAddress: walletAddress, asset, amount: raw.toString(), slippage, quotedAt: Date.now() };
    setQuoting(true);
    try {
      const q = await quoteBtcSwap(intent);
      if (id === generation.current) { intentRef.current = intent; setQuote(q); setQuoteError(""); }
    } catch (e) {
      if (id === generation.current) { setQuote(null); setQuoteError(e instanceof Error ? e.message.slice(0, 200) : "Không có báo giá"); }
    } finally { if (id === generation.current) setQuoting(false); }
  }, [amount, side, asset, slippage, btc.address, walletAddress]);

  useEffect(() => {
    if (executing) return;
    const debounce = setTimeout(() => void fetchQuote(), 700);
    const refresh = setInterval(() => void fetchQuote(), 30_000);
    return () => { clearTimeout(debounce); clearInterval(refresh); };
  }, [fetchQuote, executing]);

  const setMax = async () => {
    if (side === "sell") {
      if (!btc.balance) return;
      const rates = await getBtcFeeRates().catch(() => null);
      const reserve = BigInt((rates?.fast ?? 5) * 300);
      const spendable = btc.balance.confirmed - reserve;
      setAmount(spendable > 0n ? formatBtc(spendable) : "0");
    } else if (evmBalance !== null) {
      // Leave native coin for gas: 0.002 BNB on BSC, 0.005 ETH on Ethereum.
      const native = asset.token === NATIVE;
      const reserve = native ? 10n ** BigInt(asset.decimals) / (asset.chainId === 1 ? 200n : 500n) : 0n;
      setAmount(formatUnits(evmBalance > reserve ? evmBalance - reserve : 0n, asset.decimals));
    }
  };

  const handleSwap = async () => {
    const intent = intentRef.current;
    if (!quote || !intent || !confirmed) return;
    const key = getPrivateKey(walletAddress);
    if (!key) { toast({ title: "Ví đang khóa", description: "Nhập mật khẩu ví, rồi bấm đổi lại" }); onRequestUnlock?.(); return; }
    setExecuting(true);
    try {
      let hash: string;
      if (intent.side === "sell") {
        setProgress("Đang ký và gửi BTC...");
        hash = await executeBtcSell(quote, intent, key);
      } else {
        const chain = getChainById(intent.asset.chainId)!;
        hash = await executeBtcBuy(quote, intent, createSessionSigner(key, getProviderForChain(chain), chain.chainId), setProgress);
      }
      if (user) await supabase.from("transactions").insert({
        user_id: user.id, tx_hash: hash, from_address: intent.side === "sell" ? intent.btcAddress : walletAddress,
        to_address: intent.side === "sell" ? walletAddress : intent.btcAddress, amount, token_symbol: from.symbol, status: "pending", tx_type: "swap",
      });
      const explorer = intent.side === "sell" ? `${BTC_EXPLORER}/tx/${hash}` : `${intent.asset.explorer}/tx/${hash}`;
      toast({ title: "Đã gửi lệnh đổi", description: <a href={explorer} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">Xem giao dịch <ExternalLink className="h-3 w-3" /></a> });
      setProgress(`Đang đổi, thường mất khoảng ${Math.max(10, Math.round((quote.estimate?.executionDuration ?? 1800) / 60))} phút...`);
      const tool = quote.tool;
      void (async () => {
        for (let i = 0; i < 90; i++) {
          await new Promise(r => setTimeout(r, 30_000));
          try {
            const s = await getLifiStatus({ txHash: hash, fromChain: from.chainId, toChain: to.chainId, bridge: tool });
            if (s.status === "DONE") { toast({ title: `Đã nhận ${to.symbol} ✅` }); setProgress(""); onSuccess?.(); void btc.refresh(); return; }
            if (s.status === "FAILED") { toast({ title: "Lệnh đổi thất bại", description: "Liên hệ hỗ trợ LI.FI kèm mã giao dịch", variant: "destructive" }); setProgress(""); return; }
          } catch { /* keep polling */ }
        }
      })();
      setAmount(""); setQuote(null); setConfirmed(false);
      void btc.refresh();
    } catch (e) {
      setProgress("");
      toast({ title: "Đổi thất bại", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setExecuting(false); }
  };

  const est = quote?.estimate;
  const feesUsd = est ? [...(est.feeCosts ?? []), ...(est.gasCosts ?? [])].reduce((sum, f) => sum + Number(f.amountUSD ?? 0), 0) : 0;
  const rate = est && Number(est.fromAmount) > 0
    ? (side === "sell"
      ? Number(formatUnits(est.toAmount, to.decimals)) / Number(formatUnits(est.fromAmount, 8))
      : Number(formatUnits(est.fromAmount, from.decimals)) / Number(formatUnits(est.toAmount, 8)))
    : null;
  const fromBalance = side === "sell" ? (btc.balance ? `${formatBtc(btc.balance.confirmed)} BTC` : "…") : (evmBalance !== null ? `${fmt(evmBalance.toString(), asset.decimals, 6)} ${asset.symbol}` : "…");

  if (!btc.address) return <p className="text-sm text-muted-foreground p-4 text-center">Mở khóa ví để dùng ví Bitcoin.</p>;

  const assetSelect = (
    <Select value={assetKey} onValueChange={v => { setAssetKey(v); setQuote(null); }}>
      <SelectTrigger className="w-[150px] shrink-0"><SelectValue /></SelectTrigger>
      <SelectContent>
        {EVM_SWAP_ASSETS.map(a => <SelectItem key={a.key} value={a.key}>{a.symbol} ({a.chainName})</SelectItem>)}
      </SelectContent>
    </Select>
  );
  const btcBadge = <div className="flex items-center gap-2 font-semibold px-3"><img src="/tokens/btc.svg" alt="" className="w-6 h-6" /> BTC</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50">
        {(["sell", "buy"] as const).map(s => (
          <button key={s} type="button" onClick={() => { setSide(s); setAmount(""); setQuote(null); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${side === s ? (s === "buy" ? "bg-green-600 text-white" : "bg-red-600 text-white") : "text-muted-foreground"}`}>
            {s === "sell" ? "Bán BTC" : "Mua BTC"}
          </button>
        ))}
      </div>
      {btc.priceUsd && <p className="text-xs text-center text-muted-foreground">Giá thị trường: 1 BTC ≈ ${btc.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>}

      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Từ</span>
          <span>Khả dụng: {fromBalance} <button type="button" className="text-primary font-medium ml-1" onClick={() => void setMax()}>Tối đa</button></span>
        </div>
        <div className="flex gap-2 items-center">
          <Input inputMode="decimal" placeholder="0.0" value={amount} onChange={e => { setAmount(e.target.value.replace(",", ".")); setQuote(null); }}
            className="text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0" />
          {side === "sell" ? btcBadge : assetSelect}
        </div>
      </div>

      <div className="flex justify-center -my-2">
        <button type="button" aria-label="Đảo chiều" onClick={() => { setSide(side === "sell" ? "buy" : "sell"); setAmount(""); setQuote(null); }}
          className="rounded-full h-8 w-8 flex items-center justify-center bg-background border"><ArrowDownUp className="h-4 w-4" /></button>
      </div>

      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="text-sm text-muted-foreground">Sang (ước tính)</div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 text-lg font-semibold">{quoting ? <Loader2 className="h-4 w-4 animate-spin" /> : est ? fmt(est.toAmount, to.decimals) : "0.0"}</div>
          {side === "sell" ? assetSelect : btcBadge}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Trượt giá</span>
        {[0.5, 1, 2].map(s => (
          <Button key={s} size="sm" variant={slippage === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => { setSlippage(s); setQuote(null); }}>{s}%</Button>
        ))}
      </div>

      {quoteError && !quote && <p className="text-xs text-destructive">{quoteError}</p>}

      {quote && est && (
        <div className="space-y-1 p-3 rounded-lg bg-muted/30 text-sm">
          {rate && <div className="flex justify-between"><span className="text-muted-foreground">Tỷ giá</span><span>1 BTC ≈ {rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} {asset.symbol}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Nhận tối thiểu</span><span>{fmt(est.toAmountMin, to.decimals)} {to.symbol}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tổng phí</span><span>≈ ${feesUsd.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Thời gian</span><span>~{Math.max(1, Math.round((est.executionDuration ?? 0) / 60))} phút</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Qua</span><span>{quote.toolDetails?.name ?? quote.tool} · LI.FI</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ví nhận</span>
            <span className="font-mono text-xs">{(side === "sell" ? walletAddress : btc.address).slice(0, 8)}…{(side === "sell" ? walletAddress : btc.address).slice(-6)} ({to.chainName})</span></div>
          <label className="flex items-start gap-2 pt-2 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} aria-label="Xác nhận đổi" />
            <span className="text-xs">Tôi đồng ý đổi theo báo giá này. Giá có thể thay đổi trong giới hạn trượt giá; giao dịch không thể hoàn tác.</span>
          </label>
        </div>
      )}

      {progress && <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30"><Info className="h-4 w-4 shrink-0" />{progress}</div>}

      <Button className={`w-full ${side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
        disabled={!quote || !confirmed || executing} onClick={handleSwap}>
        {executing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang xử lý</> : side === "sell" ? `Bán BTC lấy ${asset.symbol}` : `Mua BTC bằng ${asset.symbol}`}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Tiền luôn ở trong ví của bạn. Báo giá từ LI.FI, tự làm mới mỗi 30 giây.</p>
    </div>
  );
};
