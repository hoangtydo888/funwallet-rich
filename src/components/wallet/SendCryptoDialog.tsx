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
import { ArrowUpRight, Loader2, ExternalLink, AlertCircle, Fuel, Wallet, Heart } from "lucide-react";
import { isValidAddress, BSC_MAINNET, formatBalance, getBNBBalance, getTokenBalance } from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import type { TokenBalance } from "@/hooks/useWallet";
import { ConnectWalletModal } from "@/components/walletconnect/ConnectWalletModal";
import { useWalletConnect } from "@/hooks/useWalletConnect";

interface SendCryptoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  balances: TokenBalance[];
  onSuccess: () => void;
}

export const SendCryptoDialog = ({
  open,
  onOpenChange,
  walletAddress,
  balances,
  onSuccess,
}: SendCryptoDialogProps) => {
  const walletConnect = useWalletConnect();
  
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);

  const selectedBalance = balances.find((b) => b.symbol === selectedToken);
  const maxAmount = parseFloat(selectedBalance?.balance || "0");

  // Check if connected wallet matches
  const isWalletConnected = walletConnect.isConnected && 
    walletConnect.address?.toLowerCase() === walletAddress.toLowerCase();

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

    // Check if wallet is connected
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }

    // Kiểm tra balance thực tế từ blockchain
    setLoading(true);

    const realBalance = selectedToken === "BNB"
      ? await getBNBBalance(walletAddress)
      : await getTokenBalance(selectedBalance?.address || "", walletAddress);

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

    await executeSend();
  };

  const executeSend = async () => {
    setLoading(true);

    try {
      let txHashResult: string | null = null;
      
      if (selectedToken === "BNB") {
        txHashResult = await walletConnect.sendNative(recipient, amount);
      } else {
        const token = balances.find((b) => b.symbol === selectedToken);
        if (!token?.address) {
          setLoading(false);
          return;
        }
        const decimals = token.decimals || 18;
        txHashResult = await walletConnect.sendToken(token.address, recipient, amount, decimals);
      }

      setLoading(false);

      if (txHashResult) {
        setTxHash(txHashResult);
        toast({
          title: "Phước lành đã được chia sẻ! ❤️🌈",
          description: `Đã gửi ${amount} ${selectedToken}`,
        });
        onSuccess();
      }
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
      toast({
        title: "Giao dịch thất bại",
        description: errorMessage,
        variant: "destructive",
      });
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

  // Handle connect wallet success
  const handleWalletConnected = async () => {
    setShowConnectModal(false);
    // Continue with send after connecting
    if (recipient && amount) {
      await executeSend();
    }
  };

  if (txHash) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-success flex items-center gap-2">
              Phước lành đã được chia sẻ! 
              <Heart className="h-5 w-5 text-red-400 animate-pulse" />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <ArrowUpRight className="h-8 w-8 text-emerald-500" />
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              Gửi Crypto
              <Heart className="h-4 w-4 text-red-400" />
            </DialogTitle>
            <DialogDescription>
              Gửi BNB hoặc tokens trên BNB Chain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Wallet Connection Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              {isWalletConnected ? (
                <span className="flex items-center gap-2 text-sm text-emerald-500">
                  <Wallet className="h-4 w-4" />
                  Ví đã kết nối: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} ❤️
                </span>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Chưa kết nối ví</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConnectModal(true)}
                    className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <Wallet className="h-4 w-4 mr-1" />
                    Kết nối
                  </Button>
                </>
              )}
            </div>

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
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black"
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

      {/* WalletConnect Modal */}
      <ConnectWalletModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onConnect={async () => {
          const address = await walletConnect.connect();
          if (address) {
            handleWalletConnected();
          }
          return address;
        }}
        isConnecting={walletConnect.isConnecting}
      />
    </>
  );
};
