import { formatBalance } from "@/lib/wallet";
import type { TokenBalance } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";

interface TokenListProps {
  balances: TokenBalance[];
  loading: boolean;
}

export const TokenList = ({ balances, loading }: TokenListProps) => {
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
    <div className="space-y-2">
      {balances.map((token) => {
        const balance = parseFloat(token.balance);
        const hasBalance = balance > 0;

        return (
          <div
            key={token.symbol}
            className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
              hasBalance ? "bg-muted/50 hover:bg-muted" : "bg-muted/20"
            }`}
          >
            {/* Token icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg">
              {token.logo}
            </div>

            {/* Token info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{token.symbol}</p>
              <p className="text-sm text-muted-foreground truncate">{token.name}</p>
            </div>

            {/* Balance */}
            <div className="text-right">
              <p className={`font-mono ${hasBalance ? "font-semibold" : "text-muted-foreground"}`}>
                {formatBalance(token.balance)}
              </p>
              {hasBalance && token.symbol === "BNB" && (
                <p className="text-xs text-muted-foreground">
                  ≈ ${(balance * 600).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
