import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/layout/BottomNav";

const tokens = [
  { symbol: "BNB", name: "BNB", icon: "/tokens/bnb.svg", price: 631.00 },
  { symbol: "ETH", name: "Ethereum", icon: "/tokens/eth.svg", price: 3450.00 },
  { symbol: "BTC", name: "Bitcoin", icon: "/tokens/btc.svg", price: 98500.00 },
  { symbol: "USDT", name: "Tether", icon: "/tokens/usdt.svg", price: 1.00 },
  { symbol: "CAMLY", name: "CAMLY Token", icon: "/tokens/camly.png", price: 0.0001 },
];

const Trading = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("quick");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [selectedToken, setSelectedToken] = useState("BNB");
  const [payToken, setPayToken] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);
  const payTokenData = tokens.find(t => t.symbol === payToken);

  // Calculate amounts
  useEffect(() => {
    if (amount && selectedTokenData && payTokenData) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        const usdValue = amountNum * selectedTokenData.price;
        const payValue = usdValue / payTokenData.price;
        setPayAmount(payValue.toFixed(2));
      }
    } else {
      setPayAmount("");
    }
  }, [amount, selectedToken, payToken, selectedTokenData, payTokenData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fee = payAmount ? (parseFloat(payAmount) * 0.001).toFixed(2) : "0.00";
  const total = payAmount ? (parseFloat(payAmount) + parseFloat(fee)).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Giao dịch</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="quick" className="font-semibold">Mua bán nhanh</TabsTrigger>
          <TabsTrigger value="spot" className="font-semibold">Spot Trading</TabsTrigger>
        </TabsList>

        {/* Quick Trade */}
        <TabsContent value="quick" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Buy/Sell Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => setTradeType("buy")}
              className={`flex-1 py-3 font-semibold transition-all ${
                tradeType === "buy"
                  ? "bg-success text-success-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Mua
            </button>
            <button
              onClick={() => setTradeType("sell")}
              className={`flex-1 py-3 font-semibold transition-all ${
                tradeType === "sell"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Bán
            </button>
          </div>

          {/* Token Selection */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {tradeType === "buy" ? "Bạn muốn mua" : "Bạn muốn bán"}
                </label>
                <div className="flex gap-2">
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.filter(t => t.symbol !== "USDT").map(token => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 text-right text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {tradeType === "buy" ? "Thanh toán bằng" : "Nhận về"}
                </label>
                <div className="flex gap-2">
                  <Select value={payToken} onValueChange={setPayToken}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map(token => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    value={payAmount}
                    readOnly
                    className="flex-1 text-right text-lg font-semibold bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá thị trường</span>
                <span className="font-medium">
                  ${selectedTokenData?.price.toLocaleString()}/{selectedToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí giao dịch (0.1%)</span>
                <span className="font-medium">{fee} {payToken}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Tổng</span>
                <span className="font-bold text-lg">{total} {payToken}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button 
            className={`w-full h-14 text-lg font-semibold ${
              tradeType === "buy" 
                ? "bg-success hover:bg-success/90 text-success-foreground" 
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            }`}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {tradeType === "buy" ? `Mua ${selectedToken}` : `Bán ${selectedToken}`}
          </Button>
        </TabsContent>

        {/* Spot Trading */}
        <TabsContent value="spot" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Market Info */}
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/tokens/bnb.svg" alt="BNB" className="w-10 h-10" />
                  <div>
                    <h3 className="font-heading font-bold">BNB/USDT</h3>
                    <p className="text-xs text-muted-foreground">Binance Coin</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">$631.00</p>
                  <p className="text-sm text-success flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +2.5%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Placeholder */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex gap-2 mb-4">
                {["1m", "5m", "15m", "1h", "4h", "1d"].map(tf => (
                  <Button
                    key={tf}
                    variant={tf === "1h" ? "default" : "ghost"}
                    size="sm"
                    className={tf === "1h" ? "bg-primary text-primary-foreground" : ""}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
              <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Biểu đồ nến sẽ hiển thị ở đây</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Form */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <Tabs defaultValue="limit" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="stop">Stop</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Giá (USDT)</label>
                  <Input type="number" placeholder="631.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Số lượng (BNB)</label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>

              {/* Percentage Slider */}
              <div className="flex gap-2">
                {[25, 50, 75, 100].map(pct => (
                  <Button key={pct} variant="outline" size="sm" className="flex-1">
                    {pct}%
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-success hover:bg-success/90 text-success-foreground h-12 font-semibold">
                  Mua / Long
                </Button>
                <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-12 font-semibold">
                  Bán / Short
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Open Orders */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Lệnh đang mở</h3>
              <div className="text-center py-6 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có lệnh nào</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Trading;
