import { useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wallet, Gift } from 'lucide-react';

interface DataItem {
  created_at: string;
}

interface StatisticsChartProps {
  users: DataItem[];
  wallets: DataItem[];
  rewards: DataItem[];
  days: number;
}

const StatisticsChart = ({ users, wallets, rewards, days }: StatisticsChartProps) => {
  const chartData = useMemo(() => {
    const endDate = startOfDay(new Date());
    const startDate = subDays(endDate, days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return dateRange.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'dd/MM', { locale: vi });

      const usersCount = users.filter((u) => {
        const uDate = format(startOfDay(new Date(u.created_at)), 'yyyy-MM-dd');
        return uDate === dateStr;
      }).length;

      const walletsCount = wallets.filter((w) => {
        const wDate = format(startOfDay(new Date(w.created_at)), 'yyyy-MM-dd');
        return wDate === dateStr;
      }).length;

      const rewardsCount = rewards.filter((r) => {
        const rDate = format(startOfDay(new Date(r.created_at)), 'yyyy-MM-dd');
        return rDate === dateStr;
      }).length;

      return {
        date: displayDate,
        users: usersCount,
        wallets: walletsCount,
        rewards: rewardsCount,
      };
    });
  }, [users, wallets, rewards, days]);

  const totals = useMemo(() => {
    return {
      users: chartData.reduce((sum, d) => sum + d.users, 0),
      wallets: chartData.reduce((sum, d) => sum + d.wallets, 0),
      rewards: chartData.reduce((sum, d) => sum + d.rewards, 0),
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users mới ({days} ngày)</p>
                <p className="text-2xl font-bold text-blue-500">{totals.users}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallets mới ({days} ngày)</p>
                <p className="text-2xl font-bold text-green-500">{totals.wallets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Gift className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rewards ({days} ngày)</p>
                <p className="text-2xl font-bold text-purple-500">{totals.rewards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-500" />
            Users đăng ký theo ngày
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Wallets & Rewards Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-green-500" />
            Wallets & Rewards theo ngày
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="wallets" name="Wallets" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rewards" name="Rewards" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsChart;
