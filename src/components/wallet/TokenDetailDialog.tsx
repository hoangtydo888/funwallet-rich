import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Send, Download, ArrowLeftRight, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatPrice, formatChange, formatMarketCap, type TokenPrice } from "@/lib/priceTracker";
import type { TokenBalance } from "@/hooks/useWallet";
import { formatBalance } from "@/lib/wallet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface TokenDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenBalance | null;
  price: TokenPrice | null;
  onSend?: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
}

// Generate mock chart data for demo
const generateChartData = (basePrice: number, days: number = 7) => {
  const data = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let i = days; i >= 0; i--) {
    const variation = (Math.random() - 0.5) * 0.15;
    const price = basePrice * (1 + variation);
    const date = new Date(now - i * dayMs);
    data.push({
      date: date.toLocaleDateString("vi-VN", { weekday: "short" }),
      price: price,
      timestamp: date.getTime(),
    });
  }
  
  return data;
};

export const TokenDetailDialog = ({
  open,
  onOpenChange,
  token,
  price,
  onSend,
  onReceive,
  onSwap,
}: TokenDetailDialogProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  useEffect(() => {
    if (price?.price) {
      const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30;
      setChartData(generateChartData(price.price, days));
    }
  }, [price?.price, timeRange]);

  if (!token) return null;

  const balance = parseFloat(token.balance) || 0;
  const usdValue = price ? balance * price.price : 0;
  const isPositive = (price?.change24h ?? 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
              <img
                src={token.logo}
                alt={token.symbol}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `<span class="text-xl font-bold">${token.symbol.charAt(0)}</span>`;
                  }
                }}
              />
            </div>
            <div>
              <span className="text-xl">{token.symbol}</span>
              <p className="text-sm text-muted-foreground font-normal">{token.name}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Section */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá hiện tại</p>
                {price ? (
                  <p className="text-3xl font-bold">{formatPrice(price.price)}</p>
                ) : (
                  <Skeleton className="h-9 w-32" />
                )}
              </div>
              {price && (
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className={`flex items-center gap-1 ${
                    isPositive ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatChange(price.change24h)}
                </Badge>
              )}
            </div>
          </div>

          {/* Balance Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Số dư của bạn</p>
            <p className="text-2xl font-bold font-mono">{formatBalance(token.balance)} {token.symbol}</p>
            <p className="text-sm text-muted-foreground">≈ {formatPrice(usdValue)}</p>
          </div>

          {/* Chart Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Biểu đồ giá</p>
              <div className="flex gap-1">
                {(["24h", "7d", "30d"] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTimeRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="h-[180px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis 
                      hide 
                      domain={["dataMin * 0.95", "dataMax * 1.05"]} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [formatPrice(value), "Giá"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
            </div>
          </div>

          {/* Market Info */}
          {price && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs">Cao 24h</span>
                </div>
                <p className="font-semibold">{formatPrice(price.high24h)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs">Thấp 24h</span>
                </div>
                <p className="font-semibold">{formatPrice(price.low24h)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ArrowLeftRight className="h-4 w-4" />
                  <span className="text-xs">Volume 24h</span>
                </div>
                <p className="font-semibold">{formatMarketCap(price.volume24h)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Market Cap</span>
                </div>
                <p className="font-semibold">{formatMarketCap(price.marketCap)}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => {
                onOpenChange(false);
                onSend?.();
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Send className="h-5 w-5" />
              <span className="text-xs">Gửi</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onReceive?.();
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">Nhận</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                onSwap?.();
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <ArrowLeftRight className="h-5 w-5" />
              <span className="text-xs">Swap</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};