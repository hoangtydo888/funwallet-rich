import { useState, useEffect } from "react";
import { formatBalance } from "@/lib/wallet";
import type { TokenBalance } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, StarOff, ChevronRight } from "lucide-react";
import { fetchTokenPrices, formatPrice, formatChange, saveFavorites, loadFavorites, type TokenPrice } from "@/lib/priceTracker";
import { TokenDetailDialog } from "./TokenDetailDialog";

interface TokenListProps {
  balances: TokenBalance[];
  loading: boolean;
  onSend?: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
}

type FilterType = "all" | "balance" | "favorites";

export const TokenList = ({ balances, loading, onSend, onReceive, onSwap }: TokenListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  // Fetch prices on mount and every 30 seconds
  useEffect(() => {
    const symbols = balances.map(b => b.symbol);
    if (symbols.length === 0) return;

    const fetchPrices = async () => {
      setPricesLoading(true);
      const data = await fetchTokenPrices(symbols);
      setPrices(data);
      setPricesLoading(false);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [balances]);

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  };

  const getPrice = (symbol: string): TokenPrice | undefined => {
    return prices.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  };

  // Filter and search tokens
  const filteredBalances = balances.filter(token => {
    // Search filter
    const matchesSearch = 
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Type filter
    switch (filter) {
      case "balance":
        return parseFloat(token.balance) > 0;
      case "favorites":
        return favorites.includes(token.symbol);
      default:
        return true;
    }
  });

  // Calculate total USD value with null checks
  const totalUsdValue = balances.reduce((sum, token) => {
    const price = getPrice(token.symbol);
    const balance = parseFloat(token.balance) || 0;
    const priceValue = price?.price ?? 0;
    return sum + (balance * priceValue);
  }, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total USD Value */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
        <p className="text-sm text-muted-foreground">Tổng giá trị USD</p>
        <p className="text-2xl font-bold">{formatPrice(totalUsdValue)}</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Tất cả
          </Button>
          <Button
            variant={filter === "balance" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("balance")}
          >
            Có số dư
          </Button>
          <Button
            variant={filter === "favorites" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("favorites")}
          >
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {filteredBalances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Không tìm thấy token
          </div>
        ) : (
          filteredBalances.map((token) => {
            const balance = parseFloat(token.balance);
            const hasBalance = balance > 0;
            const price = getPrice(token.symbol);
            const usdValue = price ? balance * price.price : 0;
            const isFavorite = favorites.includes(token.symbol);

            return (
              <div
                key={token.symbol}
                className={`flex items-center gap-3 p-4 rounded-xl transition-colors cursor-pointer ${
                  hasBalance ? "bg-muted/50 hover:bg-muted" : "bg-muted/20 hover:bg-muted/30"
                }`}
                onClick={() => {
                  setSelectedToken(token);
                  setDetailOpen(true);
                }}
              >
                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(token.symbol)}
                  className="text-muted-foreground hover:text-yellow-500 transition-colors"
                >
                  {isFavorite ? (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </button>

                {/* Token icon */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                  <img 
                    src={token.logo} 
                    alt={token.symbol} 
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = `<span class="text-lg font-bold">${token.symbol.charAt(0)}</span>`;
                      }
                    }}
                  />
                </div>

                {/* Token info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{token.symbol}</p>
                    {price && !pricesLoading && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        price.change24h >= 0 
                          ? "bg-green-500/20 text-green-500" 
                          : "bg-red-500/20 text-red-500"
                      }`}>
                        {formatChange(price.change24h)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{token.name}</p>
                </div>

                {/* Price */}
                <div className="text-right hidden sm:block">
                  {pricesLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : price ? (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(price.price)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>

                {/* Balance */}
                <div className="text-right">
                  <p className={`font-mono ${hasBalance ? "font-semibold" : "text-muted-foreground"}`}>
                    {formatBalance(token.balance)}
                  </p>
                  {hasBalance && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatPrice(usdValue)}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })
        )}
      </div>

      {/* Token Detail Dialog */}
      <TokenDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        token={selectedToken}
        price={selectedToken ? getPrice(selectedToken.symbol) || null : null}
        onSend={onSend}
        onReceive={onReceive}
        onSwap={onSwap}
      />
    </div>
  );
};
