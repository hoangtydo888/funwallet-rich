import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Eye,
  EyeOff,
  Copy
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
  const [showPrivateKeyFor, setShowPrivateKeyFor] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const handleShowPrivateKey = (wallet: WalletData) => {
    const pk = getPrivateKey(wallet.address);
    if (pk) {
      setShowPrivateKeyFor(wallet.id);
      setRevealedKey(pk);
    } else {
      toast({
        title: "Không tìm thấy Private Key",
        description: "Private key không có trên thiết bị này. Hãy import ví bằng seed phrase hoặc private key.",
        variant: "destructive",
      });
    }
  };

  const handleCopyPrivateKey = (wallet: WalletData) => {
    const pk = getPrivateKey(wallet.address);
    if (pk) {
      navigator.clipboard.writeText(pk);
      toast({
        title: "Đã copy Private Key!",
        description: "Dùng key này để import ví trên thiết bị khác.",
      });
    } else {
      toast({
        title: "Không tìm thấy Private Key",
        description: "Private key không có trên thiết bị này.",
        variant: "destructive",
      });
    }
  };

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
              wallets.map((wallet) => (
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
                          <div className="flex items-center gap-2">
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
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {formatAddress(wallet.address, 8)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-400"
                        onClick={() => handleCopyPrivateKey(wallet)}
                        title="Copy Private Key"
                        disabled={loading}
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

                    {/* Show Private Key Section */}
                    {showPrivateKeyFor === wallet.id && revealedKey && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            Private Key
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(revealedKey);
                                toast({ title: "Đã copy!" });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setShowPrivateKeyFor(null);
                                setRevealedKey(null);
                              }}
                            >
                              <EyeOff className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs font-mono break-all text-muted-foreground">
                          {revealedKey}
                        </p>
                        <p className="text-xs text-destructive mt-2">
                          ⚠️ Không chia sẻ key này với bất kỳ ai!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
