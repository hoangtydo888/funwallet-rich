import { ethers } from "ethers";

export interface Chain {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  symbol: string;
  explorer: string;
  logo: string;
  color: string;
  isTestnet: boolean;
}

// Supported EVM chains
export const SUPPORTED_CHAINS: Chain[] = [
  {
    chainId: 56,
    name: "BNB Smart Chain",
    shortName: "BSC",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    symbol: "BNB",
    explorer: "https://bscscan.com",
    logo: "/tokens/bnb.png",
    color: "#F3BA2F",
    isTestnet: false,
  },
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    shortName: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    symbol: "ETH",
    explorer: "https://etherscan.io",
    logo: "⟠",
    color: "#627EEA",
    isTestnet: false,
  },
  {
    chainId: 137,
    name: "Polygon",
    shortName: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    symbol: "MATIC",
    explorer: "https://polygonscan.com",
    logo: "🟣",
    color: "#8247E5",
    isTestnet: false,
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    shortName: "ARB",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    symbol: "ETH",
    explorer: "https://arbiscan.io",
    logo: "🔵",
    color: "#28A0F0",
    isTestnet: false,
  },
  {
    chainId: 10,
    name: "Optimism",
    shortName: "OP",
    rpcUrl: "https://mainnet.optimism.io",
    symbol: "ETH",
    explorer: "https://optimistic.etherscan.io",
    logo: "🔴",
    color: "#FF0420",
    isTestnet: false,
  },
  {
    chainId: 43114,
    name: "Avalanche C-Chain",
    shortName: "AVAX",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    symbol: "AVAX",
    explorer: "https://snowtrace.io",
    logo: "🔺",
    color: "#E84142",
    isTestnet: false,
  },
  {
    chainId: 250,
    name: "Fantom Opera",
    shortName: "FTM",
    rpcUrl: "https://rpc.ftm.tools/",
    symbol: "FTM",
    explorer: "https://ftmscan.com",
    logo: "👻",
    color: "#1969FF",
    isTestnet: false,
  },
  {
    chainId: 8453,
    name: "Base",
    shortName: "BASE",
    rpcUrl: "https://mainnet.base.org",
    symbol: "ETH",
    explorer: "https://basescan.org",
    logo: "🔷",
    color: "#0052FF",
    isTestnet: false,
  },
];

// Get chain by ID
export const getChainById = (chainId: number): Chain | undefined => {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
};

// Get chain by short name
export const getChainByName = (shortName: string): Chain | undefined => {
  return SUPPORTED_CHAINS.find((c) => c.shortName.toLowerCase() === shortName.toLowerCase());
};

// Get provider for a specific chain
export const getProviderForChain = (chain: Chain): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(chain.rpcUrl);
};

// Get native balance for any chain
export const getNativeBalance = async (address: string, chain: Chain): Promise<string> => {
  try {
    const provider = getProviderForChain(chain);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return "0";
  }
};

// Common tokens per chain
export const CHAIN_TOKENS: Record<number, { symbol: string; name: string; address: string | null; decimals: number; logo: string }[]> = {
  // BSC
  56: [
    { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "💲" },
    { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, logo: "🟡" },
  ],
  // Ethereum
  1: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "⟠" },
    { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, logo: "💲" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x6B175474E89094C44Da98b954EesC2dbccb0E7F6", decimals: 18, logo: "🟡" },
  ],
  // Polygon
  137: [
    { symbol: "MATIC", name: "Polygon", address: null, decimals: 18, logo: "🟣" },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6, logo: "💲" },
    { symbol: "WETH", name: "Wrapped Ether", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18, logo: "⟠" },
  ],
  // Arbitrum
  42161: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "⟠" },
    { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", decimals: 6, logo: "💲" },
    { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18, logo: "🔵" },
  ],
  // Optimism
  10: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "⟠" },
    { symbol: "USDT", name: "Tether USD", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", decimals: 6, logo: "💲" },
    { symbol: "OP", name: "Optimism", address: "0x4200000000000000000000000000000000000042", decimals: 18, logo: "🔴" },
  ],
  // Avalanche
  43114: [
    { symbol: "AVAX", name: "Avalanche", address: null, decimals: 18, logo: "🔺" },
    { symbol: "USDT", name: "Tether USD", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6, logo: "💵" },
    { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6, logo: "💲" },
  ],
  // Fantom
  250: [
    { symbol: "FTM", name: "Fantom", address: null, decimals: 18, logo: "👻" },
    { symbol: "USDC", name: "USD Coin", address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", decimals: 6, logo: "💲" },
  ],
  // Base
  8453: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "⟠" },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, logo: "💲" },
  ],
};

// Get tokens for a chain
export const getTokensForChain = (chainId: number) => {
  return CHAIN_TOKENS[chainId] || [];
};

// Chain ID to database chain name mapping
export const chainIdToDbName = (chainId: number): string => {
  const chain = getChainById(chainId);
  return chain?.shortName.toLowerCase() || "bsc";
};

// Database chain name to chain ID mapping
export const dbNameToChainId = (name: string): number => {
  const chain = getChainByName(name);
  return chain?.chainId || 56;
};
