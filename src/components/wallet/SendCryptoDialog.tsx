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
import { ArrowUpRight, Loader2, ExternalLink, AlertCircle, Fuel } from "lucide-react";
import { sendBNB, sendToken, isValidAddress, BSC_MAINNET, formatBalance, getBNBBalance, getTokenBalance } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import type { TokenBalance } from "@/hooks/useWallet";

interface SendCryptoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  balances: TokenBalance[];
  getPrivateKey: (address: string) => string | null;
  onSuccess: () => void;
}

export const SendCryptoDialog = ({
  open,
  onOpenChange,
  walletAddress,
  balances,
  getPrivateKey,
  onSuccess,
}: SendCryptoDialogProps) => {
  const [selectedToken, setSelectedToken] = useState("BNB");
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

    // Kiểm tra balance thực tế từ blockchain
    setLoading(true);
    console.log("=== DEBUG SEND ===");
    console.log("Wallet:", walletAddress);
    console.log("Token:", selectedToken);
    console.log("Token decimals from balances:", selectedBalance?.decimals);
    console.log("Cached balance:", selectedBalance?.balance);

    const realBalance = selectedToken === "BNB"
      ? await getBNBBalance(walletAddress)
      : await getTokenBalance(selectedBalance?.address || "", walletAddress);

    console.log("Real balance from blockchain:", realBalance);
    console.log("Amount to send:", amount);
    console.log("==================");

    const realBalanceNum = parseFloat(realBalance);
    if (sendAmount > realBalanceNum) {
      setLoading(false);
      toast({
        title: "Số dư thực tế không đủ",
        description: `Số dư trên blockchain: ${formatBalance(realBalance)} ${selectedToken}. Bạn muốn gửi: ${sendAmount}`,
        variant: "destructive",
      });
      return;
    }

    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      setLoading(false);
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key. Vui lòng import lại ví.",
        variant: "destructive",
      });
      return;
    }

    let result;
    if (selectedToken === "BNB") {
      result = await sendBNB(privateKey, recipient, amount);
    } else {
      const token = balances.find((b) => b.symbol === selectedToken);
      if (!token?.address) {
        setLoading(false);
        return;
      }
      // sendToken sẽ tự động lấy decimals từ blockchain
      result = await sendToken(privateKey, token.address, recipient, amount);
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
      setAmount(maxWithGas.toString());
    } else {
      setAmount(maxAmount.toString());
    }
  };

  if (txHash) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-success">Phước lành đã được chia sẻ! ❤️🌈</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <ArrowUpRight className="h-8 w-8 text-success" />
              </div>
              <p className="text-2xl font-bold">
                {amount} {selectedToken}
              </p>
              <p className="text-muted-foreground text-sm mt-1">đã được gửi</p>
            </div>

            <a
              href={`${BSC_MAINNET.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Xem trên BscScan
            </a>

            <Button onClick={handleClose} className="w-full">
              Đóng
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
                {balances.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <img 
                        src={token.logo} 
                        alt={token.symbol} 
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="font-medium">{token.symbol}</span>
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
          <div className="flex items-center justify-between text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              <span>Phí gas ước tính:</span>
            </div>
            <span>~0.0002 BNB (~$0.12)</span>
          </div>

          {selectedToken === "BNB" && parseFloat(amount) > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Hãy giữ lại một ít BNB để trả phí gas cho các giao dịch sau</p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={loading || !recipient || !amount}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Gửi {selectedToken}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};