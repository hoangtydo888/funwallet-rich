import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { decimalIsPositive } from "@/lib/tokenAmounts";
import {
  BTC_EXPLORER, broadcastBtcTx, btcAccount, buildBtcSend, formatBtc, getBtcFeeRates, getBtcUtxos, isValidBtcAddress, parseBtc,
  type BtcBalance, type BtcFeeRates, type SignedBtcTx,
} from "@/lib/bitcoin";

type Speed = keyof BtcFeeRates;
const SPEEDS: { key: Speed; label: string; eta: string }[] = [
  { key: "minimum", label: "Thấp nhất", eta: "Có thể chờ vài giờ đến vài ngày" },
  { key: "economy", label: "Tiết kiệm", eta: "Thường trong vài giờ" },
  { key: "normal", label: "Thường", eta: "Khoảng 1 giờ" },
  { key: "fast", label: "Nhanh", eta: "Khoảng 10–30 phút" },
];

interface BtcSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  btcAddress: string;
  balance: BtcBalance | null;
  priceUsd: number | null;
  getPrivateKey: (address: string) => string | null;
  onSuccess: () => void;
}

export const BtcSendDialog = ({ open, onOpenChange, walletAddress, btcAddress, balance, priceUsd, getPrivateKey, onSuccess }: BtcSendDialogProps) => {
  const { user } = useAuth();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [max, setMax] = useState(false);
  const [rates, setRates] = useState<BtcFeeRates | null>(null);
  const [speed, setSpeed] = useState<Speed>("economy");
  const [preview, setPreview] = useState<SignedBtcTx | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [txid, setTxid] = useState("");

  useEffect(() => {
    if (!open) return;
    setTo(""); setAmount(""); setMax(false); setPreview(null); setConfirmed(false); setTxid(""); setSpeed("economy");
    getBtcFeeRates().then(setRates).catch(() => toast({ title: "Không lấy được phí mạng Bitcoin", variant: "destructive" }));
  }, [open]);

  const usd = (sats: bigint) => (priceUsd ? ` ≈ $${(Number(sats) / 1e8 * priceUsd).toFixed(2)}` : "");
  const reset = () => { setPreview(null); setConfirmed(false); };

  const handlePreview = async () => {
    if (!isValidBtcAddress(to)) { toast({ title: "Địa chỉ BTC không hợp lệ", description: "Cần địa chỉ mạng Bitcoin bắt đầu bằng bc1, 1 hoặc 3", variant: "destructive" }); return; }
    if (to === btcAddress) { toast({ title: "Đây là địa chỉ của chính ví này", variant: "destructive" }); return; }
    if (!max && !decimalIsPositive(amount)) { toast({ title: "Nhập số BTC cần gửi", variant: "destructive" }); return; }
    if (!rates) return;
    const key = getPrivateKey(walletAddress);
    if (!key || btcAccount(key).address !== btcAddress) { toast({ title: "Ví đang khóa", description: "Mở khóa ví rồi thử lại", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const utxos = await getBtcUtxos(btcAddress);
      setPreview(buildBtcSend({ privateKey: key, to, amount: max ? "max" : parseBtc(amount), feeRate: rates[speed], utxos }));
    } catch (e) {
      toast({ title: "Chưa tạo được giao dịch", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleSend = async () => {
    if (!preview || !confirmed) return;
    setBusy(true);
    try {
      const id = await broadcastBtcTx(preview.hex);
      setTxid(id);
      if (user) await supabase.from("transactions").insert({ user_id: user.id, tx_hash: id, from_address: btcAddress, to_address: to, amount: formatBtc(preview.amount), token_symbol: "BTC", status: "pending", tx_type: "send" });
      toast({ title: "Đã gửi BTC", description: "Giao dịch đang chờ thợ đào xác nhận" });
      onSuccess();
    } catch (e) {
      toast({ title: "Gửi BTC thất bại", description: e instanceof Error ? e.message : "Lỗi không xác định", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><img src="/tokens/btc.svg" alt="" className="w-6 h-6" /> Gửi Bitcoin</DialogTitle>
          <DialogDescription>Gửi BTC qua mạng Bitcoin. Giao dịch không thể hoàn tác.</DialogDescription>
        </DialogHeader>

        {txid ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">Đã gửi {preview && formatBtc(preview.amount)} BTC. Thường mất 10 phút đến vài giờ tùy mức phí.</p>
            <a href={`${BTC_EXPLORER}/tx/${txid}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
              Theo dõi trên mempool.space <ExternalLink className="h-3 w-3" />
            </a>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Xong</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Địa chỉ nhận (mạng Bitcoin)</Label>
              <Input value={to} onChange={e => { setTo(e.target.value.trim()); reset(); }} placeholder="bc1…" className="font-mono" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Số lượng</Label>
                <span className="text-muted-foreground">Khả dụng: {balance ? formatBtc(balance.confirmed) : "…"} BTC</span>
              </div>
              <div className="flex gap-2">
                <Input value={max ? "Tối đa" : amount} disabled={max} inputMode="decimal" placeholder="0.0001" onChange={e => { setAmount(e.target.value.replace(",", ".")); reset(); }} />
                <Button variant={max ? "default" : "outline"} onClick={() => { setMax(!max); reset(); }}>Tối đa</Button>
              </div>
              {balance && balance.unconfirmed !== 0n && <p className="text-xs text-muted-foreground">{formatBtc(balance.unconfirmed)} BTC đang chờ xác nhận, chưa gửi được.</p>}
            </div>
            <div className="space-y-2">
              <Label>Phí mạng</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPEEDS.map(s => (
                  <button key={s.key} type="button" onClick={() => { setSpeed(s.key); reset(); }}
                    className={`rounded-xl border p-2 text-left text-sm transition ${speed === s.key ? "border-primary bg-primary/10" : "border-border"}`}>
                    <div className="font-semibold">{s.label}{rates && <span className="font-normal text-muted-foreground"> · {rates[s.key]} sat/vB</span>}</div>
                    <div className="text-xs text-muted-foreground">{s.eta}</div>
                  </button>
                ))}
              </div>
            </div>

            {preview && (
              <div className="space-y-1 p-3 rounded-lg bg-muted/40 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gửi</span><span>{formatBtc(preview.amount)} BTC{usd(preview.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phí mạng</span><span>{formatBtc(preview.fee)} BTC{usd(preview.fee)}</span></div>
                <div className="flex justify-between font-semibold"><span>Tổng trừ</span><span>{formatBtc(preview.amount + preview.fee)} BTC</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tới</span><span className="font-mono text-xs">{to.slice(0, 10)}…{to.slice(-8)}</span></div>
                <label className="flex items-start gap-2 pt-2 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                  <span className="text-xs">Tôi đã kiểm tra địa chỉ nhận là địa chỉ mạng Bitcoin và số tiền. Giao dịch không thể hoàn tác.</span>
                </label>
              </div>
            )}

            {preview ? (
              <Button className="w-full" disabled={!confirmed || busy} onClick={handleSend}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gửi BTC"}
              </Button>
            ) : (
              <Button className="w-full" disabled={busy || !rates} onClick={handlePreview}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xem trước giao dịch"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
