import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, Users, Wallet, Building2, Globe, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useWallet, TokenBalance } from "@/hooks/useWallet";
import { sendBNB, sendToken, isValidAddress } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import { TransactionConfirmDialog } from "@/components/wallet/TransactionConfirmDialog";

const banks = [
  { id: "vcb", name: "Vietcombank", logo: "🏦" },
  { id: "tcb", name: "Techcombank", logo: "🏦" },
  { id: "mb", name: "MB Bank", logo: "🏦" },
  { id: "acb", name: "ACB", logo: "🏦" },
];

const Transfer = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { activeWallet, balances, balanceLoading, getPrivateKey, refreshBalances } = useWallet();
  
  const [activeTab, setActiveTab] = useState("crypto");
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Fiat withdrawal
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedTokenData = balances.find(t => t.symbol === selectedToken);
  const networkFee = "0.0005";
  const total = amount ? (parseFloat(amount) + parseFloat(networkFee)).toFixed(6) : "0";

  // Fiat calculations
  const exchangeRate = 24500;
  const fiatFee = withdrawAmount ? (parseFloat(withdrawAmount) * 0.01).toFixed(2) : "0";
  const vndAmount = withdrawAmount ? (parseFloat(withdrawAmount) * exchangeRate).toLocaleString() : "0";
  const isKycVerified = false; // TODO: Connect to KYC hook

  const handleSendCrypto = async () => {
    if (!activeWallet || !amount || !recipientAddress) return;

    // Validate address
    if (!isValidAddress(recipientAddress)) {
      toast({
        title: "Địa chỉ không hợp lệ",
        description: "Vui lòng nhập địa chỉ ví hợp lệ",
        variant: "destructive",
      });
      return;
    }

    // Get private key
    const privateKey = getPrivateKey(activeWallet.address);
    if (!privateKey) {
      toast({
        title: "Không tìm thấy private key",
        description: "Bạn cần import private key để thực hiện giao dịch",
        variant: "destructive",
      });
      return;
    }

    // Check balance
    const balance = parseFloat(selectedTokenData?.balance || "0");
    const sendAmount = parseFloat(amount);
    if (sendAmount > balance) {
      toast({
        title: "Số dư không đủ",
        description: `Bạn chỉ có ${balance} ${selectedToken}`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let result: { hash: string };
      
      if (selectedToken === "BNB") {
        result = await sendBNB(privateKey, recipientAddress, amount);
      } else {
        const tokenAddress = selectedTokenData?.address;
        if (!tokenAddress) {
          throw new Error("Token address not found");
        }
        result = await sendToken(privateKey, tokenAddress, recipientAddress, amount);
      }

      setTxHash(result.hash);

      // Save transaction to database
      if (user && activeWallet) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          wallet_id: activeWallet.id,
          tx_hash: result.hash,
          tx_type: "send",
          token_symbol: selectedToken,
          token_address: selectedTokenData?.address || null,
          amount: amount,
          from_address: activeWallet.address,
          to_address: recipientAddress,
          status: "pending",
        });
      }

      toast({
        title: "🎉 Giao dịch thành công!",
        description: `Đã gửi ${amount} ${selectedToken}`,
      });

      // Refresh balances
      refreshBalances();

      // Reset form
      setAmount("");
      setRecipientAddress("");
      setShowConfirmDialog(false);
    } catch (error: any) {
      console.error("Send error:", error);
      toast({
        title: "Giao dịch thất bại",
        description: error.message || "Không thể thực hiện giao dịch",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleMaxAmount = () => {
    if (!selectedTokenData) return;
    
    let maxAmount = parseFloat(selectedTokenData.balance);
    if (selectedToken === "BNB") {
      // Reserve gas for BNB
      maxAmount = Math.max(0, maxAmount - 0.001);
    }
    setAmount(maxAmount.toString());
  };

  // Transaction success view
  if (txHash) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => {
                setTxHash(null);
                navigate("/dashboard");
              }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-heading font-bold">Giao dịch thành công</h1>
            </div>
          </div>
        </div>

        <div className="px-4 py-8 space-y-6 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success animate-scale-bounce" />
          </div>

          <div>
            <h2 className="text-2xl font-bold rainbow-text">Đã gửi thành công!</h2>
            <p className="text-muted-foreground mt-2">
              {amount} {selectedToken} đang được gửi đến người nhận
            </p>
          </div>

          <Card className="glass-card">
            <CardContent className="p-4 space-y-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số lượng</span>
                <span className="font-semibold">{amount} {selectedToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Người nhận</span>
                <span className="font-mono text-xs">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TX Hash</span>
                <a 
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, "_blank")}
            >
              Xem trên BscScan
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => {
                setTxHash(null);
                navigate("/history");
              }}
            >
              Xem lịch sử
            </Button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Chuyển tiền</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="crypto" className="text-xs sm:text-sm font-semibold">
            <Wallet className="w-4 h-4 mr-1 hidden sm:block" />
            Crypto
          </TabsTrigger>
          <TabsTrigger value="fiat" className="text-xs sm:text-sm font-semibold">
            <Building2 className="w-4 h-4 mr-1 hidden sm:block" />
            Rút Fiat
          </TabsTrigger>
          <TabsTrigger value="bulk" className="text-xs sm:text-sm font-semibold">
            <Users className="w-4 h-4 mr-1 hidden sm:block" />
            Hàng loạt
          </TabsTrigger>
        </TabsList>

        {/* Crypto Transfer */}
        <TabsContent value="crypto" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Token Selection */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Chọn token</label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      balances.map(token => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <div className="flex items-center gap-2">
                              <img src={token.logo} alt={token.symbol} className="w-5 h-5 rounded-full" />
                              <span>{token.symbol}</span>
                            </div>
                            <span className="text-muted-foreground text-sm">
                              {parseFloat(token.balance).toFixed(4)}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Địa chỉ người nhận</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button variant="outline" size="icon">
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                {recipientAddress && !isValidAddress(recipientAddress) && (
                  <p className="text-xs text-destructive">Địa chỉ không hợp lệ</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-muted-foreground">Số lượng</label>
                  <span className="text-xs text-muted-foreground">
                    Số dư: {parseFloat(selectedTokenData?.balance || "0").toFixed(4)} {selectedToken}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleMaxAmount}
                  >
                    Max
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network fee (ước tính)</span>
                <span className="font-medium">~{networkFee} BNB</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Tổng gửi</span>
                <span className="font-bold">{amount || "0"} {selectedToken}</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 glow text-primary-foreground font-semibold text-lg"
            disabled={!amount || !recipientAddress || !isValidAddress(recipientAddress) || sending}
            onClick={() => setShowConfirmDialog(true)}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi ngay"
            )}
          </Button>
        </TabsContent>

        {/* Fiat Withdrawal */}
        <TabsContent value="fiat" className="px-4 mt-4 space-y-4 animate-fade-in">
          {!isKycVerified && (
            <Card className="border-warning bg-warning/10">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-warning">Cần xác minh danh tính</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bạn cần hoàn thành KYC để rút tiền về ngân hàng
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-warning text-warning hover:bg-warning/10"
                    onClick={() => navigate("/kyc")}
                  >
                    Xác minh ngay
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Chọn ngân hàng</label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngân hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <span>{bank.logo}</span>
                          <span>{bank.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Số tài khoản</label>
                <Input
                  placeholder="1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tên chủ tài khoản</label>
                <Input
                  placeholder="NGUYEN VAN A"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Số tiền rút (USD)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="100"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <Button variant="outline" size="sm">Max</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tỷ giá</span>
                <span className="font-medium">1 USD = {exchangeRate.toLocaleString()} VND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí rút (1%)</span>
                <span className="font-medium">${fiatFee}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Nhận về</span>
                <span className="font-bold text-success">{vndAmount} VND</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 glow text-primary-foreground font-semibold text-lg"
            disabled={!isKycVerified || !withdrawAmount || !selectedBank || !accountNumber}
          >
            {isKycVerified ? "Rút tiền" : "Xác minh KYC trước"}
          </Button>

          {/* Global ATM Section */}
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Rút tiền ATM toàn cầu</h3>
                  <p className="text-xs text-muted-foreground">Hỗ trợ 150+ quốc gia</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Tìm ATM gần bạn
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Transfer */}
        <TabsContent value="bulk" className="px-4 mt-4 space-y-4 animate-fade-in">
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-6 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-primary opacity-80" />
              <h3 className="text-lg font-semibold mb-2">Gửi hàng loạt</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Gửi token đến nhiều địa chỉ cùng lúc. Hỗ trợ upload CSV hoặc nhập thủ công.
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate("/dashboard")}
              >
                Mở Bulk Transfer
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Hướng dẫn sử dụng</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Chọn token muốn gửi
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Upload file CSV hoặc nhập danh sách địa chỉ
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Xác nhận và ký giao dịch
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Theo dõi trạng thái từng giao dịch
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <TransactionConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        tokenSymbol={selectedToken}
        amount={amount}
        recipient={recipientAddress}
        networkFee={networkFee}
        onConfirm={handleSendCrypto}
        loading={sending}
      />

      <BottomNav />
    </div>
  );
};

export default Transfer;
