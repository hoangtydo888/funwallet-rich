import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Eye,
  Loader2,
  ArrowDownLeft,
  Wallet,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isValidAddress, formatBalance, getBNBBalance, getTokenBalance } from "@/lib/wallet";
import { COMMON_TOKENS } from "@/lib/wallet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_ADDRESSES = 1000;

interface TrackedAddress {
  address: string;
  balance: string;
  previousBalance: string;
  hasNewDeposit: boolean;
  lastChecked: Date;
  status: "idle" | "checking" | "updated";
}

interface BulkReceiveTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkReceiveTracker = ({
  open,
  onOpenChange,
}: BulkReceiveTrackerProps) => {
  const [manualInput, setManualInput] = useState("");
  const [trackedAddresses, setTrackedAddresses] = useState<TrackedAddress[]>([]);
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [isChecking, setIsChecking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTokenData = COMMON_TOKENS.find(t => t.symbol === selectedToken);

  // Parse addresses from input
  const parseAddresses = useCallback((content: string): string[] => {
    const lines = content.trim().split("\n");
    const addresses: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith("address")) continue;
      
      // Extract just the address (first column if CSV)
      const parts = trimmed.split(/[,;\t]/);
      const address = parts[0].trim();
      
      if (isValidAddress(address) && !addresses.includes(address)) {
        addresses.push(address);
      }
    }

    if (addresses.length > MAX_ADDRESSES) {
      toast({
        title: "Vượt quá giới hạn",
        description: `Tối đa ${MAX_ADDRESSES} địa chỉ. Đã cắt bớt.`,
        variant: "destructive",
      });
      return addresses.slice(0, MAX_ADDRESSES);
    }

    return addresses;
  }, []);

  // Load addresses from input
  const handleLoadAddresses = () => {
    const addresses = parseAddresses(manualInput);
    if (addresses.length === 0) {
      toast({
        title: "Không tìm thấy địa chỉ hợp lệ",
        description: "Vui lòng nhập địa chỉ ví, mỗi dòng một địa chỉ",
        variant: "destructive",
      });
      return;
    }

    const tracked: TrackedAddress[] = addresses.map(addr => ({
      address: addr,
      balance: "0",
      previousBalance: "0",
      hasNewDeposit: false,
      lastChecked: new Date(),
      status: "idle",
    }));

    setTrackedAddresses(tracked);
    toast({
      title: "Đã thêm địa chỉ",
      description: `${addresses.length} địa chỉ sẵn sàng theo dõi`,
    });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setManualInput(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Check balances for all addresses
  const checkAllBalances = async () => {
    if (trackedAddresses.length === 0) return;

    setIsChecking(true);
    setProgress({ current: 0, total: trackedAddresses.length });

    const updated: TrackedAddress[] = [];

    for (let i = 0; i < trackedAddresses.length; i++) {
      const addr = trackedAddresses[i];
      
      // Update status to checking
      setTrackedAddresses(prev => prev.map((a, idx) => 
        idx === i ? { ...a, status: "checking" as const } : a
      ));

      try {
        let newBalance: string;
        if (selectedToken === "BNB") {
          newBalance = await getBNBBalance(addr.address);
        } else {
          const tokenAddr = selectedTokenData?.address;
          if (tokenAddr) {
            newBalance = await getTokenBalance(tokenAddr, addr.address);
          } else {
            newBalance = "0";
          }
        }

        const hasDeposit = parseFloat(newBalance) > parseFloat(addr.previousBalance || addr.balance);

        updated.push({
          ...addr,
          previousBalance: addr.balance,
          balance: newBalance,
          hasNewDeposit: hasDeposit,
          lastChecked: new Date(),
          status: "updated",
        });

        if (hasDeposit) {
          toast({
            title: "💰 Nhận tiền mới!",
            description: `${addr.address.slice(0, 10)}... đã nhận ${selectedToken}`,
          });
        }
      } catch (error) {
        updated.push({
          ...addr,
          lastChecked: new Date(),
          status: "idle",
        });
      }

      setProgress({ current: i + 1, total: trackedAddresses.length });
      
      // Small delay to avoid rate limiting
      if (i < trackedAddresses.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    setTrackedAddresses(updated);
    setIsChecking(false);

    const depositsCount = updated.filter(a => a.hasNewDeposit).length;
    toast({
      title: "Đã kiểm tra xong",
      description: depositsCount > 0 
        ? `🎉 ${depositsCount} địa chỉ có giao dịch mới!`
        : "Chưa có giao dịch mới",
    });
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      setAutoRefresh(false);
      toast({ title: "Đã tắt tự động làm mới" });
    } else {
      setAutoRefresh(true);
      toast({ 
        title: "Đã bật tự động làm mới",
        description: "Kiểm tra mỗi 30 giây",
      });
      // Start interval
      refreshIntervalRef.current = setInterval(() => {
        checkAllBalances();
      }, 30000);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Export results
  const exportResults = () => {
    const csv = "address,balance,has_deposit,last_checked\n" + 
      trackedAddresses.map(a => 
        `${a.address},${a.balance},${a.hasNewDeposit},${a.lastChecked.toISOString()}`
      ).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receive_tracking_${selectedToken}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    setAutoRefresh(false);
    onOpenChange(false);
  };

  const depositsCount = trackedAddresses.filter(a => a.hasNewDeposit).length;
  const totalBalance = trackedAddresses.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Theo Dõi Nhận Tiền Hàng Loạt
          </DialogTitle>
          <DialogDescription>
            Theo dõi số dư của tối đa {MAX_ADDRESSES} địa chỉ để phát hiện giao dịch mới
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label>Token theo dõi</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken} disabled={isChecking}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedTokenData?.logo}
                        alt={selectedToken}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{selectedToken}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COMMON_TOKENS.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <img
                          src={token.logo}
                          alt={token.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input Section - Show if no addresses loaded */}
            {trackedAddresses.length === 0 ? (
              <div className="space-y-3 p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-[#E0FFF0] to-[#D0F5FF]">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Danh sách địa chỉ theo dõi
                  </Label>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-[#00FF7F] hover:bg-[#00FF7F]/80 text-[#0a4a3a]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Tải CSV
                  </Button>
                </div>

                <Textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={`Mỗi dòng một địa chỉ ví. Ví dụ:

0x1234567890abcdef1234567890abcdef12345678
0xabcdef1234567890abcdef1234567890abcdef12
0x9876543210fedcba9876543210fedcba98765432
...

(Hỗ trợ tối đa ${MAX_ADDRESSES} địa chỉ)`}
                  className="font-mono min-h-[200px] bg-white/90"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{trackedAddresses.length}</p>
                    <p className="text-xs text-muted-foreground">Địa chỉ</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-success">{depositsCount}</p>
                    <p className="text-xs text-muted-foreground">Có mới</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{formatBalance(totalBalance.toString())}</p>
                    <p className="text-xs text-muted-foreground">Tổng {selectedToken}</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-3 text-center">
                    <Badge variant={autoRefresh ? "default" : "secondary"} className="text-xs">
                      {autoRefresh ? "Tự động" : "Thủ công"}
                    </Badge>
                  </div>
                </div>

                {/* Progress */}
                {isChecking && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang kiểm tra...
                      </span>
                      <span>{progress.current}/{progress.total}</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} />
                  </div>
                )}

                {/* Address List */}
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {trackedAddresses.map((addr, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-sm p-2 rounded ${
                          addr.hasNewDeposit 
                            ? "bg-success/20 border border-success/30" 
                            : "bg-muted/50"
                        }`}
                      >
                        {addr.status === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : addr.hasNewDeposit ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-mono truncate flex-1">
                          {addr.address.slice(0, 10)}...{addr.address.slice(-6)}
                        </span>
                        <span className="font-medium shrink-0">
                          {formatBalance(addr.balance)} {selectedToken}
                        </span>
                        {addr.hasNewDeposit && (
                          <Badge className="bg-success/20 text-success text-xs">
                            +NEW
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="shrink-0 border-t pt-4 mt-2 space-y-2">
          {trackedAddresses.length === 0 ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Đóng
              </Button>
              <Button
                onClick={handleLoadAddresses}
                disabled={!manualInput.trim()}
                className="flex-[2] bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-[#0a4a3a] font-bold"
              >
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Bắt đầu theo dõi
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTrackedAddresses([])}
                disabled={isChecking}
              >
                Quay lại
              </Button>
              <Button
                variant={autoRefresh ? "destructive" : "secondary"}
                onClick={toggleAutoRefresh}
                disabled={isChecking}
              >
                {autoRefresh ? "Tắt tự động" : "Tự động 30s"}
              </Button>
              <Button
                variant="outline"
                onClick={exportResults}
                disabled={isChecking}
              >
                <Download className="h-4 w-4 mr-1" />
                Xuất
              </Button>
              <Button
                onClick={checkAllBalances}
                disabled={isChecking}
                className="flex-1 bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-[#0a4a3a] font-bold"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Kiểm tra ngay
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
