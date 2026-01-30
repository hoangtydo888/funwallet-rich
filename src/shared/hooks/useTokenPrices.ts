/**
 * useTokenPrices Hook - Shared between PWA and Chrome Extension
 * Fetches and caches token prices with auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenPrice, fetchTokenPrices } from '../lib/priceTracker';

interface UseTokenPricesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseTokenPricesResult {
  prices: TokenPrice[];
  priceMap: Record<string, number>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: number | null;
}

export const useTokenPrices = (
  symbols: string[],
  options: UseTokenPricesOptions = {}
): UseTokenPricesResult => {
  const { 
    autoRefresh = true, 
    refreshInterval = 30000,
    enabled = true 
  } = options;

  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchPrices = useCallback(async () => {
    if (!enabled || symbols.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await fetchTokenPrices(symbols);
      
      if (mountedRef.current) {
        setPrices(result);
        setLastUpdated(Date.now());
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        setLoading(false);
      }
    }
  }, [symbols, enabled]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchPrices();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchPrices]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && enabled) {
      intervalRef.current = setInterval(fetchPrices, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchPrices, enabled]);

  // Create a map for quick price lookups
  const priceMap = prices.reduce<Record<string, number>>((acc, p) => {
    acc[p.symbol.toUpperCase()] = p.price;
    return acc;
  }, {});

  return {
    prices,
    priceMap,
    loading,
    error,
    refetch: fetchPrices,
    lastUpdated,
  };
};

export default useTokenPrices;
