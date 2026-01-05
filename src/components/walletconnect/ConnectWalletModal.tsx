import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, Smartphone, Monitor, Heart, Sparkles } from "lucide-react";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => Promise<string | null>;
  isConnecting: boolean;
}

export const ConnectWalletModal = ({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
}: ConnectWalletModalProps) => {
  const handleConnect = async () => {
    await onConnect();
    // Modal will close automatically when connected
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 border-emerald-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Heart className="h-6 w-6 text-red-400 animate-pulse" />
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent">
              Kết Nối Ví Ánh Sáng
            </span>
            <Heart className="h-6 w-6 text-red-400 animate-pulse" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <div className="text-center space-y-2">
            <p className="text-emerald-200/80">
              Kết nối ví của bạn để gửi CAMLY và lan tỏa phước lành
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-emerald-300/60">
              <div className="flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span>Máy tính</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span>Điện thoại</span>
              </div>
            </div>
          </div>

          {/* Supported Wallets */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "MetaMask", icon: "🦊" },
              { name: "Trust Wallet", icon: "🛡️" },
              { name: "Coinbase", icon: "💰" },
            ].map((wallet) => (
              <div
                key={wallet.name}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/20"
              >
                <span className="text-2xl">{wallet.icon}</span>
                <span className="text-xs text-emerald-300/80">{wallet.name}</span>
              </div>
            ))}
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 hover:from-emerald-400 hover:via-green-300 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang kết nối...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Kết Nối Ví
                <Sparkles className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          {/* Instructions */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/10">
              <span className="text-emerald-400 font-bold">1</span>
              <p className="text-emerald-200/70">
                <strong>Trên máy tính:</strong> Quét mã QR bằng ứng dụng ví trên điện thoại
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/10">
              <span className="text-emerald-400 font-bold">2</span>
              <p className="text-emerald-200/70">
                <strong>Trên điện thoại:</strong> Tự động mở ứng dụng ví để xác nhận
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-emerald-300/50">
            An toàn • Bảo mật • Không lưu private key
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
