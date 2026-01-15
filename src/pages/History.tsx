import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ExternalLink, 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Layers, Palette, Coins, Search,
  Loader2, FileText, FileSpreadsheet, Globe, Database
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { toast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { getAllTransactions, formatTxValue, getTxDirection, type Transaction as BlockchainTx } from "@/lib/bscscan";

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
  source: 'blockchain' | 'database';
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
  const { activeWallet } = useWallet();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTxIds, setNewTxIds] = useState<Set<string>>(new Set());

  // Fetch blockchain transactions from BSCScan
  const { data: blockchainTxs = [], isLoading: blockchainLoading, refetch: refetchBlockchain } = useQuery({
    queryKey: ['blockchain-transactions', activeWallet?.address],
    queryFn: async () => {
      if (!activeWallet?.address) return [];
      return getAllTransactions(activeWallet.address, 1, 50);
    },
    enabled: !!activeWallet?.address,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch database transactions from Supabase
  const { data: dbTransactions = [], isLoading: dbLoading, refetch: refetchDb } = useQuery({
    queryKey: ['db-transactions', user?.id],
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
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isLoading = blockchainLoading || dbLoading;

  // Combine blockchain and database transactions
  const allTransactions = useMemo(() => {
    const walletAddress = activeWallet?.address?.toLowerCase() || '';
    
    // Format blockchain transactions
    const blockchainFormatted: Transaction[] = blockchainTxs.map((tx: BlockchainTx) => {
      const direction = getTxDirection(tx, walletAddress);
      const decimals = tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 18;
      
      return {
        id: tx.hash,
        tx_type: direction === 'in' ? 'receive' : 'send',
        token_symbol: tx.tokenSymbol || 'BNB',
        amount: formatTxValue(tx.value, decimals),
        from_address: tx.from,
        to_address: tx.to,
        status: tx.isError === '0' ? 'success' : 'failed',
        tx_hash: tx.hash,
        created_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        tx_timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        source: 'blockchain' as const,
      };
    });
    
    // Format database transactions
    const dbFormatted: Transaction[] = dbTransactions.map((tx: any) => ({
      ...tx,
      source: 'database' as const,
    }));
    
    // Merge and sort by date (newest first)
    // Remove duplicates by tx_hash
    const txMap = new Map<string, Transaction>();
    
    [...blockchainFormatted, ...dbFormatted].forEach(tx => {
      if (!txMap.has(tx.tx_hash)) {
        txMap.set(tx.tx_hash, tx);
      }
    });
    
    return Array.from(txMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [blockchainTxs, dbTransactions, activeWallet?.address]);

  const refetch = () => {
    refetchBlockchain();
    refetchDb();
  };

  // Real-time subscription for new transactions
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTx = payload.new as Transaction;
          // Mark as new for animation
          setNewTxIds(prev => new Set(prev).add(newTx.id));
          // Clear animation after 3 seconds
          setTimeout(() => {
            setNewTxIds(prev => {
              const next = new Set(prev);
              next.delete(newTx.id);
              return next;
            });
          }, 3000);
          
          // Refetch to get updated list
          queryClient.invalidateQueries({ queryKey: ['transactions', user.id] });
          
          toast({
            title: "📬 Giao dịch mới",
            description: `${newTx.tx_type === 'send' ? 'Gửi' : 'Nhận'} ${newTx.amount} ${newTx.token_symbol}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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

  const filteredTransactions = allTransactions.filter(tx => {
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

  // Export to CSV function
  const exportToCSV = (txs: Transaction[]) => {
    const headers = ['Ngày', 'Loại', 'Token', 'Số lượng', 'Từ', 'Đến', 'Trạng thái', 'TX Hash'];
    const rows = txs.map(tx => [
      format(parseISO(tx.tx_timestamp || tx.created_at), 'dd/MM/yyyy HH:mm'),
      tx.tx_type,
      tx.token_symbol,
      tx.amount,
      tx.from_address,
      tx.to_address,
      tx.status,
      tx.tx_hash
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Export to PDF function
  const exportToPDF = (txs: Transaction[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');

    // Title
    doc.setFontSize(18);
    doc.text('FUN Wallet - Lịch sử giao dịch', 14, 20);
    doc.setFontSize(10);
    doc.text(`Xuất ngày: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
    doc.text(`Tổng số giao dịch: ${txs.length}`, 14, 34);

    // Table
    const tableData = txs.map(tx => [
      format(parseISO(tx.tx_timestamp || tx.created_at), 'dd/MM/yyyy HH:mm'),
      tx.tx_type.toUpperCase(),
      tx.token_symbol,
      tx.amount,
      tx.status === 'success' ? 'Thành công' : tx.status === 'pending' ? 'Đang xử lý' : 'Thất bại',
      tx.tx_hash.slice(0, 20) + '...'
    ]);

    (doc as any).autoTable({
      head: [['Ngày', 'Loại', 'Token', 'Số lượng', 'Trạng thái', 'TX Hash']],
      body: tableData,
      startY: 42,
      headStyles: { fillColor: [0, 200, 83] },
      styles: { fontSize: 9 },
      columnStyles: {
        5: { cellWidth: 50 }
      }
    });

    doc.save(`transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
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
              const isNew = newTxIds.has(tx.id);
              
              return (
                <Card 
                  key={tx.id} 
                  className={`glass-card token-card-hover cursor-pointer transition-all duration-300 ${
                    isNew ? 'ring-2 ring-primary animate-pulse' : ''
                  }`}
                >
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{txTime}</span>
                            {tx.source === 'blockchain' && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Globe className="w-3 h-3" />
                                On-chain
                              </Badge>
                            )}
                            {tx.source === 'database' && (
                              <Badge variant="outline" className="text-xs gap-1 bg-primary/10">
                                <Database className="w-3 h-3" />
                                In-app
                              </Badge>
                            )}
                          </div>
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
                <Button 
                  variant="outline" 
                  className="flex-1 btn-hover-scale"
                  onClick={() => exportToCSV(filteredTransactions)}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 btn-hover-scale"
                  onClick={() => exportToPDF(filteredTransactions)}
                >
                  <FileText className="w-4 h-4 mr-2" />
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
