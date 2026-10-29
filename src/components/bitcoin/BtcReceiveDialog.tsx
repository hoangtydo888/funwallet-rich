import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BtcReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
}

export const BtcReceiveDialog = ({ open, onOpenChange, address }: BtcReceiveDialogProps) => {
  const copy = () => {
    navigator.clipboard.writeText(address);
    toast({ title: "Đã sao chép", description: "Địa chỉ BTC đã được sao chép" });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/tokens/btc.svg" alt="" className="w-6 h-6" /> Nhận Bitcoin
          </DialogTitle>
          <DialogDescription>Quét mã hoặc sao chép địa chỉ để nhận BTC qua mạng Bitcoin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG value={`bitcoin:${address}`} size={200} level="H" bgColor="#ffffff" fgColor="#000000" />
            </div>
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> Mạng Bitcoin (BTC)
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted font-mono text-sm text-center break-all">{address}</div>
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            <p className="font-semibold mb-1">⚠️ Chú ý</p>
            Chỉ gửi <b>BTC qua mạng Bitcoin</b> tới địa chỉ này. Khi rút từ sàn (Binance…), chọn mạng <b>BTC / Bitcoin</b>, không chọn BEP20, ERC20 hay Lightning.
          </div>
          <Button onClick={copy} className="w-full"><Copy className="h-4 w-4 mr-2" /> Sao chép địa chỉ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
