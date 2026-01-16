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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, Loader2, ExternalLink, AlertCircle, Heart, Sparkles } from "lucide-react";
import { sendBNB, sendToken, isValidAddress, BSC_MAINNET, formatBalance, getBNBBalance, getTokenBalance } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import type { TokenBalance } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Gas estimate for a single transfer
const GAS_PER_TRANSFER = 0.00021; // ~21000 gas * 10 gwei

// Helper: Cắt số thập phân để tránh floating point errors (làm tròn xuống)
const truncateDecimals = (num: number, decimals: number): string => {
  const multiplier = Math.pow(10, decimals);
  const truncated = Math.floor(num * multiplier) / multiplier;
  return truncated.toString();
};

interface SendCryptoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  activeWallet: { id: string; address: string } | null;
  balances: TokenBalance[];
  getPrivateKey: (address: string) => string | null;
  onSuccess: () => void;
}

export const SendCryptoDialog = ({
  open,
  onOpenChange,
  walletAddress,
  activeWallet,
  balances,
  getPrivateKey,
  onSuccess,
}: SendCryptoDialogProps) => {
  const { user } = useAuth();
  // Ưu tiên CAMLY làm token mặc định nếu có trong balances
  const [selectedToken, setSelectedToken] = useState(() => {
    const camly = balances.find(b => b.symbol === "CAMLY");
    return camly ? "CAMLY" : "BNB";
  });
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const selectedBalance = balances.find((b) => b.symbol === selectedToken);
  const maxAmount = parseFloat(selectedBalance?.balance || "0");

  const handleSend = async () => {
    if (!isValidAddress(recipient)) {
      toast({
        title: "Địa chỉ không hợp lệ",
        description: "Vui lòng nhập địa chỉ ví hợp lệ",
        variant: "destructive",
      });
      return;
    }

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      toast({
        title: "Số lượng không hợp lệ",
        description: "Vui lòng nhập số lượng hợp lệ",
        variant: "destructive",
      });
      return;
    }

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

    setLoading(true);

    // Kiểm tra số dư thực tế từ blockchain trước khi gửi
    const tokenData = balances.find((b) => b.symbol === selectedToken);
    const realBalance = selectedToken === "BNB"
      ? await getBNBBalance(walletAddress)
      : await getTokenBalance(tokenData?.address || "", walletAddress);
    
    const realBalanceNum = parseFloat(realBalance);
    console.log(`[SEND] Token: ${selectedToken}, Real balance: ${realBalance}, Amount: ${amount}`);

    if (sendAmount > realBalanceNum) {
      setLoading(false);
      toast({
        title: "Số dư thực tế không đủ!",
        description: `Blockchain balance: ${formatBalance(realBalance)} ${selectedToken}. Bạn muốn gửi: ${amount}`,
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra BNB cho gas nếu gửi token
    if (selectedToken !== "BNB") {
      const bnbBalance = await getBNBBalance(walletAddress);
      if (parseFloat(bnbBalance) < GAS_PER_TRANSFER) {
        setLoading(false);
        toast({
          title: "Không đủ BNB cho phí gas",
          description: `Cần ít nhất ${GAS_PER_TRANSFER} BNB. Hiện có: ${parseFloat(bnbBalance).toFixed(6)} BNB`,
          variant: "destructive",
        });
        return;
      }
    }

    let result;
    if (selectedToken === "BNB") {
      result = await sendBNB(privateKey, recipient, amount);
    } else {
      if (!tokenData?.address) {
        setLoading(false);
        return;
      }
      // sendToken now auto-fetches decimals from blockchain
      result = await sendToken(privateKey, tokenData.address, recipient, amount, tokenData.decimals);
    }

    setLoading(false);

    if ("error" in result) {
      toast({
        title: "Giao dịch thất bại",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setTxHash(result.hash);
      
      // Lưu giao dịch vào database
      if (user && activeWallet) {
        const tokenData = balances.find((b) => b.symbol === selectedToken);
        await supabase.from("transactions").insert({
          user_id: user.id,
          wallet_id: activeWallet.id,
          tx_hash: result.hash,
          tx_type: "send",
          token_symbol: selectedToken,
          token_address: tokenData?.address || null,
          amount: amount,
          from_address: walletAddress,
          to_address: recipient,
          status: "pending",
        });
      }
      
      toast({
        title: "Phước lành đã được chia sẻ! ❤️🌈",
        description: `Đã gửi ${amount} ${selectedToken}`,
      });
      onSuccess();
    }
  };

  const handleClose = () => {
    setRecipient("");
    setAmount("");
    setTxHash("");
    setSelectedToken("BNB");
    onOpenChange(false);
  };

  const setMaxAmount = () => {
    // Leave some BNB for gas if sending BNB
    if (selectedToken === "BNB") {
      const maxWithGas = Math.max(0, maxAmount - 0.001);
      // Làm tròn xuống 8 decimals để tránh floating point errors
      setAmount(truncateDecimals(maxWithGas, 8));
    } else {
      // Cắt bớt decimals để đảm bảo không vượt quá balance thực tế
      setAmount(truncateDecimals(maxAmount, 8));
    }
  };

  if (txHash) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#00FF7F] flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500 animate-pulse" />
              Phước lành đã được chia sẻ! ❤️🌈
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#00FF7F]/30 via-yellow-500/30 to-pink-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="h-10 w-10 text-[#00FF7F]" />
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-[#00FF7F] to-emerald-400 bg-clip-text text-transparent">
                {amount} {selectedToken}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Năng lượng yêu thương đã được gửi đi! 💚
              </p>
            </div>

            <a
              href={`${BSC_MAINNET.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[#00FF7F] hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Xem trên BscScan
            </a>

            <Button 
              onClick={handleClose} 
              className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
            >
              Tuyệt vời! ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Gửi Crypto</DialogTitle>
          <DialogDescription>
            Gửi BNB hoặc tokens trên BNB Chain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Chọn token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <img 
                      src={selectedBalance?.logo} 
                      alt={selectedToken} 
                      className="w-5 h-5 rounded-full"
                    />
                    <span>{selectedToken}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {/* Sắp xếp: CAMLY đầu tiên, sau đó theo thứ tự có số dư */}
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
                      <span className="font-medium">{token.symbol}</span>
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

          <div className="space-y-2">
            <Label>Địa chỉ người nhận</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Số lượng</Label>
              <button
                type="button"
                onClick={setMaxAmount}
                className="text-xs text-primary hover:underline"
              >
                Max: {formatBalance(maxAmount.toString())} {selectedToken}
              </button>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="any"
            />
          </div>

          {/* Gas estimate */}
          {parseFloat(amount) > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground p-2 bg-muted/50 rounded-lg">
              <span>Phí gas ước tính:</span>
              <span className="font-mono">~{GAS_PER_TRANSFER} BNB</span>
            </div>
          )}

          {selectedToken === "BNB" && parseFloat(amount) > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Hãy giữ lại một ít BNB để trả phí gas cho các giao dịch sau</p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={loading || !recipient || !amount}
            className="w-full bg-[#00FF7F] hover:bg-[#00FF7F]/90 text-black font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Chia sẻ phước lành 💚
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};