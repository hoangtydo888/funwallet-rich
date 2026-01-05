import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Share2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatAddress } from "@/lib/wallet";

interface ReceiveCryptoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}

export const ReceiveCryptoDialog = ({
  open,
  onOpenChange,
  walletAddress,
}: ReceiveCryptoDialogProps) => {
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Đã sao chép ❤️",
      description: "Địa chỉ ví đã được sao chép",
    });
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Địa chỉ ví FUN Wallet",
          text: `Địa chỉ ví BNB Chain của tôi: ${walletAddress}`,
        });
      } catch {
        copyAddress();
      }
    } else {
      copyAddress();
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("wallet-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `fun-wallet-${formatAddress(walletAddress)}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // Token logos to display - thứ tự ưu tiên: CAMLY, BTCB, USDT, BNB
  const supportedTokens = [
    { symbol: "CAMLY", logo: "/tokens/camly.png" },
    { symbol: "BTCB", logo: "/tokens/btc.svg" },
    { symbol: "USDT", logo: "/tokens/usdt.svg" },
    { symbol: "BNB", logo: "/tokens/bnb.png" },
    { symbol: "USDC", logo: "/tokens/usdc.svg" },
    { symbol: "ETH", logo: "/tokens/eth.svg" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00FF7F]" />
            Nhận Phước Lành ❤️
          </DialogTitle>
          <DialogDescription>
            Quét mã QR hoặc sao chép địa chỉ để nhận CAMLY và tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Friendly message */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#00FF7F]/20 to-[#00BFFF]/20 border border-[#00FF7F]/30 text-center">
            <p className="text-sm font-medium rainbow-text">
              🌈 Chia sẻ địa chỉ này để nhận phước lành CAMLY!
            </p>
          </div>

          {/* Supported tokens display */}
          <div className="flex justify-center gap-2">
            {supportedTokens.map((token) => (
              <div 
                key={token.symbol}
                className="w-10 h-10 rounded-full overflow-hidden bg-muted/50 p-0.5 border-2 border-[#00FF7F]/30 hover:scale-110 transition-transform"
                title={token.symbol}
              >
                <img 
                  src={token.logo} 
                  alt={token.symbol}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-muted-foreground/30">
              +13
            </div>
          </div>

          {/* QR Code with rainbow glow */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl glow-rainbow shadow-lg">
              <QRCodeSVG
                id="wallet-qr-code"
                value={walletAddress}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Network badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF7F]/10 text-[#00AA55] text-sm font-medium border border-[#00FF7F]/30">
              <span className="w-2 h-2 rounded-full bg-[#00FF7F] animate-pulse" />
              BNB Smart Chain
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Địa chỉ ví của bạn</p>
            <div className="p-3 rounded-xl bg-muted font-mono text-sm text-center break-all border-2 border-primary/20">
              {walletAddress}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-sm">
            <p className="font-semibold mb-1 text-warning">⚠️ Chú ý:</p>
            <p className="text-xs text-muted-foreground">
              Chỉ gửi BNB hoặc tokens BEP-20 đến địa chỉ này. Gửi tài sản từ blockchain khác có thể
              dẫn đến mất mát vĩnh viễn.
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              onClick={copyAddress} 
              className="flex-col h-auto py-3 border-2 border-[#00FF7F]/30 hover:bg-[#00FF7F]/10"
            >
              <Copy className="h-5 w-5 mb-1 text-[#00FF7F]" />
              <span className="text-xs">Sao chép</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadQR} 
              className="flex-col h-auto py-3 border-2 border-[#00BFFF]/30 hover:bg-[#00BFFF]/10"
            >
              <Download className="h-5 w-5 mb-1 text-[#00BFFF]" />
              <span className="text-xs">Tải QR</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={shareAddress} 
              className="flex-col h-auto py-3 border-2 border-[#FF00FF]/30 hover:bg-[#FF00FF]/10"
            >
              <Share2 className="h-5 w-5 mb-1 text-[#FF00FF]" />
              <span className="text-xs">Chia sẻ</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};