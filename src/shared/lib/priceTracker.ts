/**
 * Price Tracker - Shared between PWA and Chrome Extension
 * Fetches token prices from DexScreener and CoinGecko
 */

import { fetchTokenFromDexScreener, TOKEN_ADDRESSES } from "./dexscreener";
import { StorageAdapter } from "../storage/types";

// Stablecoins that should always be ~$1.00
const STABLECOINS = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP", "FRAX"];

// Cache settings
const CACHE_KEY = "fun_wallet_prices_cache";
const CACHE_TTL = 30000; // 30 seconds

// Token price data interface
export interface TokenPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
}

// Price alert interface
export interface PriceAlert {
  id: string;
  tokenSymbol: string;
  targetPrice: number;
  condition: "above" | "below";
  enabled: boolean;
  createdAt: number;
  triggered: boolean;
}

// CoinGecko IDs for BSC tokens
const COINGECKO_IDS: Record<string, string | null> = {
  BNB: "binancecoin",
  USDT: "tether",
  USDC: "usd-coin",
  CAMLY: null, // Custom token - fetch from DEX
  BTCB: "bitcoin",
  ETH: "ethereum",
  CAKE: "pancakeswap-token",
  LINK: "chainlink",
  UNI: "uniswap",
  SHIB: "shiba-inu",
  DOGE: "dogecoin",
  BABYDOGE: "baby-doge-coin",
  ADA: "cardano",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  SOL: "solana",
  XRP: "ripple",
  MANA: "decentraland",
  BTT: "bittorrent",
};

// Binance spot pairs (vs USDT) — the same prices Binance shows
const BINANCE_SYMBOLS: Record<string, string> = {
  BNB: "BNBUSDT",
  WBNB: "BNBUSDT",
  BTC: "BTCUSDT",
  BTCB: "BTCUSDT",
  ETH: "ETHUSDT",
  CAKE: "CAKEUSDT",
  LINK: "LINKUSDT",
  UNI: "UNIUSDT",
  SHIB: "SHIBUSDT",
  DOGE: "DOGEUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  MANA: "MANAUSDT",
  DOT: "DOTUSDT",
  LTC: "LTCUSDT",
  TRX: "TRXUSDT",
};

const BINANCE_API = "https://data-api.binance.vision/api/v3";

// Fetch 24h tickers from Binance public market data
export const fetchBinancePrices = async (symbols: string[]): Promise<TokenPrice[]> => {
  const wanted = symbols.map(s => s.toUpperCase()).filter(s => BINANCE_SYMBOLS[s]);
  const pairs = [...new Set(wanted.map(s => BINANCE_SYMBOLS[s]))];
  if (pairs.length === 0) return [];
  try {
    const response = await fetch(`${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`);
    if (!response.ok) return [];
    const data: { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }[] = await response.json();
    const byPair = new Map(data.map(t => [t.symbol, t]));
    return wanted.flatMap(symbol => {
      const t = byPair.get(BINANCE_SYMBOLS[symbol]);
      const price = Number(t?.lastPrice);
      if (!t || !(price > 0)) return [];
      return [{
        symbol,
        name: symbol,
        price,
        change24h: Number(t.priceChangePercent) || 0,
        high24h: Number(t.highPrice) || price,
        low24h: Number(t.lowPrice) || price,
        volume24h: Number(t.quoteVolume) || 0,
        marketCap: 0,
        lastUpdated: Date.now(),
      }];
    });
  } catch (error) {
    console.error("Binance price fetch error:", error);
    return [];
  }
};

