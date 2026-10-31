import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { fetchDexPrice, formatUsd, sumPendingRewards, type DexPrice } from "@/lib/funTokens";
import { formatBalance } from "@/lib/wallet";
import { formatPrice } from "@/lib/priceTracker";
import { formatFun, getFunMoneyState, type FunMoneyState } from "@/lib/funMoney";
import { FunMoneyDialog } from "@/components/wallet/FunMoneyDialog";

export interface FunTokenDef {
  symbol: string;
  name: string;
  address: string | null; // null = contract not yet configured
  logo: string;
}

export const FUN_TOKENS: FunTokenDef[] = [
  { symbol: "FUN", name: "FUN MONEY", address: null, logo: "/tokens/fun-money.png" },
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", logo: "/tokens/camly.png" },
];

interface Reward {
  id: string;
  reward_amount: string;
  reward_symbol: string | null;
  status: string;
}

export const FunEcosystemCard = ({ balances, address }: { balances: { symbol: string; balance: string }[]; address?: string }) => {
  const { user } = useAuth();
  const [prices, setPrices] = useState<Record<string, DexPrice | null>>({});
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [fun, setFun] = useState<FunMoneyState | null>(null);
  const [funOpen, setFunOpen] = useState(false);

  // FUN Money is on BSC Testnet, so its balance comes from there, not the mainnet list
  const loadFun = useCallback(() => {
    if (address) getFunMoneyState(address).then(setFun).catch(() => setFun(null));
  }, [address]);
  useEffect(() => { loadFun(); }, [loadFun]);

  useEffect(() => {
    FUN_TOKENS.forEach(async (t) => {
      if (!t.address) return;
      const p = await fetchDexPrice(t.address);
      setPrices((prev) => ({ ...prev, [t.symbol]: p }));
    });
  }, []);

  const loadRewards = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("rewards")
      .select("id, reward_amount, reward_symbol, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "claim_requested"]);
    setRewards(data ?? []);
  }, [user]);

  useEffect(() => { loadRewards(); }, [loadRewards]);

  const pending = rewards.filter((r) => r.status === "pending");

  const claimAll = async () => {
    setClaiming(true);
    let ok = 0;
    for (const r of pending) {
      const { error } = await supabase.rpc("claim_reward", { p_reward_id: r.id });
      if (!error) ok++;
    }
    setClaiming(false);
    toast({
      title: ok ? "Đã gửi yêu cầu nhận thưởng" : "Không nhận được thưởng",
      description: ok ? `${ok} phần thưởng đang được xử lý, xem trong Lịch sử.` : "Vui lòng thử lại sau.",
      variant: ok ? "default" : "destructive",
    });
    loadRewards();
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-heading font-bold">Hệ sinh thái FUN</h3>
        {FUN_TOKENS.map((t) => {
          if (t.symbol === "FUN") return (
            <button key="FUN" type="button" disabled={!address} onClick={() => setFunOpen(true)} className="w-full flex items-center gap-3 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-muted/50">
              <img src={t.logo} alt={t.name} className="w-9 h-9 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.name} <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">Testnet</span></p>
                <p className="text-xs text-muted-foreground">{fun && (fun.locked > 0n || fun.activated > 0n) ? `Khóa ${formatFun(fun.locked)} · Kích hoạt ${formatFun(fun.activated)}` : "Gửi · Nhận · Kích hoạt"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{fun ? formatFun(fun.balance) : "…"} FUN</p>
                <p className="text-xs text-muted-foreground">BSC Testnet</p>
              </div>
            </button>
          );
          const bal = parseFloat(balances.find((b) => b.symbol === t.symbol)?.balance || "0");
          const p = prices[t.symbol];
          const change = p?.change24h ?? 0;
          return (
            <div key={t.symbol} className="flex items-center gap-3">
              <img src={t.logo} alt={t.name} className="w-9 h-9 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.address ? (p ? <span className="font-semibold text-foreground">{formatPrice(p.priceUsd)}</span> : "Đang tải giá…") : "Sắp ra mắt"}
                  {p && (
                    <span className={change >= 0 ? "text-primary ml-2" : "text-destructive ml-2"}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{formatBalance(String(bal))} {t.symbol}</p>
                <p className="text-xs text-muted-foreground">{p ? formatUsd(bal * p.priceUsd) : "—"}</p>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-sm">
            Thưởng chờ nhận: <b>{sumPendingRewards(rewards).toLocaleString("en-US")}</b>
            {rewards.some((r) => r.status === "claim_requested") && (
              <span className="text-xs text-muted-foreground ml-1">(có yêu cầu đang xử lý)</span>
            )}
          </p>
          <Button size="sm" onClick={claimAll} disabled={claiming || pending.length === 0}>
            {claiming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Gift className="w-4 h-4 mr-1" />}
            Nhận thưởng
          </Button>
        </div>
      </CardContent>
      {address && <FunMoneyDialog open={funOpen} onOpenChange={setFunOpen} address={address} onChanged={loadFun} />}
    </Card>
  );
};
