import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isValidAddress, BSC_MAINNET } from "@/lib/wallet";

interface ImportNFTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    contractAddress: string,
    tokenId: string
  ) => Promise<{ name?: string; image_url?: string } | null>;
  walletAddress: string;
}

export const ImportNFTDialog = ({
  open,
  onOpenChange,
  onImport,
  walletAddress,
}: ImportNFTDialogProps) => {
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    name?: string;
    image_url?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    setError("");
    setPreview(null);

    if (!isValidAddress(contractAddress)) {
      setError("Địa chỉ contract không hợp lệ");
      return;
    }

    if (!tokenId || isNaN(parseInt(tokenId))) {
      setError("Token ID không hợp lệ");
      return;
    }

    setLoading(true);
    const metadata = await onImport(contractAddress, tokenId);
    setLoading(false);

    if (metadata) {
      setPreview(metadata);
    } else {
      setError("Không thể lấy thông tin NFT. Kiểm tra lại địa chỉ và Token ID.");
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    const result = await onImport(contractAddress, tokenId);
    setLoading(false);

    if (result) {
      toast({
        title: "Import thành công! 🎉",
        description: `Đã thêm ${result.name || "NFT"} vào bộ sưu tập`,
      });
      onOpenChange(false);
      resetForm();
    } else {
      toast({
        title: "Import thất bại",
        description: "Vui lòng thử lại",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setContractAddress("");
    setTokenId("");
    setPreview(null);
    setError("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Import NFT
          </DialogTitle>
          <DialogDescription>
            Nhập địa chỉ contract và Token ID để thêm NFT vào bộ sưu tập
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="contract">Contract Address</Label>
            <Input
              id="contract"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="font-mono text-sm"
            />
            {contractAddress && isValidAddress(contractAddress) && (
              <a
                href={`${BSC_MAINNET.explorer}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                Xem trên BscScan <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div>
            <Label htmlFor="tokenId">Token ID</Label>
            <Input
              id="tokenId"
              placeholder="1"
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Xem trước</p>
              <div className="flex items-center gap-4">
                {preview.image_url ? (
                  <img
                    src={preview.image_url}
                    alt={preview.name || "NFT"}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{preview.name || `NFT #${tokenId}`}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {contractAddress.slice(0, 12)}...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!preview ? (
              <Button
                className="flex-1"
                onClick={handlePreview}
                disabled={loading || !contractAddress || !tokenId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải...
                  </>
                ) : (
                  "Xem trước"
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={resetForm}>
                  Đặt lại
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  onClick={handleImport}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Import NFT"
                  )}
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
