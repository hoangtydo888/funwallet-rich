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

// CoinGecko IDs for common BSC tokens
const COINGECKO_IDS: Record<string, string> = {
  BNB: "binancecoin",
  CAKE: "pancakeswap-token",
  USDT: "tether",
  USDC: "usd-coin",
  ETH: "ethereum",
  BTCB: "bitcoin",
  BUSD: "binance-usd",
  XVS: "venus",
  ALPACA: "alpaca-finance",
  DOGE: "dogecoin",
};

// Fetch real-time prices from CoinGecko
export const fetchTokenPrices = async (
  symbols: string[]
): Promise<TokenPrice[]> => {
  try {
    const ids = symbols
      .map(s => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean);
    
    if (ids.length === 0) {
      return generateMockPrices(symbols);
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      // Fallback to mock data if API fails
      return generateMockPrices(symbols);
    }

    const data = await response.json();
    
    return data.map((coin: any) => ({
      symbol: Object.keys(COINGECKO_IDS).find(
        key => COINGECKO_IDS[key] === coin.id
      ) || coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      lastUpdated: Date.now(),
    }));
  } catch (error) {
    console.error("Error fetching prices:", error);
    return generateMockPrices(symbols);
  }
};

// Generate mock prices when API is unavailable
const generateMockPrices = (symbols: string[]): TokenPrice[] => {
  const basePrices: Record<string, number> = {
    BNB: 615.42,
    CAKE: 2.45,
    USDT: 1.0,
    USDC: 1.0,
    ETH: 3456.78,
    BTCB: 97234.56,
    BUSD: 1.0,
    XVS: 8.76,
    ALPACA: 0.23,
    DOGE: 0.32,
  };

  return symbols.map(symbol => {
    const basePrice = basePrices[symbol.toUpperCase()] || Math.random() * 100;
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    
    return {
      symbol: symbol.toUpperCase(),
      name: symbol,
      price,
      change24h: (Math.random() - 0.5) * 10, // ±5% change
      high24h: price * 1.05,
      low24h: price * 0.95,
      volume24h: Math.random() * 1000000000,
      marketCap: Math.random() * 10000000000,
      lastUpdated: Date.now(),
    };
  });
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
export const formatPrice = (price: number): string => {
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
  } else {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    });
  }
};

// Format percentage change
export const formatChange = (change: number): string => {
  const prefix = change >= 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
};

// Format market cap / volume
export const formatMarketCap = (value: number): string => {
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

// Local storage keys
const ALERTS_KEY = "fun_wallet_price_alerts";
const FAVORITES_KEY = "fun_wallet_favorite_tokens";

// Save alerts to local storage
export const saveAlerts = (alerts: PriceAlert[]): void => {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
};

// Load alerts from local storage
export const loadAlerts = (): PriceAlert[] => {
  try {
    const saved = localStorage.getItem(ALERTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save favorite tokens
export const saveFavorites = (favorites: string[]): void => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

// Load favorite tokens
export const loadFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : ["BNB", "CAKE", "ETH"];
  } catch {
    return ["BNB", "CAKE", "ETH"];
  }
};
