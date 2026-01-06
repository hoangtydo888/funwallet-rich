import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Lock, Flame, Star, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/layout/BottomNav";

const stakingPools = [
  {
    id: "camly-premium",
    name: "CAMLY Premium Pool",
    token: "CAMLY",
    icon: "/tokens/camly.png",
    apy: 45,
    lockDays: 30,
    tvl: "2.3M",
    minStake: "1,000",
    filled: 75,
    isHot: true,
  },
  {
    id: "bnb-flex",
    name: "BNB Staking",
    token: "BNB",
    icon: "/tokens/bnb.svg",
    apy: 8.5,
    lockDays: 0,
    tvl: "15M",
    minStake: "0.1",
    filled: 45,
    isHot: false,
  },
  {
    id: "eth-premium",
    name: "ETH Premium Pool",
    token: "ETH",
    icon: "/tokens/eth.svg",
    apy: 12,
    lockDays: 60,
    tvl: "8.5M",
    minStake: "0.05",
    filled: 60,
    isHot: false,
  },
  {
    id: "usdt-stable",
    name: "USDT Stable Yield",
    token: "USDT",
    icon: "/tokens/usdt.svg",
    apy: 15,
    lockDays: 14,
    tvl: "25M",
    minStake: "100",
    filled: 85,
    isHot: true,
  },
];

const myStakes = [
  {
    id: "1",
    poolName: "CAMLY Premium Pool",
    token: "CAMLY",
    icon: "/tokens/camly.png",
    staked: 50000,
    earned: 2500,
    daysRemaining: 15,
    totalDays: 30,
  },
];

const Earn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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

  const totalStaked = 5432.10;
  const avgApy = 15.2;
  const totalEarned = 234.56;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Earn</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tổng Stake</p>
              <p className="text-lg font-bold rainbow-text">${totalStaked.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">APY TB</p>
              <p className="text-lg font-bold text-success">{avgApy}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Đã nhận</p>
              <p className="text-lg font-bold text-success">+${totalEarned}</p>
            </CardContent>
          </Card>
        </div>

        {/* Staking Pools */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">Staking Pools</h2>
          
          {stakingPools.map((pool) => (
            <Card key={pool.id} className="gradient-border overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={pool.icon} 
                      alt={pool.token}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{pool.name}</p>
                        {pool.isHot && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            <Flame className="w-3 h-3 mr-0.5" />
                            HOT
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>TVL: ${pool.tvl}</span>
                        <span>•</span>
                        <span>Min: {pool.minStake} {pool.token}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-success">{pool.apy}%</p>
                    <p className="text-xs text-muted-foreground">APY</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {pool.lockDays > 0 ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Lock: {pool.lockDays} ngày</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Linh hoạt</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pool.filled} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground">{pool.filled}%</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold"
                >
                  Stake Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Stakes */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            My Active Stakes
          </h2>
          
          {myStakes.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Bạn chưa stake token nào</p>
                <p className="text-sm text-muted-foreground mt-1">Hãy chọn pool phía trên để bắt đầu kiếm lợi nhuận!</p>
              </CardContent>
            </Card>
          ) : (
            myStakes.map((stake) => (
              <Card key={stake.id} className="glass-card border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={stake.icon} 
                        alt={stake.token}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                      />
                      <div>
                        <p className="font-semibold">{stake.poolName}</p>
                        <p className="text-xs text-muted-foreground">
                          Staked: {stake.staked.toLocaleString()} {stake.token}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">+{stake.earned.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{stake.token} earned</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stake.daysRemaining} ngày còn lại
                      </span>
                      <span>{Math.round(((stake.totalDays - stake.daysRemaining) / stake.totalDays) * 100)}%</span>
                    </div>
                    <Progress 
                      value={((stake.totalDays - stake.daysRemaining) / stake.totalDays) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="flex-1 bg-primary">
                      <Gift className="w-4 h-4 mr-1" />
                      Claim
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Unstake*
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    *Unstake sớm sẽ bị phạt 10%
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Earn;
