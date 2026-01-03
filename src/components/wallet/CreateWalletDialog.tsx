import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Eye, EyeOff, AlertTriangle, Shield, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWallet: (name: string) => Promise<{ mnemonic: string } | null>;
  onImportMnemonic: (mnemonic: string, name: string) => Promise<boolean>;
  onImportPrivateKey: (privateKey: string, name: string) => Promise<boolean>;
}

export const CreateWalletDialog = ({
  open,
  onOpenChange,
  onCreateWallet,
  onImportMnemonic,
  onImportPrivateKey,
}: CreateWalletDialogProps) => {
  const [step, setStep] = useState<"choice" | "create" | "backup" | "import">("choice");
  const [walletName, setWalletName] = useState("Ví chính");
  const [mnemonic, setMnemonic] = useState("");
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Import states
  const [importType, setImportType] = useState<"mnemonic" | "privateKey">("mnemonic");
  const [importMnemonic, setImportMnemonic] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [showImportSecret, setShowImportSecret] = useState(false);

  const handleCreateWallet = async () => {
    setLoading(true);
    const result = await onCreateWallet(walletName);
    setLoading(false);
    
    if (result) {
      setMnemonic(result.mnemonic);
      setStep("backup");
    }
  };

  const handleFinishBackup = () => {
    if (!backedUp) {
      toast({
        title: "Chú ý",
        description: "Bạn cần xác nhận đã sao lưu seed phrase",
        variant: "destructive",
      });
      return;
    }
    resetAndClose();
  };

  const handleImport = async () => {
    setLoading(true);
    let success = false;
    
    if (importType === "mnemonic") {
      success = await onImportMnemonic(importMnemonic, walletName);
    } else {
      success = await onImportPrivateKey(importPrivateKey, walletName);
    }
    
    setLoading(false);
    if (success) {
      resetAndClose();
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    toast({
      title: "Đã sao chép",
      description: "Seed phrase đã được sao chép",
    });
  };

  const resetAndClose = () => {
    setStep("choice");
    setWalletName("Ví chính");
    setMnemonic("");
    setBackedUp(false);
    setImportMnemonic("");
    setImportPrivateKey("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
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
                  onClick={() => handleCreateWallet()}
                  disabled={loading}
                  className="h-24 flex flex-col gap-2"
                >
                  <Shield className="h-6 w-6" />
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

        {step === "backup" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Sao lưu Seed Phrase
              </DialogTitle>
              <DialogDescription>
                Đây là cách duy nhất để khôi phục ví. Hãy ghi lại và giữ an toàn!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="relative">
                <div
                  className={`p-4 rounded-lg bg-muted font-mono text-sm leading-relaxed ${
                    !showMnemonic ? "blur-sm select-none" : ""
                  }`}
                >
                  {mnemonic}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                >
                  {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              <Button variant="outline" onClick={copyMnemonic} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Sao chép Seed Phrase
              </Button>

              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">⚠️ Cảnh báo bảo mật:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Không bao giờ chia sẻ seed phrase với bất kỳ ai</li>
                  <li>FUN Wallet sẽ không bao giờ hỏi seed phrase của bạn</li>
                  <li>Viết ra giấy và cất giữ ở nơi an toàn</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup"
                  checked={backedUp}
                  onCheckedChange={(checked) => setBackedUp(checked as boolean)}
                />
                <label htmlFor="backup" className="text-sm">
                  Tôi đã sao lưu seed phrase ở nơi an toàn
                </label>
              </div>

              <Button onClick={handleFinishBackup} className="w-full" disabled={!backedUp}>
                <Check className="h-4 w-4 mr-2" />
                Hoàn tất
              </Button>
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
                {loading ? "Đang import..." : "Import ví"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
