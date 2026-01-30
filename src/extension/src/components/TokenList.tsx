/**
 * TokenList Component for Chrome Extension
 * Compact version optimized for popup display
 */

import { formatBalance } from '../../shared/lib/wallet';
import { formatPrice } from '../../shared/lib/priceTracker';
import { Skeleton } from './ui/Skeleton';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  logo: string;
  balanceUsd?: number;
  address: string | null;
}

interface TokenListProps {
  tokens: TokenBalance[];
  loading?: boolean;
  onTokenClick?: (token: TokenBalance) => void;
}

const TokenListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

const getAssetUrl = (path: string) => {
  try {
    // In extension context, use chrome.runtime.getURL
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
    return path;
  } catch {
    return path;
  }
};

export function TokenList({ tokens, loading, onTokenClick }: TokenListProps) {
  if (loading) {
    return <TokenListSkeleton />;
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Không tìm thấy token</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tokens.map((token) => (
        <div
          key={token.symbol}
          onClick={() => onTokenClick?.(token)}
          className="flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={getAssetUrl(token.logo)}
              alt={token.symbol}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getAssetUrl('/tokens/default.svg');
              }}
            />
            <div>
              <p className="font-medium text-sm">{token.symbol}</p>
              <p className="text-xs text-muted-foreground">
                {formatBalance(token.balance)} {token.symbol}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-sm">
              {formatPrice(token.balanceUsd || 0)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TokenList;
