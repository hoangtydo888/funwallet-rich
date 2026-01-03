import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownUp, Loader2, ExternalLink, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SWAP_TOKENS, getSwapQuote, executeSwap } from "@/lib/swap";
import { BSC_MAINNET } from "@/lib/wallet";

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  getPrivateKey: (address: string) => string | null;
  onSuccess?: () => void;
}

export const SwapDialog = ({
  open,
  onOpenChange,
  walletAddress,
  getPrivateKey,
  onSuccess,
}: SwapDialogProps) => {
  const [tokenIn, setTokenIn] = useState(SWAP_TOKENS[0]); // BNB
  const [tokenOut, setTokenOut] = useState(SWAP_TOKENS[1]); // USDT
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState("0");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  const fetchQuote = useCallback(async () => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut("");
      return;
    }

    setQuoteLoading(true);
    const quote = await getSwapQuote(amountIn, tokenIn, tokenOut);
    setQuoteLoading(false);

    if (quote) {
      setAmountOut(parseFloat(quote.amountOut).toFixed(6));
      setPriceImpact(quote.priceImpact);
    } else {
      setAmountOut("");
      toast({
        title: "Không thể lấy giá",
        description: "Vui lòng thử lại",
        variant: "destructive",
      });
    }
  }, [amountIn, tokenIn, tokenOut]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amountIn) fetchQuote();
    }, 500);
    return () => clearTimeout(timer);
  }, [amountIn, tokenIn, tokenOut, fetchQuote]);

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn(amountOut);
    setAmountOut("");
  };

  const handleSwap = async () => {
    if (!amountIn || !amountOut) return;

    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await executeSwap(
      privateKey,
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      slippage
    );
    setLoading(false);

    if ("hash" in result) {
      toast({
        title: "Swap thành công! 🎉",
        description: (
          <a
            href={`${BSC_MAINNET.explorer}/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            Xem giao dịch <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      onSuccess?.();
      onOpenChange(false);
      setAmountIn("");
      setAmountOut("");
    } else {
      toast({
        title: "Swap thất bại",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const rate = amountIn && amountOut
    ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)
    : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-primary" />
              Swap Tokens
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {showSettings && (
          <div className="p-3 rounded-lg bg-muted/50 mb-4">
            <p className="text-sm text-muted-foreground mb-2">Slippage Tolerance</p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0].map((s) => (
                <Button
                  key={s}
                  variant={slippage === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlippage(s)}
                >
                  {s}%
                </Button>
              ))}
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                className="w-20"
                step="0.1"
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* From */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Từ</span>
            </div>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="text-xl font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
              />
              <Select
                value={tokenIn.symbol}
                onValueChange={(v) => {
                  const token = SWAP_TOKENS.find((t) => t.symbol === v);
                  if (token && token.symbol !== tokenOut.symbol) {
                    setTokenIn(token);
                  }
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SWAP_TOKENS.filter((t) => t.symbol !== tokenOut.symbol).map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 bg-background"
              onClick={handleSwapTokens}
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* To */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Đến</span>
              {quoteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="0.0"
                value={amountOut}
                readOnly
                className="text-xl font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
              />
              <Select
                value={tokenOut.symbol}
                onValueChange={(v) => {
                  const token = SWAP_TOKENS.find((t) => t.symbol === v);
                  if (token && token.symbol !== tokenIn.symbol) {
                    setTokenOut(token);
                  }
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SWAP_TOKENS.filter((t) => t.symbol !== tokenIn.symbol).map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price info */}
          {amountIn && amountOut && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tỷ giá</span>
                <span>1 {tokenIn.symbol} = {rate} {tokenOut.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={parseFloat(priceImpact) > 1 ? "text-destructive" : "text-success"}>
                  {priceImpact}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slippage</span>
                <span>{slippage}%</span>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-primary to-secondary"
            size="lg"
            onClick={handleSwap}
            disabled={loading || !amountIn || !amountOut}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang swap...
              </>
            ) : (
              "Swap"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Powered by PancakeSwap 🥞
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
