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
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Check, 
  Trash2, 
  Edit2, 
  Star, 
  AlertTriangle,
  Key,
  QrCode
} from "lucide-react";
import { formatAddress } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QRCodeSVG } from "qrcode.react";

interface WalletData {
  id: string;
  name: string;
  address: string;
  chain: string;
  is_primary: boolean;
}

interface WalletManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: WalletData[];
  activeWallet: WalletData | null;
  onSelectWallet: (wallet: WalletData) => void;
  onDeleteWallet: (walletId: string) => Promise<boolean>;
  onSetPrimary: (walletId: string) => Promise<boolean>;
  onRenameWallet: (walletId: string, newName: string) => Promise<boolean>;
  getPrivateKey: (address: string) => string | null;
}

export const WalletManagerDialog = ({
  open,
  onOpenChange,
  wallets,
  activeWallet,
  onSelectWallet,
  onDeleteWallet,
  onSetPrimary,
  onRenameWallet,
  getPrivateKey,
}: WalletManagerDialogProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRForWallet, setShowQRForWallet] = useState<string | null>(null);

  const qrPrivateKey = showQRForWallet ? getPrivateKey(showQRForWallet) : null;

  const handleSelect = (wallet: WalletData) => {
    onSelectWallet(wallet);
    onOpenChange(false);
    toast({
      title: "Đã chọn ví",
      description: `Đang sử dụng ${wallet.name}`,
    });
  };

  const handleStartEdit = (wallet: WalletData) => {
    setEditingId(wallet.id);
    setEditName(wallet.name);
  };

  const handleSaveEdit = async (walletId: string) => {
    if (!editName.trim()) {
      toast({
        title: "Lỗi",
        description: "Tên ví không được để trống",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const success = await onRenameWallet(walletId, editName.trim());
    setLoading(false);

    if (success) {
      toast({
        title: "Thành công",
        description: "Đã đổi tên ví",
      });
      setEditingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setLoading(true);
    const success = await onDeleteWallet(deleteConfirmId);
    setLoading(false);
    setDeleteConfirmId(null);

    if (success) {
      toast({
        title: "Đã xóa ví",
        description: "Ví đã được xóa khỏi tài khoản",
      });
    }
  };

  const handleSetPrimary = async (walletId: string) => {
    setLoading(true);
    const success = await onSetPrimary(walletId);
    setLoading(false);

    if (success) {
      toast({
        title: "Thành công",
        description: "Đã đặt làm ví chính",
      });
    }
  };

  const handleCopyPrivateKey = async (address: string) => {
    const privateKey = getPrivateKey(address);
    if (!privateKey) {
      toast({
        title: "Không tìm thấy Private Key",
        description: "Private key không được lưu trên thiết bị này. Hãy import lại ví bằng seed phrase.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(privateKey);
      toast({
        title: "Đã copy Private Key! 🔑",
        description: "Hãy giữ bí mật - không chia sẻ với ai!",
      });
    } catch {
      toast({
        title: "Lỗi",
        description: "Không thể copy. Hãy thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleShowQR = (address: string) => {
    const privateKey = getPrivateKey(address);
    if (!privateKey) {
      toast({
        title: "Không tìm thấy Private Key",
        description: "Private key không được lưu trên thiết bị này.",
        variant: "destructive",
      });
      return;
    }
    setShowQRForWallet(address);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Quản lý ví
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có ví nào</p>
              </div>
            ) : (
              wallets.map((wallet) => {
                const hasPrivateKey = !!getPrivateKey(wallet.address);
                
                return (
                  <div
                    key={wallet.id}
                    className={`p-4 rounded-xl border transition-all ${
                      activeWallet?.id === wallet.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center cursor-pointer"
                        onClick={() => handleSelect(wallet)}
                      >
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingId === wallet.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(wallet.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSaveEdit(wallet.id)}
                              disabled={loading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer"
                            onClick={() => handleSelect(wallet)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{wallet.name}</p>
                              {wallet.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Chính
                                </Badge>
                              )}
                              {activeWallet?.id === wallet.id && (
                                <Badge className="text-xs bg-green-500/20 text-green-500">
                                  Đang dùng
                                </Badge>
                              )}
                              {!hasPrivateKey && (
                                <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Chưa import
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {formatAddress(wallet.address, 8)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {hasPrivateKey && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                            onClick={() => handleShowQR(wallet.address)}
                            disabled={loading}
                            title="Hiện QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                          onClick={() => handleCopyPrivateKey(wallet.address)}
                          disabled={loading}
                          title="Copy Private Key"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(wallet)}
                          disabled={loading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!wallet.is_primary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetPrimary(wallet.id)}
                            disabled={loading}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(wallet.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!showQRForWallet} onOpenChange={() => setShowQRForWallet(null)}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-500" />
              QR Code Private Key
            </DialogTitle>
            <DialogDescription>
              Scan mã này từ thiết bị khác để import ví. <span className="text-destructive font-medium">KHÔNG chia sẻ với ai!</span>
            </DialogDescription>
          </DialogHeader>
          {qrPrivateKey && (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrPrivateKey} size={200} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                ⚠️ Chỉ scan trong môi trường an toàn
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Xác nhận xóa ví
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa ví này? Hành động này không thể hoàn tác.
              <br />
              <span className="text-destructive font-medium">
                Lưu ý: Hãy đảm bảo bạn đã sao lưu private key trước khi xóa!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa ví
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