// Fetch price from DexScreener API
export const fetchDEXPrice = async (symbol: string): Promise<TokenPrice | null> => {
  const tokenAddress = TOKEN_ADDRESSES[symbol.toUpperCase()];
  if (!tokenAddress) return null;

  try {
    const tokenInfo = await fetchTokenFromDexScreener(tokenAddress);
    if (!tokenInfo) return null;

    return {
      symbol: symbol.toUpperCase(),
      name: tokenInfo.name,
      price: tokenInfo.priceUsd,
      change24h: tokenInfo.priceChange24h,
      high24h: tokenInfo.priceUsd,
      low24h: tokenInfo.priceUsd,
      volume24h: tokenInfo.volume24h,
      marketCap: tokenInfo.marketCap,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching DEX price for ${symbol}:`, error);
    return null;
  }
};

// Real market prices: Binance first, then DexScreener (CAMLY and other BSC tokens),
// then CoinGecko. Stablecoins are $1. A token with no market price is left out
// rather than given a made-up one.
export const fetchTokenPrices = async (
  symbols: string[]
): Promise<TokenPrice[]> => {
  const unique = [...new Set(symbols.map(s => s.toUpperCase()))];
  const results: TokenPrice[] = unique.filter(s => STABLECOINS.includes(s)).map(symbol => ({
    symbol, name: symbol, price: 1, change24h: 0, high24h: 1, low24h: 1, volume24h: 0, marketCap: 0, lastUpdated: Date.now(),
  }));
  const missing = () => unique.filter(s => !results.some(r => r.symbol === s));

  results.push(...await fetchBinancePrices(missing()));

  const dex = await Promise.all(missing().filter(s => TOKEN_ADDRESSES[s]).map(fetchDEXPrice));
  results.push(...dex.filter((p): p is TokenPrice => p !== null && p.price > 0));

  const ids = missing().map(s => COINGECKO_IDS[s]).filter((id): id is string => !!id);
  if (ids.length > 0) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
      );
      if (response.ok) {
        const data = await response.json();
        for (const coin of data) {
          const symbol = missing().find(s => COINGECKO_IDS[s] === coin.id);
          if (!symbol || !(coin.current_price > 0)) continue;
          results.push({
            symbol,
            name: coin.name,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h ?? 0,
            high24h: coin.high_24h ?? 0,
            low24h: coin.low_24h ?? 0,
            volume24h: coin.total_volume ?? 0,
            marketCap: coin.market_cap ?? 0,
            lastUpdated: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error("CoinGecko fetch error:", error);
    }
  }

  return results;
};

// Fetch with cache support (for extension/PWA)
export const fetchTokenPricesWithCache = async (
  symbols: string[],
  storage: StorageAdapter
): Promise<TokenPrice[]> => {
  try {
    // Check cache first
    const cached = await storage.get(CACHE_KEY);
    if (cached) {
      const { prices, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        // Filter cached prices for requested symbols
        const cachedPrices = prices.filter((p: TokenPrice) => 
          symbols.map(s => s.toUpperCase()).includes(p.symbol.toUpperCase())
        );
        if (cachedPrices.length === symbols.length) {
          return cachedPrices;
        }
      }
    }
  } catch (e) {
    console.warn("Cache read error:", e);
  }

  // Fetch fresh prices
  const prices = await fetchTokenPrices(symbols);

  // Cache results
  try {
    await storage.set(CACHE_KEY, JSON.stringify({
      prices,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Cache write error:", e);
  }

  return prices;
};

// Fetch single token price
export const fetchTokenPrice = async (symbol: string): Promise<TokenPrice | null> => {
  const prices = await fetchTokenPrices([symbol]);
  return prices[0] || null;
};

// Check alerts against current prices
export const checkAlerts = (
  alerts: PriceAlert[],
  prices: TokenPrice[]
): PriceAlert[] => {
  const triggeredAlerts: PriceAlert[] = [];

  for (const alert of alerts) {
    if (!alert.enabled || alert.triggered) continue;

    const tokenPrice = prices.find(p => p.symbol === alert.tokenSymbol);
    if (!tokenPrice) continue;

    const isTriggered = alert.condition === "above"
      ? tokenPrice.price >= alert.targetPrice
      : tokenPrice.price <= alert.targetPrice;

    if (isTriggered) {
      triggeredAlerts.push({ ...alert, triggered: true });
    }
  }

  return triggeredAlerts;
};

// Format price for display
export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined || isNaN(price)) {
    return "$0.00";
  }
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (price >= 1) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  } else if (price === 0) {
    return "$0.00";
  } else {
    // Like Binance: four significant digits for small prices, e.g. $0.6512 or $0.000003328
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumSignificantDigits: 4,
      maximumSignificantDigits: 4,
    });
  }
};

// Format what a holding is worth, like Binance's "≈ $493.09"
export const formatUsdValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  if (value > 0 && value < 0.01) return "<$0.01";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format percentage change
export const formatChange = (change: number | null | undefined): string => {
  if (change === null || change === undefined || isNaN(change)) {
    return "+0.00%";
  }
  const prefix = change >= 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
};

// Format market cap / volume
export const formatMarketCap = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0";
  }
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

// Get trending tokens
export const getTrendingTokens = async (): Promise<string[]> => {
  return ["BNB", "CAKE", "ETH", "BTCB", "USDT"];
};
