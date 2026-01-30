import { Chain, Token } from '../types';

/**
 * Supported EVM Chains Configuration
 */
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
    logo: "/tokens/eth.svg",
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
    logo: "/tokens/matic.svg",
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
    logo: "/tokens/eth.svg",
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
    logo: "/tokens/eth.svg",
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
    logo: "/tokens/avax.svg",
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
    logo: "/tokens/default.svg",
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
    logo: "/tokens/eth.svg",
    color: "#0052FF",
    isTestnet: false,
  },
];

/**
 * Default chain (BSC)
 */
export const DEFAULT_CHAIN = SUPPORTED_CHAINS[0];

/**
 * Get chain by chainId
 */
export const getChainById = (chainId: number): Chain | undefined => {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
};

/**
 * Get chain by short name
 */
export const getChainByName = (shortName: string): Chain | undefined => {
  return SUPPORTED_CHAINS.find((c) => c.shortName.toLowerCase() === shortName.toLowerCase());
};

/**
 * Chain ID to database chain name mapping
 */
export const chainIdToDbName = (chainId: number): string => {
  const chain = getChainById(chainId);
  return chain?.shortName.toLowerCase() || "bsc";
};

/**
 * Database chain name to chain ID mapping
 */
export const dbNameToChainId = (name: string): number => {
  const chain = getChainByName(name);
  return chain?.chainId || 56;
};
