import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon } from "lucide-react";

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  address: string | null;
  decimals: number;
  logo: string;
}

interface PortfolioChartsProps {
  balances: TokenBalance[];
  totalBalance: number;
}

// Mock price data for demo
const MOCK_PRICES: Record<string, number> = {
  BNB: 650,
  USDT: 1,
  USDC: 1,
  BUSD: 1,
};

// Colors for pie chart
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
];

export const PortfolioCharts = ({ balances, totalBalance }: PortfolioChartsProps) => {
  // Calculate portfolio allocation
  const allocation = useMemo(() => {
    return balances
      .map((token) => {
        const balance = parseFloat(token.balance) || 0;
        const price = MOCK_PRICES[token.symbol] || 0;
        const value = balance * price;
        return {
          name: token.symbol,
          value,
          balance,
          percentage: totalBalance > 0 ? ((value / totalBalance) * 100).toFixed(1) : "0",
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [balances, totalBalance]);

  // Generate mock historical data
  const historicalData = useMemo(() => {
    const now = Date.now();
    const days = 30;
    const data = [];

    let currentValue = totalBalance * 0.8; // Start 20% lower

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const variation = (Math.random() - 0.3) * currentValue * 0.05;
      currentValue = Math.max(0, currentValue + variation);

      data.push({
        date: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        value: currentValue,
      });
    }

    // Last point is current balance
    data[data.length - 1].value = totalBalance;

    return data;
  }, [totalBalance]);

  // Calculate PnL
  const pnl = useMemo(() => {
    const startValue = historicalData[0]?.value || 0;
    const currentValue = totalBalance;
    const change = currentValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
    return { change, changePercent, isPositive: change >= 0 };
  }, [historicalData, totalBalance]);

  if (totalBalance === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Chưa có tài sản để hiển thị biểu đồ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PnL Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-1">Tổng tài sản</p>
          <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-1">Lợi nhuận (30 ngày)</p>
          <div className="flex items-center gap-2">
            {pnl.isPositive ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            <span
              className={`text-2xl font-bold ${
                pnl.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {pnl.isPositive ? "+" : ""}
              {pnl.changePercent.toFixed(2)}%
            </span>
          </div>
          <p className={`text-sm ${pnl.isPositive ? "text-success" : "text-destructive"}`}>
            {pnl.isPositive ? "+" : ""}${pnl.change.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Area Chart - Portfolio Value Over Time */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-semibold mb-4">Giá trị tài sản theo thời gian</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={historicalData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Giá trị"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Pie Chart - Asset Allocation */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-semibold mb-4">Phân bổ tài sản</h4>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={allocation}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {allocation.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Giá trị"]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {allocation.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">${item.value.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
