/**
 * useBalance Hook - Shared between PWA and Chrome Extension
 * Fetches token balances from blockchain with caching
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getNativeBalance, getTokenBalance } from '../lib/wallet';
import { Token } from '../types';

export interface TokenBalance extends Token {
  balance: string;
  balanceUsd?: number;
}

interface UseBalanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseBalanceResult {
  balances: TokenBalance[];
  totalUsd: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useBalance = (
  address: string | null | undefined,
  tokens: Token[],
  priceMap: Record<string, number> = {},
  options: UseBalanceOptions = {}
): UseBalanceResult => {
  const { 
    autoRefresh = false, 
    refreshInterval = 30000,
    enabled = true 
  } = options;

  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  // Stabilize priceMap để tránh re-render không cần thiết khi giá thay đổi
  const stablePriceMapKey = useMemo(() => JSON.stringify(priceMap), [priceMap]);
  const stablePriceMap = useMemo(() => priceMap, [stablePriceMapKey]);

  const fetchBalances = useCallback(async () => {
    if (!address || !enabled || tokens.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // DO NOT setLoading(true) here - prevents flickering on refresh
      const results: TokenBalance[] = [];

      // Fetch balances in parallel
      await Promise.all(
        tokens.map(async (token) => {
          try {
            let balance = '0';
            
            if (token.address === null) {
              // Native token (BNB)
              balance = await getNativeBalance(address);
            } else {
              // ERC-20 token
              balance = await getTokenBalance(token.address, address);
            }

            const priceUsd = stablePriceMap[token.symbol.toUpperCase()] || 0;
            const balanceUsd = parseFloat(balance) * priceUsd;

            results.push({
              ...token,
              balance,
              balanceUsd,
            });
          } catch (err) {
            console.error(`Error fetching balance for ${token.symbol}:`, err);
            results.push({
              ...token,
              balance: '0',
              balanceUsd: 0,
            });
          }
        })
      );

      if (mountedRef.current) {
        // Keep original order from tokens array - DO NOT sort by USD value
        // This prevents flickering when prices change
        const tokenOrderMap = new Map(tokens.map((t, i) => [t.symbol, i]));
        results.sort((a, b) => {
          const orderA = tokenOrderMap.get(a.symbol) ?? 999;
          const orderB = tokenOrderMap.get(b.symbol) ?? 999;
          return orderA - orderB;
        });
        
        setBalances(results);
        setLoading(false);
        initialLoadDone.current = true;
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
        setLoading(false);
      }
    }
  }, [address, tokens, stablePriceMap, enabled]);

  // Initial fetch - only show loading on first load
  useEffect(() => {
    mountedRef.current = true;
    
    // Only show loading skeleton if we haven't loaded data yet
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    
    fetchBalances();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchBalances]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && enabled && address) {
      intervalRef.current = setInterval(fetchBalances, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchBalances, enabled, address]);

  // Calculate total USD
  const totalUsd = balances.reduce((sum, b) => sum + (b.balanceUsd || 0), 0);

  return {
    balances,
    totalUsd,
    loading,
    error,
    refresh: fetchBalances,
  };
};

export default useBalance;
