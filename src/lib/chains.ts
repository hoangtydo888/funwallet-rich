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
  isCustom?: boolean;
}

// Supported EVM chains (20+)
export const SUPPORTED_CHAINS: Chain[] = [
  { chainId: 56, name: "BNB Smart Chain", shortName: "BSC", rpcUrl: "https://bsc-dataseed.binance.org/", symbol: "BNB", explorer: "https://bscscan.com", logo: "/tokens/bnb.png", color: "#F3BA2F", isTestnet: false },
  { chainId: 1, name: "Ethereum Mainnet", shortName: "ETH", rpcUrl: "https://eth.llamarpc.com", symbol: "ETH", explorer: "https://etherscan.io", logo: "/tokens/eth.svg", color: "#627EEA", isTestnet: false },
  { chainId: 137, name: "Polygon", shortName: "MATIC", rpcUrl: "https://polygon-rpc.com", symbol: "MATIC", explorer: "https://polygonscan.com", logo: "/tokens/matic.svg", color: "#8247E5", isTestnet: false },
  { chainId: 42161, name: "Arbitrum One", shortName: "ARB", rpcUrl: "https://arb1.arbitrum.io/rpc", symbol: "ETH", explorer: "https://arbiscan.io", logo: "/tokens/eth.svg", color: "#28A0F0", isTestnet: false },
  { chainId: 10, name: "Optimism", shortName: "OP", rpcUrl: "https://mainnet.optimism.io", symbol: "ETH", explorer: "https://optimistic.etherscan.io", logo: "/tokens/eth.svg", color: "#FF0420", isTestnet: false },
  { chainId: 8453, name: "Base", shortName: "BASE", rpcUrl: "https://mainnet.base.org", symbol: "ETH", explorer: "https://basescan.org", logo: "/tokens/eth.svg", color: "#0052FF", isTestnet: false },
  { chainId: 43114, name: "Avalanche C-Chain", shortName: "AVAX", rpcUrl: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX", explorer: "https://snowtrace.io", logo: "/tokens/avax.svg", color: "#E84142", isTestnet: false },
  { chainId: 250, name: "Fantom Opera", shortName: "FTM", rpcUrl: "https://rpc.ftm.tools/", symbol: "FTM", explorer: "https://ftmscan.com", logo: "/tokens/default.svg", color: "#1969FF", isTestnet: false },
  { chainId: 59144, name: "Linea", shortName: "LINEA", rpcUrl: "https://rpc.linea.build", symbol: "ETH", explorer: "https://lineascan.build", logo: "/tokens/eth.svg", color: "#61DFFF", isTestnet: false },
  { chainId: 324, name: "zkSync Era", shortName: "zkSync", rpcUrl: "https://mainnet.era.zksync.io", symbol: "ETH", explorer: "https://explorer.zksync.io", logo: "/tokens/eth.svg", color: "#8C8DFC", isTestnet: false },
  { chainId: 534352, name: "Scroll", shortName: "SCROLL", rpcUrl: "https://rpc.scroll.io", symbol: "ETH", explorer: "https://scrollscan.com", logo: "/tokens/eth.svg", color: "#FFEEDA", isTestnet: false },
  { chainId: 80094, name: "Berachain", shortName: "BERA", rpcUrl: "https://rpc.berachain.com", symbol: "BERA", explorer: "https://berascan.com", logo: "/tokens/default.svg", color: "#814625", isTestnet: false },
  { chainId: 25, name: "Cronos", shortName: "CRO", rpcUrl: "https://evm.cronos.org", symbol: "CRO", explorer: "https://cronoscan.com", logo: "/tokens/default.svg", color: "#002D74", isTestnet: false },
  { chainId: 100, name: "Gnosis", shortName: "GNO", rpcUrl: "https://rpc.gnosischain.com", symbol: "xDAI", explorer: "https://gnosisscan.io", logo: "/tokens/default.svg", color: "#3E6957", isTestnet: false },
  { chainId: 42220, name: "Celo", shortName: "CELO", rpcUrl: "https://forno.celo.org", symbol: "CELO", explorer: "https://celoscan.io", logo: "/tokens/default.svg", color: "#FCFF52", isTestnet: false },
  { chainId: 34443, name: "Mode", shortName: "MODE", rpcUrl: "https://mainnet.mode.network", symbol: "ETH", explorer: "https://explorer.mode.network", logo: "/tokens/eth.svg", color: "#DFFE00", isTestnet: false },
  { chainId: 81457, name: "Blast", shortName: "BLAST", rpcUrl: "https://rpc.blast.io", symbol: "ETH", explorer: "https://blastscan.io", logo: "/tokens/eth.svg", color: "#FCFC03", isTestnet: false },
  { chainId: 5000, name: "Mantle", shortName: "MNT", rpcUrl: "https://rpc.mantle.xyz", symbol: "MNT", explorer: "https://mantlescan.xyz", logo: "/tokens/default.svg", color: "#0A0A0A", isTestnet: false },
  { chainId: 146, name: "Sonic", shortName: "SONIC", rpcUrl: "https://rpc.soniclabs.com", symbol: "S", explorer: "https://sonicscan.org", logo: "/tokens/default.svg", color: "#FE9A4C", isTestnet: false },
  { chainId: 204, name: "opBNB", shortName: "opBNB", rpcUrl: "https://opbnb-mainnet-rpc.bnbchain.org", symbol: "BNB", explorer: "https://opbnbscan.com", logo: "/tokens/bnb.png", color: "#F3BA2F", isTestnet: false },
];

export const getChainById = (chainId: number): Chain | undefined =>
  SUPPORTED_CHAINS.find((c) => c.chainId === chainId);

export const getChainByName = (shortName: string): Chain | undefined =>
  SUPPORTED_CHAINS.find((c) => c.shortName.toLowerCase() === shortName.toLowerCase());

export const getProviderForChain = (chain: Chain): ethers.JsonRpcProvider =>
  new ethers.JsonRpcProvider(chain.rpcUrl);

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
  56: [
    { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
    { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, logo: "/tokens/default.svg" },
  ],
  1: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, logo: "/tokens/usdc.svg" },
    { symbol: "DAI", name: "Dai Stablecoin", address: "0x6B175474E89094C44Da98b954EesC2dbccb0E7F6", decimals: 18, logo: "/tokens/default.svg" },
  ],
  137: [
    { symbol: "MATIC", name: "Polygon", address: null, decimals: 18, logo: "/tokens/matic.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  42161: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, logo: "/tokens/usdc.svg" },
    { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18, logo: "/tokens/default.svg" },
  ],
  10: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, logo: "/tokens/usdc.svg" },
    { symbol: "OP", name: "Optimism", address: "0x4200000000000000000000000000000000000042", decimals: 18, logo: "/tokens/default.svg" },
  ],
  8453: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  43114: [
    { symbol: "AVAX", name: "Avalanche", address: null, decimals: 18, logo: "/tokens/avax.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  250: [
    { symbol: "FTM", name: "Fantom", address: null, decimals: 18, logo: "/tokens/default.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  59144: [{ symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" }],
  324: [{ symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" }],
  534352: [{ symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" }],
  80094: [{ symbol: "BERA", name: "Berachain", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  25: [{ symbol: "CRO", name: "Cronos", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  100: [{ symbol: "xDAI", name: "xDAI", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  42220: [{ symbol: "CELO", name: "Celo", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  34443: [{ symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" }],
  81457: [{ symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" }],
  5000: [{ symbol: "MNT", name: "Mantle", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  146: [{ symbol: "S", name: "Sonic", address: null, decimals: 18, logo: "/tokens/default.svg" }],
  204: [{ symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" }],
};

export const getTokensForChain = (chainId: number) => CHAIN_TOKENS[chainId] || [];

export const chainIdToDbName = (chainId: number): string => {
  const chain = getChainById(chainId);
  return chain?.shortName.toLowerCase() || "bsc";
};

export const dbNameToChainId = (name: string): number => {
  const chain = getChainByName(name);
  return chain?.chainId || 56;
};
