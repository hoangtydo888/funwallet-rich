import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Filter, Calendar, Download, ExternalLink, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Layers, Palette, Coins, Search,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

interface Transaction {
  id: string;
  tx_type: string;
  token_symbol: string;
  amount: string;
  from_address: string;
  to_address: string;
  status: string;
  tx_hash: string;
  created_at: string;
  tx_timestamp: string | null;
}

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

  // Fetch real transactions from Supabase
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
      
      return (data || []) as Transaction[];
    },
    enabled: !!user?.id,
  });

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

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== "all" && tx.tx_type !== filter) return false;
    if (searchQuery && !tx.token_symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const txDate = parseISO(tx.tx_timestamp || tx.created_at);
    let dateLabel: string;
    
    if (isToday(txDate)) {
      dateLabel = "Hôm nay";
    } else if (isYesterday(txDate)) {
      dateLabel = "Hôm qua";
    } else {
      dateLabel = format(txDate, "dd/MM/yyyy", { locale: vi });
    }
    
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayAmount = (tx: Transaction) => {
    if (tx.tx_type === "send") return `-${tx.amount}`;
    if (tx.tx_type === "receive") return `+${tx.amount}`;
    return tx.amount;
  };

  const openBscScan = (hash: string) => {
    window.open(`https://bscscan.com/tx/${hash}`, '_blank');
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
            <h1 className="text-xl font-heading font-bold">Lịch sử giao dịch</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Transaction Groups */}
        {!isLoading && Object.entries(groupedTransactions).map(([date, txs]) => (
          <div key={date} className="space-y-2 slide-up">
            <p className="text-sm font-medium text-muted-foreground px-1">── {date} ──</p>
            
            {txs.map((tx) => {
              const Icon = typeIcons[tx.tx_type] || Coins;
              const txTime = format(parseISO(tx.tx_timestamp || tx.created_at), "HH:mm");
              
              return (
                <Card key={tx.id} className="glass-card token-card-hover cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${typeColors[tx.tx_type]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold capitalize">
                              {tx.tx_type === "send" ? "Gửi" : 
                               tx.tx_type === "receive" ? "Nhận" :
                               tx.tx_type === "swap" ? "Swap" :
                               tx.tx_type === "stake" ? "Stake" : "Mint"} {tx.token_symbol}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {tx.tx_type === "send" 
                                ? `Đến: ${formatAddress(tx.to_address)}`
                                : tx.tx_type === "receive"
                                  ? `Từ: ${formatAddress(tx.from_address)}`
                                  : formatAddress(tx.to_address) || "Smart Contract"
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              tx.tx_type === "send" ? "text-destructive" : 
                              tx.tx_type === "receive" ? "text-success" : ""
                            }`}>
                              {getDisplayAmount(tx)} {tx.token_symbol}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{txTime}</span>
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
                          onClick={() => openBscScan(tx.tx_hash)}
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

        {!isLoading && filteredTransactions.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Coins className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Không có giao dịch nào</p>
              <p className="text-sm text-muted-foreground mt-1">
                Các giao dịch của bạn sẽ hiển thị ở đây
              </p>
            </CardContent>
          </Card>
        )}

        {/* Export Options */}
        {filteredTransactions.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Xuất báo cáo</h4>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 btn-hover-scale">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" className="flex-1 btn-hover-scale">
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default History;
