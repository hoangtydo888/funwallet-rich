import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Filter, Calendar, Download, ExternalLink, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Layers, Palette, Coins, Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/layout/BottomNav";

const mockTransactions = [
  {
    id: "1",
    type: "send",
    token: "USDT",
    amount: "-100",
    usdValue: "$99.50",
    address: "0x1234...5678",
    date: "2026-01-06",
    time: "14:30",
    status: "success",
    hash: "0xabc123...",
  },
  {
    id: "2",
    type: "receive",
    token: "BNB",
    amount: "+0.5",
    usdValue: "$315.50",
    address: "0xabcd...efgh",
    date: "2026-01-06",
    time: "12:15",
    status: "success",
    hash: "0xdef456...",
  },
  {
    id: "3",
    type: "swap",
    token: "BNB → USDT",
    amount: "0.3 → 189.30",
    usdValue: "$189.30",
    address: "",
    date: "2026-01-05",
    time: "16:45",
    status: "success",
    hash: "0xghi789...",
  },
  {
    id: "4",
    type: "stake",
    token: "CAMLY",
    amount: "50,000",
    usdValue: "$50.00",
    address: "CAMLY Premium Pool",
    date: "2026-01-05",
    time: "10:00",
    status: "active",
    hash: "0xjkl012...",
  },
  {
    id: "5",
    type: "mint",
    token: "Gold Badge NFT",
    amount: "1",
    usdValue: "0.1 BNB",
    address: "",
    date: "2026-01-04",
    time: "09:30",
    status: "success",
    hash: "0xmno345...",
  },
];

const typeIcons: Record<string, any> = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: RefreshCw,
  stake: Layers,
  mint: Palette,
};

const typeColors: Record<string, string> = {
  send: "text-destructive",
  receive: "text-success",
  swap: "text-secondary",
  stake: "text-primary",
  mint: "text-accent",
};

const statusColors: Record<string, string> = {
  success: "bg-success/20 text-success",
  pending: "bg-warning/20 text-warning",
  failed: "bg-destructive/20 text-destructive",
  active: "bg-primary/20 text-primary",
};

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredTransactions = mockTransactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (searchQuery && !tx.token.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const date = tx.date === new Date().toISOString().split("T")[0] 
      ? "Hôm nay" 
      : tx.date === new Date(Date.now() - 86400000).toISOString().split("T")[0]
        ? "Hôm qua"
        : tx.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, typeof mockTransactions>);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Lịch sử giao dịch</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="send">Gửi</SelectItem>
              <SelectItem value="receive">Nhận</SelectItem>
              <SelectItem value="swap">Swap</SelectItem>
              <SelectItem value="stake">Stake</SelectItem>
              <SelectItem value="mint">Mint</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction Groups */}
        {Object.entries(groupedTransactions).map(([date, transactions]) => (
          <div key={date} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-1">── {date} ──</p>
            
            {transactions.map((tx) => {
              const Icon = typeIcons[tx.type] || Coins;
              return (
                <Card key={tx.id} className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${typeColors[tx.type]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold capitalize">
                              {tx.type === "send" ? "Gửi" : 
                               tx.type === "receive" ? "Nhận" :
                               tx.type === "swap" ? "Swap" :
                               tx.type === "stake" ? "Stake" : "Mint"} {tx.token}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {tx.address || (tx.type === "swap" ? "DEX" : "NFT Collection")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${tx.amount.startsWith("-") ? "text-destructive" : tx.amount.startsWith("+") ? "text-success" : ""}`}>
                              {tx.amount}
                            </p>
                            <p className="text-sm text-muted-foreground">{tx.usdValue}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{tx.time}</span>
                          <Badge className={`text-xs ${statusColors[tx.status]}`}>
                            {tx.status === "success" ? "✅ Success" :
                             tx.status === "pending" ? "⏳ Pending" :
                             tx.status === "active" ? "🔄 Active" : "❌ Failed"}
                          </Badge>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-xs text-secondary p-0 h-auto"
                        >
                          Xem trên BSCScan
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Coins className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Không có giao dịch nào</p>
            </CardContent>
          </Card>
        )}

        {/* Export Options */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3">Xuất báo cáo</h4>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default History;
