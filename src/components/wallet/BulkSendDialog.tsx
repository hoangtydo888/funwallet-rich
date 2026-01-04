import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Download,
  AlertCircle,
  Users,
  FileText
} from "lucide-react";
import { sendBNB, sendToken, isValidAddress, formatBalance } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import type { TokenBalance } from "@/hooks/useWallet";

interface TransferItem {
  address: string;
  amount: string;
  status: "pending" | "processing" | "success" | "failed";
  txHash?: string;
  error?: string;
}

interface BulkSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  balances: TokenBalance[];
  getPrivateKey: (address: string) => string | null;
  onSuccess: () => void;
}

export const BulkSendDialog = ({
  open,
  onOpenChange,
  walletAddress,
  balances,
  getPrivateKey,
  onSuccess,
}: BulkSendDialogProps) => {
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [inputMode, setInputMode] = useState<"csv" | "manual">("manual");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBalance = balances.find((b) => b.symbol === selectedToken);
  const maxAmount = parseFloat(selectedBalance?.balance || "0");

  // Parse CSV content
  const parseCSV = (content: string): TransferItem[] => {
    const lines = content.trim().split("\n");
    const result: TransferItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("address") || trimmed.startsWith("Address")) continue;

      const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const address = parts[0];
        const amount = parts[1];
        if (address && amount) {
          result.push({
            address,
            amount,
            status: "pending",
          });
        }
      }
    }
    return result;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      if (parsed.length === 0) {
        toast({
          title: "File trống hoặc không hợp lệ",
          description: "Định dạng: address,amount (mỗi dòng một người nhận)",
          variant: "destructive",
        });
        return;
      }
      setItems(parsed);
      toast({
        title: "Đã tải file",
        description: `${parsed.length} địa chỉ đã được thêm`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Parse manual input
  const handleParseManual = () => {
    const parsed = parseCSV(manualInput);
    if (parsed.length === 0) {
      toast({
        title: "Không tìm thấy dữ liệu hợp lệ",
        description: "Định dạng: address,amount (mỗi dòng một người nhận)",
        variant: "destructive",
      });
      return;
    }
    setItems(parsed);
    toast({
      title: "Đã phân tích",
      description: `${parsed.length} địa chỉ đã được thêm`,
    });
  };

  // Validate items
  const validateItems = (): { valid: TransferItem[]; invalid: TransferItem[] } => {
    const valid: TransferItem[] = [];
    const invalid: TransferItem[] = [];

    for (const item of items) {
      if (!isValidAddress(item.address)) {
        invalid.push({ ...item, status: "failed", error: "Địa chỉ không hợp lệ" });
      } else if (isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0) {
        invalid.push({ ...item, status: "failed", error: "Số lượng không hợp lệ" });
      } else {
        valid.push(item);
      }
    }
    return { valid, invalid };
  };

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Execute bulk transfer
  const handleBulkSend = async () => {
    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key",
        variant: "destructive",
      });
      return;
    }

    const { valid, invalid } = validateItems();
    if (valid.length === 0) {
      toast({
        title: "Không có địa chỉ hợp lệ",
        description: "Vui lòng kiểm tra lại danh sách",
        variant: "destructive",
      });
      return;
    }

    if (totalAmount > maxAmount) {
      toast({
        title: "Số dư không đủ",
        description: `Cần ${totalAmount} ${selectedToken}, có ${formatBalance(maxAmount.toString())} ${selectedToken}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: valid.length });

    const updatedItems = [...invalid];
    const token = balances.find((b) => b.symbol === selectedToken);

    for (let i = 0; i < valid.length; i++) {
      const item = valid[i];
      
      let result;
      if (selectedToken === "BNB") {
        result = await sendBNB(privateKey, item.address, item.amount);
      } else {
        if (!token?.address) continue;
        result = await sendToken(privateKey, token.address, item.address, item.amount, token.decimals);
      }

      if ("error" in result) {
        updatedItems.push({
          ...item,
          status: "failed",
          error: result.error,
        });
      } else {
        updatedItems.push({
          ...item,
          status: "success",
          txHash: result.hash,
        });
      }

      setProgress({ processed: i + 1, total: valid.length });
      setItems([...updatedItems, ...valid.slice(i + 1)]);
      
      // Delay between transactions
      if (i < valid.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setIsProcessing(false);
    const successCount = updatedItems.filter((i) => i.status === "success").length;
    const failCount = updatedItems.filter((i) => i.status === "failed").length;

    toast({
      title: "Hoàn tất chuyển tiền hàng loạt",
      description: `Thành công: ${successCount}, Thất bại: ${failCount}`,
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  // Export failed items
  const exportFailed = () => {
    const failed = items.filter((i) => i.status === "failed");
    if (failed.length === 0) return;

    const csv = "address,amount,error\n" + failed.map((i) => `${i.address},${i.amount},"${i.error || ""}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed_transfers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setItems([]);
    setManualInput("");
    setProgress({ processed: 0, total: 0 });
    onOpenChange(false);
  };

  const successCount = items.filter((i) => i.status === "success").length;
  const failCount = items.filter((i) => i.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chuyển Hàng Loạt
          </DialogTitle>
          <DialogDescription>
            Gửi {selectedToken} đến nhiều địa chỉ cùng lúc
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label>Chọn token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken} disabled={isProcessing}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedBalance?.logo}
                      alt={selectedToken}
                      className="w-5 h-5 rounded-full"
                    />
                    <span>{selectedToken}</span>
                    <span className="text-muted-foreground text-xs">
                      (Có: {formatBalance(maxAmount.toString())})
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {balances.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <img
                        src={token.logo}
                        alt={token.symbol}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{token.symbol}</span>
                      <span className="text-muted-foreground text-xs">
                        ({formatBalance(token.balance)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Mode Toggle */}
          {items.length === 0 && !isProcessing && (
            <>
              <div className="flex gap-2">
                <Button
                  variant={inputMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("manual")}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Nhập thủ công
                </Button>
                <Button
                  variant={inputMode === "csv" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("csv")}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Tải file CSV
                </Button>
              </div>

              {inputMode === "manual" ? (
                <div className="space-y-2">
                  <Label>Nhập danh sách (address,amount)</Label>
                  <Textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder={`0x1234...5678,0.01\n0xabcd...efgh,0.02\n0x9876...5432,0.015`}
                    rows={5}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleParseManual} className="w-full" disabled={!manualInput.trim()}>
                    Phân tích danh sách
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <p className="font-medium">Kéo thả hoặc click để upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Định dạng: CSV (address,amount)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold">{items.length}</p>
                  <p className="text-xs text-muted-foreground">Tổng</p>
                </div>
                <div className="bg-success/10 rounded-lg p-2">
                  <p className="text-lg font-bold text-success">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Thành công</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-2">
                  <p className="text-lg font-bold text-destructive">{failCount}</p>
                  <p className="text-xs text-muted-foreground">Thất bại</p>
                </div>
              </div>

              {/* Total Amount Warning */}
              {totalAmount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>
                    Tổng cần gửi: <strong>{formatBalance(totalAmount.toString())} {selectedToken}</strong>
                    {totalAmount > maxAmount && " (Không đủ số dư!)"}
                  </p>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Đang xử lý...</span>
                    <span>{progress.processed}/{progress.total}</span>
                  </div>
                  <Progress value={(progress.processed / progress.total) * 100} />
                </div>
              )}

              {/* Items Scroll */}
              <ScrollArea className="flex-1 max-h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                    >
                      {item.status === "success" && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                      {item.status === "failed" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      {item.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
                      {item.status === "processing" && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                      <span className="font-mono truncate flex-1">{item.address.slice(0, 10)}...{item.address.slice(-6)}</span>
                      <span className="font-medium">{item.amount}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {items.length > 0 && !isProcessing && (
              <>
                <Button variant="outline" onClick={() => setItems([])} className="flex-1">
                  Xóa danh sách
                </Button>
                {failCount > 0 && (
                  <Button variant="outline" onClick={exportFailed}>
                    <Download className="h-4 w-4 mr-1" />
                    Xuất lỗi
                  </Button>
                )}
              </>
            )}
            
            {items.length > 0 && items.some((i) => i.status === "pending") && (
              <Button
                onClick={handleBulkSend}
                disabled={isProcessing || totalAmount > maxAmount}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Gửi {items.filter((i) => i.status === "pending").length} địa chỉ
                  </>
                )}
              </Button>
            )}

            {items.length > 0 && !items.some((i) => i.status === "pending") && !isProcessing && (
              <Button onClick={handleClose} className="flex-1">
                Đóng
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
