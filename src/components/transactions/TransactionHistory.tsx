import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import {
  getAllTransactions,
  formatTxValue,
  getTxDirection,
  formatTimestamp,
  type Transaction,
} from "@/lib/bscscan";
import { formatAddress, BSC_MAINNET } from "@/lib/wallet";

interface TransactionHistoryProps {
  walletAddress: string;
}

export const TransactionHistory = ({ walletAddress }: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "token" | "native">("all");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const txs = await getAllTransactions(walletAddress, 1, 50);
    setTransactions(txs);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress, fetchTransactions]);

  useEffect(() => {
    let result = [...transactions];

    // Apply filter
    if (filter === "in") {
      result = result.filter((tx) => getTxDirection(tx, walletAddress) === "in");
    } else if (filter === "out") {
      result = result.filter((tx) => getTxDirection(tx, walletAddress) === "out");
    } else if (filter === "token") {
      result = result.filter((tx) => tx.type === "token");
    } else if (filter === "native") {
      result = result.filter((tx) => tx.type === "native");
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.hash.toLowerCase().includes(searchLower) ||
          tx.from.toLowerCase().includes(searchLower) ||
          tx.to.toLowerCase().includes(searchLower) ||
          tx.tokenSymbol?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTxs(result);
  }, [transactions, filter, search, walletAddress]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm hash, địa chỉ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="in">Nhận</SelectItem>
              <SelectItem value="out">Gửi</SelectItem>
              <SelectItem value="native">BNB</SelectItem>
              <SelectItem value="token">Tokens</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTxs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Không có giao dịch nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTxs.map((tx) => {
            const direction = getTxDirection(tx, walletAddress);
            const isIn = direction === "in";
            const decimals = tx.tokenDecimal ? parseInt(tx.tokenDecimal) : 18;

            return (
              <div
                key={`${tx.hash}-${tx.type}-${tx.tokenSymbol || ''}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isIn ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {isIn ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {isIn ? "Nhận" : "Gửi"} {tx.tokenSymbol || "BNB"}
                    </span>
                    {tx.type === "token" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        BEP-20
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isIn ? "Từ" : "Đến"}: {formatAddress(isIn ? tx.from : tx.to)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(tx.timeStamp)}
                  </div>
                </div>

                {/* Amount and Link */}
                <div className="text-right">
                  <div className={`font-semibold ${isIn ? "text-success" : "text-destructive"}`}>
                    {isIn ? "+" : "-"}
                    {formatTxValue(tx.value, decimals)} {tx.tokenSymbol || "BNB"}
                  </div>
                  <a
                    href={`${BSC_MAINNET.explorer}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    BscScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
