import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Plus, TrendingUp, TrendingDown, Clock, Gift, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { formatBalance } from "@/lib/wallet";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import BottomNav from "@/components/layout/BottomNav";

const Wallet = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallets, activeWallet, balanceLoading, refreshBalances, balances } = useWallet();
  const [activeTab, setActiveTab] = useState("spot");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Transform balances for display
  const tokens = balances.map(b => ({
    symbol: b.symbol,
    name: b.name,
    address: b.address,
    balance: b.balance,
    icon: b.logo,
    usdValue: "$0.00", // Would need price data
  }));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSpotValue = tokens.reduce((acc, token) => {
    const value = parseFloat(token.usdValue?.replace(/[^0-9.-]/g, "") || "0");
    return acc + value;
  }, 0);

  // Mock earn data
  const earnPositions = [
    {
      id: "1",
      token: "CAMLY",
      symbol: "CAMLY",
      staked: "500,000",
      earned: "+2,500",
      apy: "45%",
      lockDays: 30,
      progress: 75,
      icon: "/tokens/camly.png",
    },
    {
      id: "2",
      token: "BNB",
      symbol: "BNB",
      staked: "2.5",
      earned: "+0.02",
      apy: "8.5%",
      lockDays: 0,
      progress: 100,
      icon: "/tokens/bnb.png",
    },
  ];

  const totalEarnValue = 1500;
  const totalEarned = 45.67;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Ví của tôi</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshBalances}
            disabled={balanceLoading}
          >
            <RefreshCw className={`w-5 h-5 ${balanceLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="spot" className="font-semibold">Spot Wallet</TabsTrigger>
          <TabsTrigger value="earn" className="font-semibold">Earn Wallet</TabsTrigger>
        </TabsList>

        {/* Spot Wallet */}
        <TabsContent value="spot" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Total Value Card */}
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Tổng giá trị Spot</p>
              <h2 className="text-3xl font-heading font-bold rainbow-text">
                ${totalSpotValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success font-medium">+5.2% hôm nay</span>
              </div>
            </CardContent>
          </Card>

          {/* Token List */}
          <div className="space-y-2">
            <h3 className="text-lg font-heading font-semibold px-1">Tokens</h3>
            
            {tokens.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Chưa có token nào</p>
                </CardContent>
              </Card>
            ) : (
              tokens.map((token) => (
                <Card 
                  key={token.address || token.symbol} 
                  className="glass-card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={token.icon} 
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                      />
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatBalance(token.balance, 4)}</p>
                      <p className="text-sm text-muted-foreground">{token.usdValue}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Import Token Button */}
            <Button 
              variant="outline" 
              className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Import Token
            </Button>
          </div>
        </TabsContent>

        {/* Earn Wallet */}
        <TabsContent value="earn" className="px-4 mt-4 space-y-4 animate-fade-in">
          {/* Earn Summary */}
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tổng staking</p>
                  <h2 className="text-2xl font-heading font-bold text-foreground">
                    ${totalEarnValue.toLocaleString()}
                  </h2>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lợi nhuận</p>
                  <h2 className="text-2xl font-heading font-bold text-success flex items-center gap-1">
                    <Gift className="w-5 h-5" />
                    +${totalEarned.toFixed(2)}
                  </h2>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staking Positions */}
          <div className="space-y-2">
            <h3 className="text-lg font-heading font-semibold px-1">Vị thế staking</h3>
            
            {earnPositions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Chưa có vị thế staking nào</p>
                  <Button className="mt-4 bg-primary" onClick={() => navigate("/earn")}>
                    Stake ngay
                  </Button>
                </CardContent>
              </Card>
            ) : (
              earnPositions.map((position) => (
                <Card key={position.id} className="gradient-border overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={position.icon} 
                          alt={position.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                        />
                        <div>
                          <p className="font-semibold">{position.token} Staking Pool</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            APY: {position.apy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                        {position.lockDays > 0 ? (
                          <>
                            <Lock className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">{position.lockDays} ngày</span>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-primary">Linh hoạt</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Đang stake</p>
                        <p className="font-semibold">{position.staked} {position.symbol}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Đã nhận</p>
                        <p className="font-semibold text-success">{position.earned} {position.symbol}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Thời gian</span>
                        <span>{position.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                          style={{ width: `${position.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Claim
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Unstake
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Explore Pools */}
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => navigate("/earn")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Khám phá Staking Pools
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Wallet;
