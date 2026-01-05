import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Download,
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  History,
  Coins
} from "lucide-react";
import { sendBNB, sendToken, isValidAddress, formatBalance, getBNBBalance, getTokenBalance } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import type { TokenBalance } from "@/hooks/useWallet";

const MAX_RECIPIENTS = 1000;

interface TransferItem {
  address: string;
  amount: string;
  status: "pending" | "processing" | "success" | "failed";
  txHash?: string;
  error?: string;
}

interface BulkTransferHistory {
  id: string;
  token_symbol: string;
  total_recipients: number;
  total_amount: string;
  successful_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

interface UserStats {
  totalTransfers: number;
  totalAmount: number;
  totalRecipients: number;
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
  const { user } = useAuth();
  // Ưu tiên CAMLY làm token mặc định
  const [selectedToken, setSelectedToken] = useState(() => {
    const camly = balances.find(b => b.symbol === "CAMLY");
    return camly ? "CAMLY" : "BNB";
  });
  const [items, setItems] = useState<TransferItem[]>([]);
  const [manualInput, setManualInput] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [stats, setStats] = useState<UserStats>({ totalTransfers: 0, totalAmount: 0, totalRecipients: 0 });
  const [history, setHistory] = useState<BulkTransferHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");
  const [uniformAmount, setUniformAmount] = useState<string>("");
  const [useUniformAmount, setUseUniformAmount] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<{ count: number; total: number; estimatedGas: number } | null>(null);
  const [isAutoParsing, setIsAutoParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Gas price estimate (in BNB) - average gas per transfer
  const GAS_PER_TRANSFER = 0.00021; // ~21000 gas * 10 gwei

  const selectedBalance = balances.find((b) => b.symbol === selectedToken);
  const maxAmount = parseFloat(selectedBalance?.balance || "0");

  // Fetch user stats and history
  useEffect(() => {
    if (open && user) {
      fetchStats();
      fetchHistory();
    }
  }, [open, user]);

  const fetchStats = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bulk_transfers')
      .select('total_amount, successful_count, total_recipients')
      .eq('created_by', user.id)
      .eq('status', 'completed');

    if (data && data.length > 0) {
      const totalAmount = data.reduce((sum, t) => sum + parseFloat(t.total_amount || '0'), 0);
      const totalRecipients = data.reduce((sum, t) => sum + (t.successful_count || 0), 0);
      setStats({
        totalTransfers: data.length,
        totalAmount,
        totalRecipients
      });
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bulk_transfers')
      .select('id, token_symbol, total_recipients, total_amount, successful_count, failed_count, status, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setHistory(data);
    }
  };

  // Parse CSV content with MAX_RECIPIENTS limit - supports both formats
  const parseCSV = (content: string, uniformAmt?: string): TransferItem[] => {
    const lines = content.trim().split("\n");
    const result: TransferItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith("address")) continue;

      const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
      const address = parts[0];
      
      // Skip empty lines
      if (!address) continue;

      // Case 1: Has both address and amount
      if (parts.length >= 2 && parts[1] && !isNaN(parseFloat(parts[1]))) {
        result.push({
          address,
          amount: parts[1],
          status: "pending",
        });
      } 
      // Case 2: Only address - use uniform amount
      else if (uniformAmt && parseFloat(uniformAmt) > 0) {
        result.push({
          address,
          amount: uniformAmt,
          status: "pending",
        });
      }
    }

