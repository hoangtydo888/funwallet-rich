import { ethers } from "ethers";
import { getProvider } from "./wallet";
import { PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, WBNB_ADDRESS } from "./swap";

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

// Token addresses for DEX price fetching
const DEX_TOKEN_ADDRESSES: Record<string, { address: string; decimals: number; name: string }> = {
  CAMLY: { address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 18, name: "CAMLY COIN" },
};

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// Fetch price from PancakeSwap DEX
export const fetchDEXPrice = async (symbol: string): Promise<TokenPrice | null> => {
  const tokenInfo = DEX_TOKEN_ADDRESSES[symbol.toUpperCase()];
  if (!tokenInfo) return null;

  try {
    const provider = getProvider();
    const router = new ethers.Contract(PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, provider);
    
    // Path: Token → WBNB → USDT to get price in USDT
    const path = [tokenInfo.address, WBNB_ADDRESS, USDT_ADDRESS];
    const amountIn = ethers.parseUnits("1", tokenInfo.decimals);
    
    const amounts = await router.getAmountsOut(amountIn, path);
    const priceInUSDT = parseFloat(ethers.formatUnits(amounts[amounts.length - 1], 18));
    
    return {
      symbol: symbol.toUpperCase(),
      name: tokenInfo.name,
      price: priceInUSDT,
      change24h: 0, // DEX doesn't provide 24h change
      high24h: priceInUSDT * 1.05,
      low24h: priceInUSDT * 0.95,
      volume24h: 0,
      marketCap: 0,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching DEX price for ${symbol}:`, error);
    return null;
  }
};

// Fetch real-time prices from CoinGecko and DEX
export const fetchTokenPrices = async (
  symbols: string[]
): Promise<TokenPrice[]> => {
  try {
    // Separate tokens by price source
    const tokensFromCoinGecko = symbols.filter(s => 
      COINGECKO_IDS[s.toUpperCase()] !== null && COINGECKO_IDS[s.toUpperCase()] !== undefined
    );
    const tokensFromDEX = symbols.filter(s => DEX_TOKEN_ADDRESSES[s.toUpperCase()]);
    
    let coinGeckoPrices: TokenPrice[] = [];
    let dexPrices: TokenPrice[] = [];
    
    // Fetch from CoinGecko for tokens with ID
    if (tokensFromCoinGecko.length > 0) {
      const ids = tokensFromCoinGecko
        .map(s => COINGECKO_IDS[s.toUpperCase()])
        .filter(Boolean);

      if (ids.length > 0) {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
          );

          if (response.ok) {
            const data = await response.json();
            
            coinGeckoPrices = data.map((coin: any) => ({
              symbol: Object.keys(COINGECKO_IDS).find(
                key => COINGECKO_IDS[key] === coin.id
              ) || coin.symbol.toUpperCase(),
              name: coin.name,
              price: coin.current_price ?? 0,
              change24h: coin.price_change_percentage_24h ?? 0,
              high24h: coin.high_24h ?? 0,
              low24h: coin.low_24h ?? 0,
              volume24h: coin.total_volume ?? 0,
              marketCap: coin.market_cap ?? 0,
              lastUpdated: Date.now(),
            }));
          }
        } catch (error) {
          console.error("CoinGecko fetch error:", error);
        }
      }
    }
    
    // Fetch from DEX (PancakeSwap) for tokens like CAMLY
    for (const symbol of tokensFromDEX) {
      const dexPrice = await fetchDEXPrice(symbol);
      if (dexPrice) {
        dexPrices.push(dexPrice);
      }
    }
    
    // Combine all prices
    const allPrices = [...coinGeckoPrices, ...dexPrices];
    
    // For symbols that didn't get prices, use mock prices
    const fetchedSymbols = allPrices.map(p => p.symbol.toUpperCase());
    const missingSymbols = symbols.filter(s => !fetchedSymbols.includes(s.toUpperCase()));
    
    if (missingSymbols.length > 0) {
      const mockPrices = generateMockPrices(missingSymbols);
      allPrices.push(...mockPrices);
    }
    
    // Fallback if no results
    if (allPrices.length === 0) {
      return generateMockPrices(symbols);
    }
    
    return allPrices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return generateMockPrices(symbols);
  }
};

// Generate mock prices when API is unavailable
const generateMockPrices = (symbols: string[]): TokenPrice[] => {
  const basePrices: Record<string, number> = {
    BNB: 615.42,
    USDT: 1.0,
    USDC: 1.0,
    CAMLY: 0.0025,
    BTCB: 97234.56,
    ETH: 3456.78,
    CAKE: 2.45,
    LINK: 14.56,
    UNI: 6.78,
    SHIB: 0.000024,
    DOGE: 0.32,
    BABYDOGE: 0.0000000021,
    ADA: 0.89,
    MATIC: 0.52,
    AVAX: 35.67,
    SOL: 178.45,
    XRP: 2.34,
    MANA: 0.45,
    BTT: 0.00000089,
  };

  return symbols.map(symbol => {
    const basePrice = basePrices[symbol.toUpperCase()] || Math.random() * 100;
    const variation = (Math.random() - 0.5) * 0.1;
    const price = basePrice * (1 + variation);
    
    return {
      symbol: symbol.toUpperCase(),
      name: symbol,
      price,
      change24h: (Math.random() - 0.5) * 10,
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
