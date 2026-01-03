// DexScreener API integration for real-time token data

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex";

// Token addresses on BSC
export const TOKEN_ADDRESSES: Record<string, string> = {
  CAMLY: "0x0910320181889fefde0bb1ca63962b0a8882e413",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
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

    // Get the pair with highest liquidity
    const bestPair = pairs.reduce((best, current) => 
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
