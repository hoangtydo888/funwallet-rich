/**
 * DexScreener API integration for real-time token data
 * Shared between PWA and Chrome Extension
 */

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex";

// Token addresses on BSC
export const TOKEN_ADDRESSES: Record<string, string> = {
  CAMLY: "0x0910320181889fefde0bb1ca63962b0a8882e413",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
  BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
  BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  LINK: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
  UNI: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
  SHIB: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D",
  DOGE: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43",
  BABYDOGE: "0xc748673057861a797275CD8A068AbB95A902e8de",
  ADA: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47",
  MATIC: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD",
  AVAX: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041",
  SOL: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF",
  XRP: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
};

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    h24: number;
  };
  priceChange: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
  fdv: number;
  marketCap: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  pairAddress: string;
  dexUrl: string;
}

// Stablecoin quote tokens to prioritize for USD pairs
const STABLE_QUOTES = ["USDT", "USDC", "BUSD", "USD", "DAI", "WBNB"];

// Fetch token info from DexScreener
export const fetchTokenFromDexScreener = async (
  tokenAddress: string
): Promise<TokenInfo | null> => {
  try {
    const response = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const pairs: DexScreenerPair[] = data.pairs || [];
    
    if (pairs.length === 0) {
      return null;
    }

    // Prioritize pairs with stablecoin quote tokens (USD pairs)
    const usdPairs = pairs.filter(pair => 
      STABLE_QUOTES.includes(pair.quoteToken?.symbol?.toUpperCase() || "")
    );

    // If USD pairs exist, choose the one with highest liquidity among them
    // Otherwise fallback to highest liquidity pair overall
    const candidatePairs = usdPairs.length > 0 ? usdPairs : pairs;
    
    const bestPair = candidatePairs.reduce((best, current) => 
      (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
    );

    return {
      symbol: bestPair.baseToken.symbol,
      name: bestPair.baseToken.name,
      priceUsd: parseFloat(bestPair.priceUsd) || 0,
      priceChange24h: bestPair.priceChange?.h24 || 0,
      volume24h: bestPair.volume?.h24 || 0,
      liquidity: bestPair.liquidity?.usd || 0,
      marketCap: bestPair.marketCap || bestPair.fdv || 0,
      pairAddress: bestPair.pairAddress,
      dexUrl: bestPair.url,
    };
  } catch (error) {
    console.error("Error fetching from DexScreener:", error);
    return null;
  }
};

// Fetch multiple tokens at once
export const fetchMultipleTokens = async (
  tokenAddresses: string[]
): Promise<Record<string, TokenInfo>> => {
  const results: Record<string, TokenInfo> = {};
  
  await Promise.all(
    tokenAddresses.map(async (address) => {
      const info = await fetchTokenFromDexScreener(address);
      if (info) {
        results[info.symbol] = info;
      }
    })
  );
  
  return results;
};

// Get DexScreener chart embed URL
export const getDexScreenerChartUrl = (pairAddress: string): string => {
  return `https://dexscreener.com/bsc/${pairAddress}?embed=1&theme=dark&trades=0&info=0`;
};

// Search tokens on DexScreener
export const searchTokens = async (query: string): Promise<DexScreenerPair[]> => {
  try {
    const response = await fetch(`${DEXSCREENER_API}/search/?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Filter for BSC tokens only
    return (data.pairs || []).filter((pair: DexScreenerPair) => pair.chainId === "bsc");
  } catch (error) {
    console.error("Error searching DexScreener:", error);
    return [];
  }
};
