import { useSecureWallet } from "@/hooks/useSecureWallet";
import { SetupPasswordDialog } from "./SetupPasswordDialog";
import { useState, useEffect } from "react";
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
  QrCode,
  KeyRound,
  Eye,
  EyeOff
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
  onLinkPrivateKey: (walletAddress: string, privateKey: string) => Promise<boolean>;
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
  onLinkPrivateKey,
}: WalletManagerDialogProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRForWallet, setShowQRForWallet] = useState<string | null>(null);
  
  // Import key states
  const [importKeyForWallet, setImportKeyForWallet] = useState<string | null>(null);
  const [inputPrivateKey, setInputPrivateKey] = useState("");
  const [showInputKey, setShowInputKey] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const security = useSecureWallet();
  const [exportRequest,setExportRequest] = useState<{address:string;kind:'copy'|'qr'}|null>(null);
  const [qrKey,setQrKey] = useState<string|null>(null);
  const qrPrivateKey = security.isUnlocked ? qrKey : null;
  useEffect(() => { if (!open || !security.isUnlocked) { setQrKey(null); setShowQRForWallet(null); setExportRequest(null); } }, [open,security.isUnlocked]);
  useEffect(() => { if (!qrKey) return; const timer=setTimeout(()=>{setQrKey(null);setShowQRForWallet(null);},60000); return ()=>clearTimeout(timer); },[qrKey]);
  useEffect(()=>{const hide=()=>{if(document.hidden){setQrKey(null);setShowQRForWallet(null);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  const exportWithPassword = async (password:string) => {
    if (!exportRequest) return;
    const key=await security.getDecryptedKey(exportRequest.address,password);
    if (!key) throw Error('Không xác minh được mật khẩu/khóa ví');
    if (exportRequest.kind==='copy') {
      await navigator.clipboard.writeText(key);
      toast({title:'Đã sao chép khóa riêng',description:'Không dán khóa vào website hoặc gửi cho người khác. Xóa clipboard khi dùng xong.'});
    } else { setQrKey(key);setShowQRForWallet(exportRequest.address); }
    setExportRequest(null);
  };
  
  const handleImportKey = async () => {
    if (!importKeyForWallet || !inputPrivateKey) return;
    
    setImportLoading(true);
    const success = await onLinkPrivateKey(importKeyForWallet, inputPrivateKey.trim());
    setImportLoading(false);
    
    if (success) {
      setImportKeyForWallet(null);
      setInputPrivateKey("");
      setShowInputKey(false);
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

  const handleCopyPrivateKey = (address:string) => setExportRequest({address,kind:'copy'});
  const handleShowQR = (address:string) => setExportRequest({address,kind:'qr'});

  return (
    <>
      <SetupPasswordDialog open={!!exportRequest} onOpenChange={value=>{if(!value)setExportRequest(null);}} mode="enter" title="Xác nhận xuất khóa riêng" description="Nhập lại mật khẩu ví hiện tại. Khóa riêng cho phép toàn quyền sử dụng tiền; chỉ xuất khi tự mình cần sao lưu." onPasswordSet={exportWithPassword}/>
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
                const hasPrivateKey = security.hasKey(wallet.address);
                
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
                        {/* Import Key button for wallets without private key */}
                        {!hasPrivateKey && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => {
                              setImportKeyForWallet(wallet.address);
                              setInputPrivateKey("");
                              setShowInputKey(false);
                            }}
                            disabled={loading}
                            title="Import Private Key"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
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
      <Dialog open={!!showQRForWallet && security.isUnlocked} onOpenChange={() => {setShowQRForWallet(null);setQrKey(null);}}>
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
              <div className="p-4 bg-background rounded-lg">
                <QRCodeSVG value={qrPrivateKey} size={200} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                ⚠️ Chỉ scan trong môi trường an toàn
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Private Key Dialog */}
      <Dialog open={!!importKeyForWallet} onOpenChange={() => {
        setImportKeyForWallet(null);
        setInputPrivateKey("");
        setShowInputKey(false);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-green-500" />
              Import Private Key
            </DialogTitle>
            <DialogDescription>
              Dán Private Key của ví này để đồng bộ với thiết bị hiện tại.
              <br />
              <span className="text-xs font-mono text-muted-foreground">
                {importKeyForWallet && formatAddress(importKeyForWallet, 10)}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <Input
                type={showInputKey ? "text" : "password"}
                value={inputPrivateKey}
                onChange={(e) => setInputPrivateKey(e.target.value)}
                placeholder="0x..."
                className="font-mono pr-10"
                autoComplete="off"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowInputKey(!showInputKey)}
              >
                {showInputKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-1">⚠️ Lưu ý bảo mật:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Chỉ dán private key của ví bạn sở hữu</li>
                <li>Không bao giờ chia sẻ private key với ai</li>
                <li>Private key sẽ được lưu cục bộ trên thiết bị này</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportKeyForWallet(null);
                setInputPrivateKey("");
                setShowInputKey(false);
              }}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handleImportKey}
              disabled={!inputPrivateKey || importLoading}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {importLoading ? "Đang xử lý..." : "✅ Import"}
            </Button>
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