    // Limit to MAX_RECIPIENTS
    if (result.length > MAX_RECIPIENTS) {
      toast({
        title: "Vượt quá giới hạn",
        description: `Tối đa ${MAX_RECIPIENTS} địa chỉ. Đã cắt bớt ${result.length - MAX_RECIPIENTS} địa chỉ.`,
        variant: "destructive",
      });
      return result.slice(0, MAX_RECIPIENTS);
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
      const amtToUse = useUniformAmount ? uniformAmount : undefined;
      const parsed = parseCSV(content, amtToUse);
      if (parsed.length === 0) {
        toast({
          title: "File trống hoặc không hợp lệ",
          description: useUniformAmount && !uniformAmount 
            ? "Vui lòng nhập số tiền mỗi địa chỉ trước" 
            : "Định dạng: address hoặc address,amount (mỗi dòng một người nhận)",
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
    const amtToUse = useUniformAmount ? uniformAmount : undefined;
    const parsed = parseCSV(manualInput, amtToUse);
    if (parsed.length === 0) {
      toast({
        title: "Không tìm thấy dữ liệu hợp lệ",
        description: useUniformAmount && !uniformAmount 
          ? "Vui lòng nhập số tiền mỗi địa chỉ trước" 
          : "Định dạng: address hoặc address,amount (mỗi dòng một người nhận)",
        variant: "destructive",
      });
      return;
    }
    setItems(parsed);
    setPreviewData(null); // Clear preview after parsing
    toast({
      title: "Đã phân tích",
      description: `${parsed.length} địa chỉ đã được thêm`,
    });
  };

  // Auto-parse with debounce when input changes
  const autoParsePreview = useCallback((input: string, uniformAmt?: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!input.trim()) {
        setPreviewData(null);
        return;
      }

      setIsAutoParsing(true);
      
      const lines = input.trim().split("\n");
      let count = 0;
      let total = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.toLowerCase().startsWith("address")) continue;

        const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
        const address = parts[0];
        
        if (!address || !isValidAddress(address)) continue;

        // Has both address and amount
        if (parts.length >= 2 && parts[1] && !isNaN(parseFloat(parts[1]))) {
          count++;
          total += parseFloat(parts[1]);
        } 
        // Only address - use uniform amount
        else if (uniformAmt && parseFloat(uniformAmt) > 0) {
          count++;
          total += parseFloat(uniformAmt);
        }
      }

      const estimatedGas = count * GAS_PER_TRANSFER;
      setPreviewData(count > 0 ? { count, total, estimatedGas } : null);
      setIsAutoParsing(false);
    }, 300);
  }, []);

  // Trigger auto-parse when input or uniform amount changes
  useEffect(() => {
    if (items.length === 0) {
      const uniformAmt = useUniformAmount ? uniformAmount : undefined;
      autoParsePreview(manualInput, uniformAmt);
    }
  }, [manualInput, uniformAmount, useUniformAmount, items.length, autoParsePreview]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Validate items - accepts items list as parameter
  const validateItemsList = (itemsList: TransferItem[]): { valid: TransferItem[]; invalid: TransferItem[] } => {
    const valid: TransferItem[] = [];
    const invalid: TransferItem[] = [];

    for (const item of itemsList) {
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

  // Translate blockchain errors to Vietnamese
  const translateError = (error: string): string => {
    if (error.includes("transfer amount exceeds balance")) {
      return "Số dư không đủ";
    }
    if (error.includes("insufficient funds")) {
      return "Không đủ BNB gas";
    }
    if (error.includes("nonce too low")) {
      return "Giao dịch trùng";
    }
    if (error.includes("rejected") || error.includes("denied")) {
      return "Từ chối";
    }
    if (error.includes("gas")) {
      return "Lỗi gas";
    }
    return error.length > 25 ? error.slice(0, 25) + "..." : error;
  };

  // Execute bulk transfer with database logging - accepts items as parameter
  const handleBulkSendWithItems = async (itemsToSend: TransferItem[]) => {
    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      toast({
        title: "❌ Không tìm thấy Private Key",
        description: "Ví này chưa được import trên thiết bị này. Hãy vào Quản lý ví → Import ví → Dán Private Key từ thiết bị đã tạo ví.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const { valid, invalid } = validateItemsList(itemsToSend);
    if (valid.length === 0) {
      toast({
        title: "Không có địa chỉ hợp lệ",
        description: "Vui lòng kiểm tra lại danh sách",
        variant: "destructive",
      });
      return;
    }

    const totalAmt = valid.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Check real blockchain balance before sending
    const token = balances.find((b) => b.symbol === selectedToken);
    const realBalance = selectedToken === "BNB"
      ? await getBNBBalance(walletAddress)
      : await getTokenBalance(token?.address || "", walletAddress);
    
    const realBalanceNum = parseFloat(realBalance);
    
    if (totalAmt > realBalanceNum) {
      toast({
        title: "Số dư thực tế không đủ!",
        description: `Số dư trên blockchain: ${formatBalance(realBalance)} ${selectedToken}. Cần: ${totalAmt.toFixed(4)} ${selectedToken}`,
        variant: "destructive",
      });
      return;
    }

    // Check BNB for gas
    const bnbBalance = await getBNBBalance(walletAddress);
    const estimatedGas = valid.length * GAS_PER_TRANSFER;
    if (parseFloat(bnbBalance) < estimatedGas) {
      toast({
        title: "Không đủ BNB cho phí gas",
        description: `Cần ít nhất ${estimatedGas.toFixed(4)} BNB cho ${valid.length} giao dịch. Có: ${parseFloat(bnbBalance).toFixed(4)} BNB`,
        variant: "destructive",
      });
      return;
    }

    // Set items to show progress
    setItems(itemsToSend);
    setIsProcessing(true);
    setProgress({ processed: 0, total: valid.length });

    // Create bulk transfer record
    let bulkTransferId: string | null = null;
    if (user) {
      const tokenData = balances.find((b) => b.symbol === selectedToken);
      const { data: bulkData } = await supabase
        .from('bulk_transfers')
        .insert({
          created_by: user.id,
          token_symbol: selectedToken,
          token_address: tokenData?.address || null,
          total_recipients: valid.length,
          total_amount: totalAmt.toString(),
          status: 'processing',
        })
        .select()
        .single();
      
      if (bulkData) {
        bulkTransferId = bulkData.id;
        // Insert items
        const itemsToInsert = valid.map(item => ({
          bulk_transfer_id: bulkTransferId,
          recipient_address: item.address,
          amount: item.amount,
          status: 'pending',
        }));
        await supabase.from('bulk_transfer_items').insert(itemsToInsert);
      }
    }

    const updatedItems = [...invalid];
    // Reuse token from earlier

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
        // Update item status in DB
        if (bulkTransferId) {
          await supabase
            .from('bulk_transfer_items')
            .update({ status: 'failed', error_message: result.error })
            .eq('bulk_transfer_id', bulkTransferId)
            .eq('recipient_address', item.address);
        }
      } else {
        updatedItems.push({
          ...item,
          status: "success",
          txHash: result.hash,
        });
        // Update item status in DB
        if (bulkTransferId) {
          await supabase
            .from('bulk_transfer_items')
            .update({ status: 'success', tx_hash: result.hash })
            .eq('bulk_transfer_id', bulkTransferId)
            .eq('recipient_address', item.address);
        }
      }

      setProgress({ processed: i + 1, total: valid.length });
      setItems([...updatedItems, ...valid.slice(i + 1)]);
      
      // Delay between transactions
      if (i < valid.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update bulk transfer record
    if (bulkTransferId) {
      const successCount = updatedItems.filter((i) => i.status === "success").length;
      const failCount = updatedItems.filter((i) => i.status === "failed").length;
      await supabase
        .from('bulk_transfers')
        .update({
          successful_count: successCount,
          failed_count: failCount,
          status: failCount === 0 ? 'completed' : 'partial',
          completed_at: new Date().toISOString(),
        })
        .eq('id', bulkTransferId);
    }

    setIsProcessing(false);
    const successCount = updatedItems.filter((i) => i.status === "success").length;
    const failCount = updatedItems.filter((i) => i.status === "failed").length;

    toast({
      title: successCount > 0 ? "Phước lành đã được chia sẻ! ❤️🌈" : "Có lỗi xảy ra",
      description: successCount > 0 
        ? `${successCount} tâm hồn đã nhận được năng lượng yêu thương! 💚 ${failCount > 0 ? `(${failCount} lỗi)` : ""}`
        : `Thất bại: ${failCount}`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    if (successCount > 0) {
      onSuccess();
      fetchStats();
      fetchHistory();
    }
  };

  // Direct send - parse and send in one step
  const handleDirectSend = async () => {
    const amtToUse = useUniformAmount ? uniformAmount : undefined;
    const parsed = parseCSV(manualInput, amtToUse);
    
    if (parsed.length === 0) {
      toast({
        title: "Không tìm thấy dữ liệu hợp lệ",
        description: useUniformAmount && !uniformAmount 
          ? "Vui lòng nhập số tiền mỗi địa chỉ trước" 
          : "Định dạng: address hoặc address,amount (mỗi dòng một người nhận)",
        variant: "destructive",
      });
      return;
    }

    setPreviewData(null);
    await handleBulkSendWithItems(parsed);
  };

  // Legacy handleBulkSend for items already in state
  const handleBulkSend = async () => {
    await handleBulkSendWithItems(items);
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

  // Export all history
  const exportHistory = () => {
    if (history.length === 0) return;

    const csv = "id,thoi_gian,token,so_nguoi,tong_tien,thanh_cong,that_bai,trang_thai\n" + 
      history.map((h) => `${h.id},${h.created_at},${h.token_symbol},${h.total_recipients},${h.total_amount},${h.successful_count},${h.failed_count},${h.status}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_transfer_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setItems([]);
    setManualInput("");
    setUniformAmount("");
    setPreviewData(null);
    setProgress({ processed: 0, total: 0 });
    setActiveTab("send");
    onOpenChange(false);
  };

  const successCount = items.filter((i) => i.status === "success").length;
  const failCount = items.filter((i) => i.status === "failed").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/20 text-success border-success/30">Thành công</Badge>;
      case 'partial':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Một phần</Badge>;
      case 'processing':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Đang xử lý</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading flex items-center gap-2 text-[#00FF7F]">
            <span className="text-2xl">🎁</span>
            Chia Sẻ Phước Lành Hàng Loạt
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="text-sm">Gửi năng lượng yêu thương đến tối đa <strong className="text-[#00FF7F]">{MAX_RECIPIENTS}</strong> tâm hồn 💚</span>
            <div className="text-xs font-mono text-muted-foreground truncate">
              Ví gửi: {walletAddress}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Main Scrollable Content - fixed height */}
        <ScrollArea className="flex-1 min-h-0 max-h-[60vh] sm:max-h-[50vh] pr-2 sm:pr-4">
          <div className="space-y-3">
            {/* Stats Cards - Compact */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{formatBalance(stats.totalAmount.toString())}</p>
                <p className="text-[10px] text-muted-foreground">Đã chuyển</p>
              </div>
              <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{stats.totalTransfers}</p>
                <p className="text-[10px] text-muted-foreground">Số lần</p>
              </div>
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{stats.totalRecipients}</p>
                <p className="text-[10px] text-muted-foreground">Người nhận</p>
              </div>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2 border-b pb-2">
              <Button
                variant={activeTab === "send" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("send")}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-1" />
                Gửi mới
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("history")}
                className="flex-1"
              >
                <History className="h-4 w-4 mr-1" />
                Lịch sử ({history.length})
              </Button>
            </div>

            {activeTab === "send" ? (
              <div className="space-y-4">
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
                      {/* Sắp xếp: CAMLY đầu tiên */}
                      {[...balances]
                        .sort((a, b) => {
                          if (a.symbol === "CAMLY") return -1;
                          if (b.symbol === "CAMLY") return 1;
                          return parseFloat(b.balance) - parseFloat(a.balance);
                        })
                        .map((token) => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-5 h-5 rounded-full"
                            />
                            <span>{token.symbol}</span>
                            {token.symbol === "CAMLY" && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-[#00FF7F]/20 text-[#00FF7F]">⭐</span>
                            )}
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
                    {/* Uniform Amount Input - Compact */}
                    <div className="space-y-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Số tiền mỗi địa chỉ</Label>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Cùng số tiền</span>
                          <Switch 
                            checked={useUniformAmount} 
                            onCheckedChange={setUseUniformAmount}
                            className="scale-75"
                          />
                        </div>
                      </div>
                      {useUniformAmount && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="VD: 100"
                            value={uniformAmount}
                            onChange={(e) => setUniformAmount(e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <span className="flex items-center px-2 bg-muted rounded-md text-xs font-medium">
                            {selectedToken}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Textarea - LUÔN HIỂN THỊ */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          {useUniformAmount ? `Danh sách địa chỉ` : `Danh sách (address,amount)`}
                        </Label>
                        <button 
                          type="button"
                          className="text-primary hover:underline flex items-center gap-1 text-[10px]" 
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3" />
                          Tải CSV
                        </button>
                      </div>
                      <Textarea
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder={useUniformAmount 
                          ? `0x1234567890abcdef1234567890abcdef12345678\n0xabcdef1234567890abcdef1234567890abcdef12`
                          : `0x1234...5678,0.01\n0xabcd...efgh,0.02`}
                        rows={6}
                        className="font-mono text-[10px] sm:text-xs min-h-[120px] sm:min-h-[160px] touch-pan-y"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {/* Preview Panel with Rainbow Theme */}
                    {previewData && previewData.count > 0 && (
                      <div className="rounded-lg border-2 border-[#00FF7F]/50 bg-gradient-to-r from-[#00FF7F]/10 via-yellow-500/5 to-pink-500/10 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-[#00FF7F] font-medium text-sm mb-2">
                          <span className="animate-pulse">🌈</span>
                          <span>Chuẩn bị chia sẻ phước lành</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-background/80 rounded-lg p-2 border border-[#00FF7F]/20">
                            <p className="text-lg font-bold text-[#00FF7F]">{previewData.count}</p>
                            <p className="text-[10px] text-muted-foreground">Tâm hồn 💚</p>
                          </div>
                          <div className="bg-background/80 rounded-lg p-2 border border-yellow-500/20">
                            <p className="text-lg font-bold text-yellow-500">{formatBalance(previewData.total.toFixed(4))}</p>
                            <p className="text-[10px] text-muted-foreground">{selectedToken}</p>
                          </div>
                          <div className="bg-background/80 rounded-lg p-2 border border-orange-500/20">
                            <p className="text-lg font-bold text-orange-500">~{previewData.estimatedGas.toFixed(4)}</p>
                            <p className="text-[10px] text-muted-foreground">Gas BNB</p>
                          </div>
                        </div>
                        
                        {/* Safety Warning */}
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 text-[11px]">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Bạn sắp chia sẻ phước lành đến <strong>{previewData.count}</strong> người – hãy kiểm tra kỹ danh sách! 🙏</span>
                        </div>
                        
                        {previewData.total > maxAmount && (
                          <div className="flex items-center gap-1 text-destructive text-xs font-medium p-2 bg-destructive/10 rounded-lg">
                            <AlertCircle className="h-4 w-4" />
                            <span>Không đủ số dư! Cần {formatBalance(previewData.total.toFixed(4))} {selectedToken}, có {formatBalance(maxAmount.toString())}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </>
                )}

                {/* Items List */}
                {items.length > 0 && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-bold">{items.length}</p>
                        <p className="text-xs text-muted-foreground">Tổng</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-bold text-muted-foreground">{MAX_RECIPIENTS}</p>
                        <p className="text-xs text-muted-foreground">Tối đa</p>
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

                    {/* Rainbow Progress */}
                    {isProcessing && (
                      <div className="space-y-3 p-3 rounded-lg bg-gradient-to-r from-[#00FF7F]/10 via-yellow-500/10 to-pink-500/10 border border-[#00FF7F]/30">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="animate-bounce">💚</span>
                            Đang chia sẻ phước lành...
                          </span>
                          <span className="font-bold text-[#00FF7F]">{progress.processed}/{progress.total}</span>
                        </div>
                        <Progress value={(progress.processed / progress.total) * 100} className="h-3 bg-muted" />
                        <p className="text-center text-xs text-muted-foreground animate-pulse">
                          🌈 Năng lượng yêu thương đang lan tỏa... 🌈
                        </p>
                      </div>
                    )}

                    {/* Items List with ScrollArea */}
                    <ScrollArea className="h-40 sm:h-48 border rounded-lg">
                      <div className="p-1.5 sm:p-2 space-y-1">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1 sm:gap-2 text-xs p-1.5 sm:p-2 rounded ${
                              item.status === "success" 
                                ? "bg-[#00FF7F]/10 border border-[#00FF7F]/30" 
                                : "bg-muted/50"
                            }`}
                          >
                            {item.status === "success" && <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-success shrink-0" />}
                            {item.status === "failed" && <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive shrink-0" />}
                            {item.status === "pending" && <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
                            {item.status === "processing" && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />}
                            <span className="font-mono truncate flex-1 text-[10px] sm:text-xs">{item.address.slice(0, 8)}...{item.address.slice(-4)}</span>
                            <span className="font-medium shrink-0 text-[10px] sm:text-xs">{item.amount}</span>
                            {item.error && (
                              <span className="text-destructive text-[10px] sm:text-xs shrink-0 max-w-16 sm:max-w-24 truncate" title={item.error}>
                                {translateError(item.error)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            ) : (
              /* History Tab */
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Chưa có lịch sử chuyển tiền</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{h.token_symbol}</span>
                              {getStatusBadge(h.status)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatBalance(h.total_amount)} {h.token_symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {h.successful_count}/{h.total_recipients} thành công
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" onClick={exportHistory} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Xuất lịch sử CSV
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Sticky Action Buttons - Always visible at bottom */}
        <div className="shrink-0 border-t pt-4 mt-2 space-y-2 bg-background">
          {/* Nút GỬI NGAY khi chưa có items */}
          {activeTab === "send" && items.length === 0 && !isProcessing && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Đóng
              </Button>
              <Button 
                onClick={handleDirectSend} 
                className="flex-1 sm:flex-[2] bg-gradient-to-r from-[#00FF7F] via-emerald-400 to-[#00FF7F] hover:from-[#00FF7F] hover:via-emerald-500 hover:to-[#00FF7F] text-black font-bold shadow-lg shadow-[#00FF7F]/30 animate-pulse-glow" 
                disabled={!manualInput.trim() || (useUniformAmount && !uniformAmount) || !previewData || previewData.count === 0 || previewData.total > maxAmount}
                size="lg"
              >
                <span className="text-xl mr-2">💚</span>
                <span className="hidden sm:inline">
                  {previewData && previewData.count > 0 
                    ? `Chia sẻ phước lành đến ${previewData.count} tâm hồn ✨`
                    : `Nhập địa chỉ để gửi`
                  }
                </span>
                <span className="sm:hidden">
                  {previewData && previewData.count > 0 
                    ? `Gửi ${previewData.count} 💚`
                    : `Gửi`
                  }
                </span>
              </Button>
            </div>
          )}

          {/* Action buttons when items are loaded */}
          {activeTab === "send" && items.length > 0 && (
            <div className="flex gap-2">
              {!isProcessing && (
                <>
                  <Button variant="outline" onClick={() => setItems([])} className="flex-1">
                    Quay lại
                  </Button>
                  {failCount > 0 && (
                    <Button variant="outline" onClick={exportFailed}>
                      <Download className="h-4 w-4 mr-1" />
                      Xuất lỗi
                    </Button>
                  )}
                </>
              )}
              
              {items.some((i) => i.status === "pending") && (
                <Button
                  onClick={handleBulkSend}
                  disabled={isProcessing || totalAmount > maxAmount}
                  className="flex-1 bg-gradient-to-r from-[#00FF7F] to-emerald-400 hover:from-[#00FF7F] hover:to-emerald-500 text-black font-bold"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang chia sẻ phước lành...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💚</span>
                      Gửi {items.filter((i) => i.status === "pending").length} tâm hồn
                    </>
                  )}
                </Button>
              )}

              {!items.some((i) => i.status === "pending") && !isProcessing && (
                <Button onClick={handleClose} className="flex-1" size="lg">
                  Đóng
                </Button>
              )}
            </div>
          )}

          {/* Nút đóng cho tab History */}
          {activeTab === "history" && (
            <Button variant="outline" onClick={handleClose} className="w-full">
              Đóng
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
