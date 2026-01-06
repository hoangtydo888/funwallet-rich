import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, Users, Wallet, Building2, Globe, AlertCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/layout/BottomNav";

const tokens = [
  { symbol: "BNB", name: "BNB", icon: "/tokens/bnb.svg", balance: "2.5" },
  { symbol: "USDT", name: "Tether", icon: "/tokens/usdt.svg", balance: "1,500" },
  { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", balance: "0.5" },
  { symbol: "CAMLY", name: "CAMLY", icon: "/tokens/camly.png", balance: "1,000,000" },
];

const savedAddresses = [
  { name: "Ví chính", address: "0x1234...5678" },
  { name: "Bạn A", address: "0x3456...7890" },
];

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
  const [activeTab, setActiveTab] = useState("crypto");
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  
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

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);
  const networkFee = "0.0005";
  const total = amount ? (parseFloat(amount) + parseFloat(networkFee)).toFixed(4) : "0";

  // Fiat calculations
  const exchangeRate = 24500;
  const fiatFee = withdrawAmount ? (parseFloat(withdrawAmount) * 0.01).toFixed(2) : "0";
  const vndAmount = withdrawAmount ? (parseFloat(withdrawAmount) * exchangeRate).toLocaleString() : "0";
  const isKycVerified = false; // Mock

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Đã copy địa chỉ" });
  };

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
                    {tokens.map(token => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-2">
                            <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                            <span>{token.symbol}</span>
                          </div>
                          <span className="text-muted-foreground text-sm">
                            Balance: {token.balance}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
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
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Saved Addresses */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Chọn từ danh bạ</label>
                <div className="flex gap-2 flex-wrap">
                  {savedAddresses.map((addr) => (
                    <Button
                      key={addr.address}
                      variant="outline"
                      size="sm"
                      onClick={() => setRecipientAddress(addr.address)}
                      className="text-xs"
                    >
                      {addr.name}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="text-xs border-dashed">
                    + Thêm
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Số lượng</label>
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
                    onClick={() => setAmount(selectedTokenData?.balance.replace(/,/g, "") || "0")}
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
                <span className="text-muted-foreground">Network fee</span>
                <span className="font-medium">{networkFee} {selectedToken}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Tổng gửi</span>
                <span className="font-bold">{total} {selectedToken}</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 glow text-primary-foreground font-semibold text-lg"
            disabled={!amount || !recipientAddress}
          >
            Gửi ngay
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

      <BottomNav />
    </div>
  );
};

export default Transfer;
