import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Eye, EyeOff, Shield, Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSecureWallet } from "@/hooks/useSecureWallet";
import { SetupPasswordDialog } from "./SetupPasswordDialog";
import { BackupSeedDialog } from "./BackupSeedDialog";
import { SeedQuizDialog } from "./SeedQuizDialog";

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWallet: (name: string) => Promise<{ mnemonic: string; address: string; privateKey: string } | null>;
  onImportMnemonic: (mnemonic: string, name: string) => Promise<{ address: string; privateKey: string } | null>;
  onImportPrivateKey: (privateKey: string, name: string) => Promise<{ address: string } | null>;
}

type Step = "choice" | "create" | "password" | "backup" | "quiz" | "import" | "complete";

export const CreateWalletDialog = ({
  open,
  onOpenChange,
  onCreateWallet,
  onImportMnemonic,
  onImportPrivateKey,
}: CreateWalletDialogProps) => {
  const [step, setStep] = useState<Step>("choice");
  const [walletName, setWalletName] = useState("Ví chính");
  const [mnemonic, setMnemonic] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);

  // Import states
  const [importType, setImportType] = useState<"mnemonic" | "privateKey">("mnemonic");
  const [importMnemonic, setImportMnemonic] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [showImportSecret, setShowImportSecret] = useState(false);

  // Security hooks
  const { 
    isPasswordSet, 
    setupPassword, 
    encryptAndSaveKey,
    isUnlocked,
    getCachedPassword,
  } = useSecureWallet();

  const handleCreateWallet = async () => {
    setLoading(true);
    const result = await onCreateWallet(walletName);
    setLoading(false);
    
    if (result) {
      setMnemonic(result.mnemonic);
      setWalletAddress(result.address);
      setPrivateKey(result.privateKey);
      
      // Check if password already set
      if (isPasswordSet && isUnlocked) {
        // Encrypt immediately with cached password
        const cachedPwd = getCachedPassword();
        if (cachedPwd) {
          await encryptAndSaveKey(result.address, result.privateKey, cachedPwd);
          setStep("backup");
        } else {
          setStep("password");
        }
      } else {
        // Need to setup password first
        setStep("password");
      }
    }
  };

  const handlePasswordSet = useCallback(async (password: string) => {
    try {
      if (!isPasswordSet) {
        await setupPassword(password);
      }
      
      // Encrypt the private key with the new password
      if (walletAddress && privateKey) {
        await encryptAndSaveKey(walletAddress, privateKey, password);
      }
      
      setStep("backup");
    } catch (error) {
      console.error("Password setup error:", error);
      throw error;
    }
  }, [isPasswordSet, setupPassword, encryptAndSaveKey, walletAddress, privateKey]);

  const handleBackupComplete = () => {
    setStep("quiz");
  };

  const handleStartQuiz = () => {
    setStep("quiz");
  };

  const handleQuizComplete = () => {
    setStep("complete");
  };

  const handleQuizRetry = () => {
    setStep("backup");
  };

  const handleSkipBackup = () => {
    toast({
      title: "⚠️ Cảnh báo",
      description: "Bạn có thể backup seed phrase sau trong phần Cài đặt → Backup",
      variant: "destructive",
    });
    setStep("complete");
  };

  const handleImport = async () => {
    setLoading(true);
    
    try {
      if (importType === "mnemonic") {
        const result = await onImportMnemonic(importMnemonic, walletName);
        if (result) {
          setWalletAddress(result.address);
          setPrivateKey(result.privateKey);
          
          // If password set and unlocked, encrypt immediately
          if (isPasswordSet && isUnlocked) {
            const cachedPwd = getCachedPassword();
            if (cachedPwd) {
              await encryptAndSaveKey(result.address, result.privateKey, cachedPwd);
              setStep("complete");
            } else {
              setStep("password");
            }
          } else {
            setStep("password");
          }
        }
      } else {
        const result = await onImportPrivateKey(importPrivateKey, walletName);
        if (result) {
          setWalletAddress(result.address);
          setPrivateKey(importPrivateKey);
          
          if (isPasswordSet && isUnlocked) {
            const cachedPwd = getCachedPassword();
            if (cachedPwd) {
              await encryptAndSaveKey(result.address, importPrivateKey, cachedPwd);
              setStep("complete");
            } else {
              setStep("password");
            }
          } else {
            setStep("password");
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep("choice");
    setWalletName("Ví chính");
    setMnemonic("");
    setWalletAddress("");
    setPrivateKey("");
    setImportMnemonic("");
    setImportPrivateKey("");
    onOpenChange(false);
  };

  const handleComplete = () => {
    toast({
      title: "🎉 Thành công!",
      description: "Ví của bạn đã được tạo và bảo mật",
    });
    resetAndClose();
  };

  // Handle dialog close - prevent closing during critical steps
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && ["password", "backup", "quiz"].includes(step)) {
      toast({
        title: "Không thể đóng",
        description: "Vui lòng hoàn tất các bước bảo mật trước",
        variant: "destructive",
      });
      return;
    }
    if (!newOpen) {
      resetAndClose();
    }
  };

  return (
    <>
      <Dialog open={open && step !== "password" && step !== "backup" && step !== "quiz"} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {step === "choice" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">Thêm ví mới</DialogTitle>
                <DialogDescription>
                  Tạo ví mới hoặc import ví có sẵn
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tên ví</Label>
                  <Input
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Ví chính"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCreateWallet}
                    disabled={loading}
                    className="h-24 flex flex-col gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Shield className="h-6 w-6" />
                    )}
                    <span>Tạo ví mới</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep("import")}
                    className="h-24 flex flex-col gap-2"
                  >
                    <Copy className="h-6 w-6" />
                    <span>Import ví</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "import" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">Import ví</DialogTitle>
                <DialogDescription>
                  Nhập seed phrase hoặc private key của ví có sẵn
                </DialogDescription>
              </DialogHeader>

              <Tabs value={importType} onValueChange={(v) => setImportType(v as "mnemonic" | "privateKey")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mnemonic">Seed Phrase</TabsTrigger>
                  <TabsTrigger value="privateKey">Private Key</TabsTrigger>
                </TabsList>

                <TabsContent value="mnemonic" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Seed Phrase (12 hoặc 24 từ)</Label>
                    <div className="relative">
                      <Textarea
                        value={importMnemonic}
                        onChange={(e) => setImportMnemonic(e.target.value)}
                        placeholder="word1 word2 word3 ..."
                        className={`min-h-[100px] font-mono ${!showImportSecret ? "text-security-disc" : ""}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setShowImportSecret(!showImportSecret)}
                      >
                        {showImportSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="privateKey" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Private Key</Label>
                    <div className="relative">
                      <Input
                        type={showImportSecret ? "text" : "password"}
                        value={importPrivateKey}
                        onChange={(e) => setImportPrivateKey(e.target.value)}
                        placeholder="0x..."
                        className="font-mono pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowImportSecret(!showImportSecret)}
                      >
                        {showImportSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep("choice")} className="flex-1">
                  Quay lại
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || (importType === "mnemonic" ? !importMnemonic : !importPrivateKey)}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang import...
                    </>
                  ) : (
                    "Import ví"
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "complete" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  Hoàn tất!
                </DialogTitle>
                <DialogDescription>
                  Ví của bạn đã được tạo và bảo mật thành công
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div className="bg-success/10 text-success p-4 rounded-lg">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Private key đã được mã hóa AES-256-GCM
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Mật khẩu bảo vệ đã được thiết lập
                    </li>
                    {mnemonic && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Seed phrase đã được xác minh
                      </li>
                    )}
                  </ul>
                </div>

                <Button onClick={handleComplete} className="w-full">
                  Bắt đầu sử dụng ví
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Setup Dialog */}
      <SetupPasswordDialog
        open={open && step === "password"}
        onOpenChange={(newOpen) => {
          if (!newOpen) {
            toast({
              title: "Cần thiết lập mật khẩu",
              description: "Vui lòng thiết lập mật khẩu để bảo vệ ví của bạn",
              variant: "destructive",
            });
          }
        }}
        onPasswordSet={handlePasswordSet}
        title={isPasswordSet ? "Xác nhận mật khẩu" : "Thiết lập mật khẩu"}
        description={
          isPasswordSet 
            ? "Nhập mật khẩu để mã hóa private key của ví mới" 
            : "Tạo mật khẩu mạnh để bảo vệ tất cả private keys của bạn"
        }
        mode={isPasswordSet ? "enter" : "setup"}
      />

      {/* Backup Seed Dialog */}
      <BackupSeedDialog
        open={open && step === "backup"}
        onOpenChange={() => {}}
        mnemonic={mnemonic}
        walletAddress={walletAddress}
        onBackupComplete={handleBackupComplete}
        onStartQuiz={handleStartQuiz}
        onSkip={handleSkipBackup}
      />

      {/* Quiz Dialog */}
      <SeedQuizDialog
        open={open && step === "quiz"}
        onOpenChange={() => {}}
        mnemonic={mnemonic}
        walletAddress={walletAddress}
        onQuizComplete={handleQuizComplete}
        onRetry={handleQuizRetry}
      />
    </>
  );
};