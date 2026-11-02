import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isValidBtcAddress } from "@/lib/bitcoin";
import type { BtcChoice } from "@/lib/btcChoice";

interface BtcWalletChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownAddress: string | null;
  choice: BtcChoice | null;
  onChoose: (choice: BtcChoice | null) => Promise<void>;
}

const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-8)}`;

/** Switch the Bitcoin card between the FUN wallet's own BTC address and another BTC wallet (watch-only). */
export const BtcWalletChoiceDialog = ({ open, onOpenChange, ownAddress, choice, onChoose }: BtcWalletChoiceDialogProps) => {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setAddress(choice?.address ?? ""); setLabel(choice?.label ?? ""); }
  }, [open, choice]);

  const trimmed = address.trim();
  const valid = isValidBtcAddress(trimmed);
  const save = async (next: BtcChoice | null) => {
    setBusy(true);
    try {
      await onChoose(next);
      toast({ title: next ? "Đã đổi ví BTC" : "Đã dùng ví BTC mặc định" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Chưa lưu xong", description: e instanceof Error ? e.message : "Thử lại sau", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/tokens/btc.svg" alt="" className="w-6 h-6" /> Đổi ví BTC
          </DialogTitle>
          <DialogDescription>Chọn ví Bitcoin hiển thị trên thẻ BTC. Lựa chọn được lưu theo tài khoản, dùng chung cho máy tính và điện thoại.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            disabled={busy || !choice}
            onClick={() => void save(null)}
            className={`w-full rounded-xl border p-3 text-left ${!choice ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
          >
            <p className="flex items-center gap-2 font-semibold">
              Ví BTC mặc định của FUN Wallet {!choice && <Check className="h-4 w-4 text-primary" />}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{ownAddress ? short(ownAddress) : "Mở khóa ví để tạo địa chỉ"}</p>
            <p className="text-xs text-muted-foreground mt-1">Gửi, nhận và đổi BTC ngay trong FUN Wallet.</p>
          </button>

          <div className={`space-y-3 rounded-xl border p-3 ${choice ? "border-primary bg-primary/10" : ""}`}>
            <p className="flex items-center gap-2 font-semibold">
              Ví BTC khác {choice && <Check className="h-4 w-4 text-primary" />}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="btc-choice-address">Địa chỉ Bitcoin (bc1…, 1…, 3…)</Label>
              <Input id="btc-choice-address" className="font-mono text-xs" placeholder="bc1q…" value={address} onChange={e => setAddress(e.target.value)} />
              {trimmed && !valid && <p className="text-xs text-destructive">Địa chỉ BTC không hợp lệ (chỉ nhận mạng Bitcoin chính)</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="btc-choice-label">Tên gợi nhớ (không bắt buộc)</Label>
              <Input id="btc-choice-label" maxLength={40} placeholder="Ví BTC MetaMask" value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Chỉ xem số dư, nhận BTC và xem lịch sử. Muốn gửi BTC từ ví này, dùng ứng dụng đang giữ khóa của nó. Chỉ dán địa chỉ, không bao giờ dán cụm từ khôi phục.
            </p>
            <Button className="w-full" disabled={busy || !valid || trimmed === ownAddress} onClick={() => void save({ address: trimmed, label: label.trim() })}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Dùng ví BTC này
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
