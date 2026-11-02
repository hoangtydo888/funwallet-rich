import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Copy, ExternalLink, Loader2, Lock, Pencil, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBitcoin } from "@/hooks/useBitcoin";
import { BTC_EXPLORER, formatBtc } from "@/lib/bitcoin";
import { BtcReceiveDialog } from "./BtcReceiveDialog";
import { BtcSendDialog } from "./BtcSendDialog";
import { BtcWalletChoiceDialog } from "./BtcWalletChoiceDialog";

interface BitcoinCardProps {
  walletAddress: string;
  getPrivateKey: (address: string) => string | null;
  onUnlock: () => void;
  onSwap: () => void;
}

/** Native Bitcoin balance with receive, send and swap entry points. */
export const BitcoinCard = ({ walletAddress, getPrivateKey, onUnlock, onSwap }: BitcoinCardProps) => {
  const { address, ownAddress, choice, chooseBtc, balance, priceUsd, loading, error, refresh } = useBitcoin(walletAddress, getPrivateKey, true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const total = balance ? balance.confirmed + balance.unconfirmed : null;
  const unlocked = !!getPrivateKey(walletAddress);

  if (!address) {
    return (
      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 mb-4 flex items-center gap-3">
        <img src="/tokens/btc.svg" alt="BTC" className="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Bitcoin (BTC)</p>
          <p className="text-sm text-muted-foreground">Mở khóa ví để tạo địa chỉ Bitcoin của bạn.</p>
        </div>
        <Button size="sm" onClick={onUnlock}><Lock className="h-4 w-4 mr-1" /> Mở khóa</Button>
      </div>
    );
  }

  const copy = () => { navigator.clipboard.writeText(address); toast({ title: "Đã sao chép địa chỉ BTC" }); };
  const needUnlock = (action: () => void) => () => (unlocked ? action() : onUnlock());

  return (
    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 mb-4 space-y-3">
      <div className="flex items-center gap-3">
        <img src="/tokens/btc.svg" alt="BTC" className="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold flex items-center gap-1 flex-wrap">
            Bitcoin <span className="text-xs text-muted-foreground font-normal">· Mạng Bitcoin</span>
            {choice && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-700">{choice.label || "Ví BTC khác"} · chỉ xem</span>}
            <button onClick={() => setChoiceOpen(true)} className="ml-1 inline-flex items-center gap-0.5 text-xs font-normal text-primary hover:underline">
              <Pencil className="h-3 w-3" /> Đổi ví BTC
            </button>
          </p>
          <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground">
            {address.slice(0, 10)}…{address.slice(-8)} <Copy className="h-3 w-3" />
          </button>
        </div>
        <div className="text-right">
          <p className="font-semibold">{total === null ? "…" : formatBtc(total)} BTC</p>
          <p className="text-xs text-muted-foreground">{total !== null && priceUsd ? `≈ $${(Number(total) / 1e8 * priceUsd).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : ""}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={loading} aria-label="Làm mới số dư BTC">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      {balance && balance.unconfirmed !== 0n && <p className="text-xs text-muted-foreground">Đang chờ xác nhận: {formatBtc(balance.unconfirmed)} BTC</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {choice && <p className="text-xs text-muted-foreground">Đang xem ví BTC khác. Gửi và đổi BTC dùng ví BTC mặc định của FUN Wallet; bấm "Đổi ví BTC" để quay lại.</p>}
      <div className={`grid gap-2 ${choice ? "grid-cols-2" : "grid-cols-4"}`}>
        <Button variant="outline" size="sm" onClick={() => setReceiveOpen(true)}><ArrowDownLeft className="h-4 w-4 mr-1" /> Nhận</Button>
        {!choice && <Button variant="outline" size="sm" onClick={needUnlock(() => setSendOpen(true))}><ArrowUpRight className="h-4 w-4 mr-1" /> Gửi</Button>}
        {!choice && <Button variant="outline" size="sm" onClick={needUnlock(onSwap)}><ArrowLeftRight className="h-4 w-4 mr-1" /> Đổi</Button>}
        <Button variant="outline" size="sm" asChild>
          <a href={`${BTC_EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Lịch sử</a>
        </Button>
      </div>
      <BtcWalletChoiceDialog open={choiceOpen} onOpenChange={setChoiceOpen} ownAddress={ownAddress} choice={choice} onChoose={chooseBtc} />
      <BtcReceiveDialog open={receiveOpen} onOpenChange={setReceiveOpen} address={address} />
      <BtcSendDialog open={sendOpen} onOpenChange={setSendOpen} walletAddress={walletAddress} btcAddress={address} balance={balance}
        priceUsd={priceUsd} getPrivateKey={getPrivateKey} onSuccess={() => void refresh()} />
    </div>
  );
};
