import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, XCircle, Loader2, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { isValidAddress } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (address: string) => void;
}

export const QRScannerDialog = ({
  open,
  onOpenChange,
  onScan,
}: QRScannerDialogProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!scannerContainerRef.current) return;
    
    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract address from QR (could be just address or ethereum: prefix)
          let address = decodedText;
          if (decodedText.startsWith("ethereum:")) {
            address = decodedText.replace("ethereum:", "").split("@")[0].split("?")[0];
          }

          if (isValidAddress(address)) {
            stopScanner();
            onScan(address);
            onOpenChange(false);
            toast({
              title: "✅ Địa chỉ đã nhận",
              description: `${address.slice(0, 10)}...${address.slice(-8)}`,
            });
          } else {
            setError("QR code không chứa địa chỉ ví hợp lệ");
          }
        },
        () => {
          // Ignore scan failures (no QR in frame)
        }
      );
    } catch (err) {
      console.error("QR Scanner error:", err);
      setError("Không thể truy cập camera. Vui lòng cấp quyền camera.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) stopScanner();
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Quét mã QR
          </DialogTitle>
          <DialogDescription>
            Đưa camera vào mã QR chứa địa chỉ ví
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          <div 
            ref={scannerContainerRef}
            className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden"
          >
            <div id="qr-reader" className="w-full h-full" />
            
            {!scanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Camera className="w-16 h-16 text-muted-foreground/50" />
                <Button onClick={startScanner}>
                  <Camera className="w-4 h-4 mr-2" />
                  Bắt đầu quét
                </Button>
              </div>
            )}

            {scanning && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Đang quét...</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={startScanner}
                >
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Hỗ trợ các định dạng:</p>
            <p className="font-mono text-xs mt-1">
              0x... | ethereum:0x...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
