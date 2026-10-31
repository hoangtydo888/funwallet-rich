import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { useBitcoin } from "@/hooks/useBitcoin";
import { useAssetBalances } from "@/hooks/useMarketTrade";
import { supabase } from "@/integrations/supabase/client";
import { UnlockWalletDialog } from "@/components/wallet/UnlockWalletDialog";
import { ConvertPanel, type TradeContext } from "@/components/trading/ConvertPanel";
import { SpotPanel } from "@/components/trading/SpotPanel";
import BottomNav from "@/components/layout/BottomNav";

type Tab = "convert" | "spot";
interface RecentOrder { id: string; tx_hash: string; amount: string; token_symbol: string; status: string; created_at: string; from_address: string }

/** Real market trading from the user's own wallet, laid out like Binance:
 * "Mua/Bán" (instant convert) and "Giao ngay" (spot market orders). */
const Trading = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeWallet, getPrivateKey, loading: walletLoading } = useWallet();
  const { isUnlocked, unlock, failedAttempts, isLocked, lockoutEndTime } = useSecureWallet();
  const [tab, setTab] = useState<Tab>("spot");
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const evmAddress = activeWallet?.address;
  const btc = useBitcoin(evmAddress, getPrivateKey);
  const { balances, refresh } = useAssetBalances(evmAddress, btc.balance);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  const loadRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions").select("id,tx_hash,amount,token_symbol,status,created_at,from_address")
      .eq("user_id", user.id).eq("tx_type", "swap").order("created_at", { ascending: false }).limit(5);
    setRecent((data as RecentOrder[] | null) ?? []);
  }, [user]);
  useEffect(() => { void loadRecent(); }, [loadRecent]);

  if (authLoading || walletLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const ctx: TradeContext | null = evmAddress ? {
    evmAddress,
    btcAddress: btc.address,
    balances,
    unlocked: isUnlocked && !!getPrivateKey(evmAddress),
    onUnlock: () => setUnlockOpen(true),
    getPrivateKey: () => getPrivateKey(evmAddress),
    onTraded: () => { void refresh(); void btc.refresh(); void loadRecent(); },
  } : null;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 pt-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></Button>
          {([["convert", "Mua/Bán"], ["spot", "Giao ngay"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`px-2 pb-3 pt-2 text-lg font-bold border-b-2 transition ${tab === key ? "border-yellow-400 text-foreground" : "border-transparent text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {!ctx ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">Bạn chưa có ví. Tạo hoặc nhập ví để giao dịch.</p>
            <Button onClick={() => navigate("/dashboard")}>Về trang ví</Button>
          </div>
        ) : (
          <>
            {tab === "convert" ? (
              <>
                <p className="text-sm font-medium">Tức thì <span className="text-muted-foreground font-normal">· đổi theo giá thị trường</span></p>
                <ConvertPanel ctx={ctx} />
              </>
            ) : <SpotPanel ctx={ctx} />}

            <section className="space-y-2">
              <h2 className="font-semibold border-b-2 border-yellow-400 inline-block pb-1">Lệnh gần đây</h2>
              {recent.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Chưa có lệnh nào</p> : (
                <div className="divide-y divide-border">
                  {recent.map(r => {
                    const btcTx = r.token_symbol === "BTC" && !r.from_address.startsWith("0x");
                    return (
                      <a key={r.id} href={btcTx ? `https://mempool.space/tx/${r.tx_hash}` : `https://bscscan.com/tx/${r.tx_hash}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/40 rounded px-1">
                        <span>Đổi <b>{r.amount} {r.token_symbol}</b></span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <UnlockWalletDialog open={unlockOpen} onOpenChange={setUnlockOpen} onUnlock={unlock} failedAttempts={failedAttempts} isLocked={isLocked} lockoutEndTime={lockoutEndTime} />
      <BottomNav />
    </div>
  );
};

export default Trading;
