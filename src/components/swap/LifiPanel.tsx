import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp, Loader2, ExternalLink, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ethers } from "ethers";
import { SUPPORTED_CHAINS, CHAIN_TOKENS, getChainById, getProviderForChain } from "@/lib/chains";
import { getLifiQuote, executeLifiStep, getLifiStatus, type LiFiStep } from "@/lib/lifi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LifiPanelProps {
  walletAddress: string;
  getPrivateKey: (address: string) => string | null;
  mode: "swap" | "bridge";
  onSuccess?: () => void;
  onClose?: () => void;
}

const NATIVE = "0x0000000000000000000000000000000000000000";

export const LifiPanel = ({
  walletAddress,
  getPrivateKey,
  mode,
  onSuccess,
  onClose,
}: LifiPanelProps) => {
  const { user } = useAuth();
  const [fromChainId, setFromChainId] = useState<number>(56);
  const [toChainId, setToChainId] = useState<number>(mode === "bridge" ? 1 : 56);
  const [fromToken, setFromToken] = useState<string>(NATIVE);
  const [toToken, setToToken] = useState<string>(() => {
    const t = CHAIN_TOKENS[mode === "bridge" ? 1 : 56]?.[1];
    return t?.address ?? NATIVE;
  });
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<LiFiStep | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>("");

  const fromChain = getChainById(fromChainId);
  const toChain = getChainById(toChainId);
  const fromTokens = CHAIN_TOKENS[fromChainId] ?? [];
  const toTokens = CHAIN_TOKENS[toChainId] ?? [];

  const handleQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !fromChain) return;
    setQuoteLoading(true);
    setQuote(null);
    try {
      const fromTokenMeta = fromTokens.find((t) => (t.address ?? NATIVE) === fromToken);
      const decimals = fromTokenMeta?.decimals ?? 18;
      const rawAmount = ethers.parseUnits(amount, decimals).toString();
      const q = await getLifiQuote({
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken,
        toToken,
        fromAmount: rawAmount,
        fromAddress: walletAddress,
        slippage: slippage / 100,
      });
      setQuote(q);
    } catch (e) {
      console.error("LiFi quote error", e);
      toast({
        title: "Không lấy được báo giá",
        description: e instanceof Error ? e.message : "Không có route",
        variant: "destructive",
      });
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, fromChain, fromChainId, toChainId, fromToken, toToken, walletAddress, slippage, fromTokens]);

  const handleExecute = async () => {
    if (!quote || !fromChain) return;
    const pk = getPrivateKey(walletAddress);
    if (!pk) {
      toast({
        title: "Ví bị khóa",
        description: "Vui lòng mở khóa ví trước khi swap",
        variant: "destructive",
      });
      return;
    }
    setExecuting(true);
    setProgressMsg("Đang gửi giao dịch...");
    try {
      const provider = getProviderForChain(fromChain);
      const signer = new ethers.Wallet(pk, provider);
      const hash = await executeLifiStep(quote, signer);
      setProgressMsg("Đã gửi. Đang xác nhận...");

      // Persist to transactions table
      if (user) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          tx_hash: hash,
          from_address: walletAddress,
          to_address: quote.action.toAddress || walletAddress,
          amount: amount,
          token_symbol: fromTokens.find((t) => (t.address ?? NATIVE) === fromToken)?.symbol ?? "?",
          status: "pending",
          tx_type: mode === "bridge" ? "bridge" : "swap",
        });
      }

      toast({
        title: mode === "bridge" ? "Bridge đã gửi" : "Swap thành công",
        description: (
          <a
            href={`${fromChain.explorer}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            Xem giao dịch <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });

      // For bridges, poll status in background
      if (mode === "bridge" && fromChainId !== toChainId) {
        setProgressMsg("Đang bridge (5-20 phút)...");
        (async () => {
          for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, 20_000));
            try {
              const s = await getLifiStatus({
                txHash: hash,
                fromChain: fromChainId,
                toChain: toChainId,
                bridge: quote.tool,
              });
              if (s.status === "DONE") {
                toast({ title: "Bridge hoàn tất ✅" });
                return;
              }
              if (s.status === "FAILED") {
                toast({ title: "Bridge thất bại", variant: "destructive" });
                return;
              }
            } catch (err) {
              console.warn("bridge status poll error", err);
            }
          }
        })();
      }

      onSuccess?.();
      onClose?.();
    } catch (e) {
      console.error("LiFi execute error", e);
      toast({
        title: mode === "bridge" ? "Bridge thất bại" : "Swap thất bại",
        description: e instanceof Error ? e.message : "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
      setProgressMsg("");
    }
  };

  const rateStr =
    quote && quote.estimate
      ? `1 ${quote.action.fromToken.symbol} ≈ ${(
          Number(quote.estimate.toAmount) /
          10 ** quote.action.toToken.decimals /
          (Number(quote.estimate.fromAmount) / 10 ** quote.action.fromToken.decimals)
        ).toFixed(6)} ${quote.action.toToken.symbol}`
      : null;

  return (
    <div className="space-y-4">
      {/* From */}
      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Từ</span>
          <Select
            value={String(fromChainId)}
            onValueChange={(v) => {
              const cid = Number(v);
              setFromChainId(cid);
              const first = CHAIN_TOKENS[cid]?.[0];
              setFromToken(first?.address ?? NATIVE);
              setQuote(null);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CHAINS.slice(0, 10).map((c) => (
                <SelectItem key={c.chainId} value={String(c.chainId)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
            }}
            className="text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          <Select value={fromToken} onValueChange={(v) => { setFromToken(v); setQuote(null); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fromTokens.map((t) => (
                <SelectItem key={t.symbol} value={t.address ?? NATIVE}>
                  {t.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-center -my-2">
        <div className="rounded-full h-8 w-8 flex items-center justify-center bg-background border">
          <ArrowDownUp className="h-4 w-4" />
        </div>
      </div>

      {/* To */}
      <div className="p-3 rounded-xl bg-muted/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Đến</span>
          <Select
            value={String(toChainId)}
            onValueChange={(v) => {
              const cid = Number(v);
              setToChainId(cid);
              const first = CHAIN_TOKENS[cid]?.[1] ?? CHAIN_TOKENS[cid]?.[0];
              setToToken(first?.address ?? NATIVE);
              setQuote(null);
            }}
            disabled={mode === "swap"}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CHAINS.slice(0, 10).map((c) => (
                <SelectItem key={c.chainId} value={String(c.chainId)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            readOnly
            placeholder="0.0"
            value={
              quote?.estimate
                ? (Number(quote.estimate.toAmount) / 10 ** quote.action.toToken.decimals).toFixed(6)
                : ""
            }
            className="text-lg font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
          />
          <Select value={toToken} onValueChange={(v) => { setToToken(v); setQuote(null); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toTokens.map((t) => (
                <SelectItem key={t.symbol} value={t.address ?? NATIVE}>
                  {t.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slippage */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Slippage</span>
        {[0.1, 0.5, 1.0].map((s) => (
          <Button
            key={s}
            variant={slippage === s ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setSlippage(s); setQuote(null); }}
          >
            {s}%
          </Button>
        ))}
      </div>

      {/* Quote info */}
      {quote && (
        <div className="space-y-1 p-3 rounded-lg bg-muted/30 text-sm">
          {rateStr && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tỷ giá</span>
              <span>{rateStr}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium">{quote.toolDetails?.name ?? quote.tool}</span>
          </div>
          {quote.estimate?.gasCosts?.[0] && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gas</span>
              <span>≈ ${Number(quote.estimate.gasCosts[0].amountUSD ?? 0).toFixed(4)}</span>
            </div>
          )}
          {quote.estimate?.executionDuration != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ETA</span>
              <span>~{Math.round(quote.estimate.executionDuration / 60)} phút</span>
            </div>
          )}
        </div>
      )}

      {progressMsg && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
          <Info className="h-4 w-4" />
          {progressMsg}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleQuote}
          disabled={quoteLoading || !amount}
          className="flex-1"
        >
          {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Báo giá"}
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-secondary"
          onClick={handleExecute}
          disabled={!quote || executing}
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang xử lý
            </>
          ) : mode === "bridge" ? (
            "Bridge"
          ) : (
            "Swap"
          )}
        </Button>
      </div>
    </div>
  );
};
