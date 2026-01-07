import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Lock, Flame, Star, Gift, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useStaking, STAKING_POOLS, type StakingPool, type StakingPosition } from "@/hooks/useStaking";
import { differenceInDays, parseISO, format } from "date-fns";
import BottomNav from "@/components/layout/BottomNav";

const Earn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    activePositions, 
    isLoading, 
    totalStaked, 
    totalEarned, 
    averageApy,
    stake,
    claim,
    unstake,
    isStaking,
    isClaiming,
    isUnstaking,
    pools
  } = useStaking();

  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");

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

  const handleStakeClick = (pool: StakingPool) => {
    setSelectedPool(pool);
    setStakeAmount("");
    setStakeDialogOpen(true);
  };

  const handleConfirmStake = () => {
    if (!selectedPool || !stakeAmount) return;
    
    stake({ pool: selectedPool, amount: stakeAmount }, {
      onSuccess: () => {
        setStakeDialogOpen(false);
        setSelectedPool(null);
        setStakeAmount("");
      }
    });
  };

  const handleClaim = (positionId: string) => {
    claim(positionId);
  };

  const handleUnstake = (position: StakingPosition) => {
    // Check if locked
    if (position.ends_at && new Date(position.ends_at) > new Date()) {
      return; // Still locked
    }
    unstake(position.id);
  };

  const getRemainingDays = (position: StakingPosition) => {
    if (!position.ends_at) return null;
    const endsAt = parseISO(position.ends_at);
    const remaining = differenceInDays(endsAt, new Date());
    return Math.max(0, remaining);
  };

  const getProgress = (position: StakingPosition) => {
    if (!position.ends_at || position.lock_days === 0) return 100;
    const remaining = getRemainingDays(position) || 0;
    return Math.round(((position.lock_days - remaining) / position.lock_days) * 100);
  };

  const getPoolIcon = (token: string) => {
    const iconMap: Record<string, string> = {
      'CAMLY': '/tokens/camly.png',
      'BNB': '/tokens/bnb.png',
      'ETH': '/tokens/eth.svg',
      'USDT': '/tokens/usdt.svg',
    };
    return iconMap[token] || '/tokens/default.svg';
  };

  return (
    <div className="min-h-screen bg-background pb-24 page-fade-in">
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
        <div className="grid grid-cols-3 gap-3 slide-up">
          <Card className="gradient-border overflow-hidden">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Tổng Stake</p>
              <p className="text-lg font-bold rainbow-text">
                {isLoading ? "..." : `$${totalStaked.toLocaleString()}`}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">APY TB</p>
              <p className="text-lg font-bold text-success">
                {isLoading ? "..." : `${averageApy.toFixed(1)}%`}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Đã nhận</p>
              <p className="text-lg font-bold text-success">
                {isLoading ? "..." : `+$${totalEarned.toFixed(2)}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Staking Pools */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">Staking Pools</h2>
          
          {pools.map((pool, index) => (
            <Card key={pool.name} className="gradient-border overflow-hidden card-hover-lift">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getPoolIcon(pool.token)} 
                      alt={pool.token}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{pool.name}</p>
                        {pool.apy >= 4 && pool.lockDays > 0 && (
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
                    <Progress value={pool.fillPercentage} className="w-20 h-2" />
                    <span className="text-xs text-muted-foreground">{pool.fillPercentage}%</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold btn-hover-scale"
                  onClick={() => handleStakeClick(pool)}
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
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activePositions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Gift className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Bạn chưa stake token nào</p>
                <p className="text-sm text-muted-foreground mt-1">Hãy chọn pool phía trên để bắt đầu kiếm lợi nhuận!</p>
              </CardContent>
            </Card>
          ) : (
            activePositions.map((position) => {
              const remainingDays = getRemainingDays(position);
              const progress = getProgress(position);
              const isLocked = remainingDays !== null && remainingDays > 0;
              
              return (
                <Card key={position.id} className="glass-card border-primary/20 card-hover-lift">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getPoolIcon(position.token_symbol)} 
                          alt={position.token_symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/tokens/default.svg"; }}
                        />
                        <div>
                          <p className="font-semibold">{position.pool_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Staked: {parseFloat(position.amount).toLocaleString()} {position.token_symbol}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">
                          +{parseFloat(position.earned || '0').toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{position.token_symbol} earned</p>
                      </div>
                    </div>

                    {position.lock_days > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isLocked ? `${remainingDays} ngày còn lại` : "Đã mở khóa"}
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 bg-primary btn-hover-scale"
                        onClick={() => handleClaim(position.id)}
                        disabled={isClaiming}
                      >
                        {isClaiming ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="w-4 h-4 mr-1" />
                            Claim
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-hover-scale"
                        onClick={() => handleUnstake(position)}
                        disabled={isLocked || isUnstaking}
                      >
                        {isUnstaking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isLocked ? (
                          `Unstake (${remainingDays}d)`
                        ) : (
                          "Unstake"
                        )}
                      </Button>
                    </div>
                    {isLocked && position.lock_days > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        *Unstake sớm sẽ bị phạt 10%
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Stake Dialog */}
      <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stake {selectedPool?.token}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPool && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <img 
                    src={getPoolIcon(selectedPool.token)} 
                    alt={selectedPool.token}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{selectedPool.name}</p>
                    <p className="text-sm text-muted-foreground">
                      APY: {selectedPool.apy}% • Lock: {selectedPool.lockDays > 0 ? `${selectedPool.lockDays} ngày` : 'Linh hoạt'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stakeAmount">Số lượng stake</Label>
                  <Input
                    id="stakeAmount"
                    type="number"
                    placeholder={`Min: ${selectedPool.minStake} ${selectedPool.token}`}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                </div>

                <div className="p-3 bg-success/10 rounded-lg text-sm">
                  <p className="text-muted-foreground">Lợi nhuận dự kiến (30 ngày):</p>
                  <p className="font-bold text-success">
                    +{(parseFloat(stakeAmount || '0') * (selectedPool.apy / 100) / 12).toFixed(4)} {selectedPool.token}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStakeDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleConfirmStake}
              disabled={!stakeAmount || parseFloat(stakeAmount) < parseFloat(selectedPool?.minStake || '0') || isStaking}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {isStaking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Xác nhận Stake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Earn;
