import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  createBackup, 
  restoreBackup, 
  downloadBackup, 
  readBackupFile,
  validateBackupFile,
  syncToCloud,
  getCloudBackup,
  CloudSyncStatus
} from "@/lib/backup";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Shield, 
  Download,
  Upload,
  Cloud,
  CloudOff,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  FileDown,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: { name: string; address: string }[];
  onRestoreWallet: (name: string, address: string, privateKey: string) => Promise<void>;
}

export const BackupRestoreDialog = ({
  open,
  onOpenChange,
  wallets,
  onRestoreWallet,
}: BackupRestoreDialogProps) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>("idle");
  const [cloudBackupInfo, setCloudBackupInfo] = useState<{
    exists: boolean;
    timestamp: number | null;
  }>({ exists: false, timestamp: null });
  
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    valid: boolean;
    walletCount?: number;
    error?: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check cloud backup on open
  useState(() => {
    if (open && user) {
      checkCloudBackup();
    }
  });

  const checkCloudBackup = async () => {
    if (!user) return;
    const { backup, timestamp } = await getCloudBackup(user.id);
    setCloudBackupInfo({
      exists: !!backup,
      timestamp,
    });
  };

  const handleCreateBackup = async () => {
    if (!password || password.length < 8) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 8 ký tự",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    if (wallets.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có ví để backup",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const encryptedBackup = await createBackup(wallets, password);
      downloadBackup(encryptedBackup);
      
      toast({
        title: "Backup thành công!",
        description: "File backup đã được tải xuống",
      });
      
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Backup thất bại",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloudSync = async () => {
    if (!password || password.length < 8) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 8 ký tự",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để sử dụng Cloud Sync",
        variant: "destructive",
      });
      return;
    }

    setCloudStatus("syncing");
    try {
      const encryptedBackup = await createBackup(wallets, password);
      const result = await syncToCloud(user.id, encryptedBackup);
      
      if (result.success) {
        setCloudStatus("synced");
        setCloudBackupInfo({
          exists: true,
          timestamp: Date.now(),
        });
        toast({
          title: "Đồng bộ thành công!",
          description: "Backup đã được lưu lên cloud",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      setCloudStatus("error");
      toast({
        title: "Đồng bộ thất bại",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBackupFile(file);
    setRestorePreview(null);
  };

  const validateFile = async () => {
    if (!backupFile || !password) return;
    
    setLoading(true);
    try {
      const content = await readBackupFile(backupFile);
      const result = await validateBackupFile(content, password);
      setRestorePreview(result);
      
      if (!result.valid) {
        toast({
          title: "File không hợp lệ",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setRestorePreview({ valid: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!backupFile || !password) return;
    
    setLoading(true);
    try {
      const content = await readBackupFile(backupFile);
      const restoredWallets = await restoreBackup(content, password);
      
      for (const wallet of restoredWallets) {
        await onRestoreWallet(wallet.name, wallet.address, wallet.privateKey);
      }
      
      toast({
        title: "Khôi phục thành công!",
        description: `Đã khôi phục ${restoredWallets.length} ví`,
      });
      
      setPassword("");
      setBackupFile(null);
      setRestorePreview(null);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Khôi phục thất bại",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!user || !password) return;
    
    setLoading(true);
    try {
      const { backup } = await getCloudBackup(user.id);
      if (!backup) {
        throw new Error("Không tìm thấy backup trên cloud");
      }
      
      const restoredWallets = await restoreBackup(backup, password);
      
      for (const wallet of restoredWallets) {
        await onRestoreWallet(wallet.name, wallet.address, wallet.privateKey);
      }
      
      toast({
        title: "Khôi phục thành công!",
        description: `Đã khôi phục ${restoredWallets.length} ví từ cloud`,
      });
      
      setPassword("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Khôi phục thất bại",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Backup & Restore
          </DialogTitle>
          <DialogDescription>
            Sao lưu và khôi phục ví của bạn với mã hóa AES-256
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="backup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
          </TabsList>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Quan trọng</p>
                  <p className="text-muted-foreground">
                    Nhớ mật khẩu này! Nếu mất mật khẩu, bạn sẽ không thể khôi phục ví.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mật khẩu mã hóa</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ít nhất 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Xác nhận mật khẩu</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Sẽ backup {wallets.length} ví:</p>
              <div className="space-y-1">
                {wallets.map((w) => (
                  <p key={w.address} className="text-xs text-muted-foreground font-mono">
                    {w.name}: {w.address.slice(0, 10)}...{w.address.slice(-8)}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleCreateBackup}
                disabled={loading || !password || password !== confirmPassword}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Tải xuống
              </Button>
              <Button
                variant="outline"
                onClick={handleCloudSync}
                disabled={loading || !password || cloudStatus === "syncing"}
              >
                {cloudStatus === "syncing" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : cloudStatus === "synced" ? (
                  <Check className="h-4 w-4 mr-2 text-success" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Cloud Sync
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4 mt-4">
            {/* Cloud restore option */}
            {cloudBackupInfo.exists && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-primary" />
                    <span className="font-medium">Cloud Backup</span>
                  </div>
                  {cloudBackupInfo.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(cloudBackupInfo.timestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCloudRestore}
                  disabled={loading || !password}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Khôi phục từ Cloud
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu backup"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>File Backup</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {backupFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileDown className="h-5 w-5 text-primary" />
                    <span>{backupFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click để chọn file backup
                    </p>
                  </>
                )}
              </div>
            </div>

            {backupFile && password && !restorePreview && (
              <Button
                variant="outline"
                className="w-full"
                onClick={validateFile}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Xác thực file
              </Button>
            )}

            {restorePreview && (
              <div className={`p-3 rounded-lg ${
                restorePreview.valid 
                  ? "bg-success/10 border border-success/20" 
                  : "bg-destructive/10 border border-destructive/20"
              }`}>
                {restorePreview.valid ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-success">
                      File hợp lệ - {restorePreview.walletCount} ví sẽ được khôi phục
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{restorePreview.error}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleRestore}
              disabled={loading || !restorePreview?.valid}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Khôi phục ví
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
