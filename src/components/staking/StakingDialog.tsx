import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  STAKING_POOLS, 
  StakingPool, 
  stakeTokens, 
  unstakeTokens, 
  claimRewards,
  calculateRewards
} from "@/lib/staking";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  TrendingUp, 
  Lock, 
  Gift, 
  ExternalLink,
  Clock
} from "lucide-react";
import { BSC_MAINNET } from "@/lib/wallet";

interface StakingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  getPrivateKey: (address: string) => string | null;
  onSuccess?: () => void;
}

export const StakingDialog = ({
  open,
  onOpenChange,
  walletAddress,
  getPrivateKey,
  onSuccess
}: StakingDialogProps) => {
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");

  // Mock user stakes (in production, fetch from contract)
  const [userStakes] = useState<Record<string, { amount: string; rewards: string }>>({
    "cake-pool": { amount: "100", rewards: "2.45" },
  });

  const handleStake = async () => {
    if (!selectedPool || !amount) return;
    
    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await stakeTokens(privateKey, selectedPool.id, amount);
      
      if (result.success) {
        toast({
          title: "Stake thành công!",
          description: (
            <div className="flex items-center gap-2">
              <span>Đã stake {amount} {selectedPool.tokenSymbol}</span>
              <a 
                href={`${BSC_MAINNET.explorer}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Xem TX
              </a>
            </div>
          ),
        });
        setAmount("");
        onSuccess?.();
      } else {
        toast({
          title: "Stake thất bại",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể stake",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!selectedPool || !amount) return;
    
    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy private key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await unstakeTokens(privateKey, selectedPool.id, amount);
      
      if (result.success) {
        toast({
          title: "Unstake thành công!",
          description: `Đã rút ${amount} ${selectedPool.tokenSymbol}`,
        });
        setAmount("");
        onSuccess?.();
      } else {
        toast({
          title: "Unstake thất bại",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể unstake",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async (poolId: string) => {
    const privateKey = getPrivateKey(walletAddress);
    if (!privateKey) return;

    setLoading(true);
    try {
      const result = await claimRewards(privateKey, poolId);
      
      if (result.success) {
        toast({
          title: "Claim thành công!",
          description: "Phần thưởng đã được gửi vào ví của bạn",
        });
        onSuccess?.();
      } else {
        toast({
          title: "Claim thất bại",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedRewards = selectedPool && amount
    ? calculateRewards(parseFloat(amount) || 0, selectedPool.apy, 30)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Staking Pools
          </DialogTitle>
          <DialogDescription>
            Stake tokens vào PancakeSwap để nhận lợi nhuận
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pool Selection */}
          <div className="space-y-2">
            <Label>Chọn Pool</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {STAKING_POOLS.map((pool) => (
                <button
                  key={pool.id}
                  onClick={() => setSelectedPool(pool)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedPool?.id === pool.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pool.logo}</span>
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">
                          TVL: {pool.tvl}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{pool.apy}% APY</p>
                      {pool.lockPeriod > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {pool.lockPeriod} ngày
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedPool && (
            <>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stake" | "unstake")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stake">Stake</TabsTrigger>
                  <TabsTrigger value="unstake">Unstake</TabsTrigger>
                </TabsList>

                <TabsContent value="stake" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Số lượng {selectedPool.tokenSymbol}</Label>
                    <Input
                      type="number"
                      placeholder={`Min: ${selectedPool.minStake}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={selectedPool.minStake}
                      step="0.01"
                    />
                  </div>

                  {/* Estimated rewards */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">APY</span>
                      <span className="text-success font-medium">{selectedPool.apy}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ước tính 30 ngày</span>
                      <span className="font-medium">
                        +{estimatedRewards.toFixed(4)} {selectedPool.rewardToken}
                      </span>
                    </div>
                    {selectedPool.lockPeriod > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lock period</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedPool.lockPeriod} ngày
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleStake}
                    disabled={loading || !amount || parseFloat(amount) < parseFloat(selectedPool.minStake)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TrendingUp className="h-4 w-4 mr-2" />
                    )}
                    Stake {selectedPool.tokenSymbol}
                  </Button>
                </TabsContent>

                <TabsContent value="unstake" className="space-y-4 mt-4">
                  {/* User stakes */}
                  {userStakes[selectedPool.id] ? (
                    <>
                      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Đang stake</span>
                          <span className="font-medium">
                            {userStakes[selectedPool.id].amount} {selectedPool.tokenSymbol}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phần thưởng</span>
                          <span className="text-success font-medium">
                            +{userStakes[selectedPool.id].rewards} {selectedPool.rewardToken}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Số lượng unstake</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          max={userStakes[selectedPool.id].amount}
                          step="0.01"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleClaimRewards(selectedPool.id)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Gift className="h-4 w-4 mr-2" />
                          )}
                          Claim
                        </Button>
                        <Button
                          onClick={handleUnstake}
                          disabled={loading || !amount}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Unstake
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Bạn chưa stake trong pool này</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-center">
                <a
                  href="https://pancakeswap.finance/farms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Xem trên PancakeSwap
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
