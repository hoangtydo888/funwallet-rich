import { Token, SwapToken } from '../types';

/**
 * BSC Mainnet Configuration
 */
export const BSC_MAINNET = {
  chainId: 56,
  name: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  symbol: "BNB",
  explorer: "https://bscscan.com",
};

/**
 * WBNB Address (wrapped BNB for DEX operations)
 */
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

/**
 * PancakeSwap Router V2 Address
 */
export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

/**
 * 19 Common BEP-20 tokens on BSC with logo paths
 */
export const COMMON_TOKENS: Token[] = [
  // Priority tokens
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 3, logo: "/tokens/camly.png" },
  { symbol: "BTCB", name: "Bitcoin BEP-20", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, logo: "/tokens/btc.svg" },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
  { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" },
  
  // Stablecoins
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
  
  // Major coins
  { symbol: "ETH", name: "Ethereum BEP-20", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, logo: "/tokens/eth.svg" },
  
  // DeFi & Exchange tokens
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, logo: "/tokens/cake.svg" },
  { symbol: "LINK", name: "Chainlink", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, logo: "/tokens/link.svg" },
  { symbol: "UNI", name: "Uniswap", address: "0xBf5140A22578168FD562DcEaAB237dA49E0c34C7", decimals: 18, logo: "/tokens/uni.svg" },
  
  // Meme coins
  { symbol: "SHIB", name: "Shiba Inu", address: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d", decimals: 18, logo: "/tokens/shib.svg" },
  { symbol: "DOGE", name: "Dogecoin BEP-20", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, logo: "/tokens/doge.svg" },
  { symbol: "BABYDOGE", name: "Baby Doge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", decimals: 9, logo: "/tokens/babydoge.svg" },
  
  // L1/L2 Wrapped tokens
  { symbol: "ADA", name: "Cardano BEP-20", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, logo: "/tokens/ada.svg" },
  { symbol: "MATIC", name: "Polygon BEP-20", address: "0xCC42724C6683B7E57334c4E856f4C9965ED682bD", decimals: 18, logo: "/tokens/matic.svg" },
  { symbol: "AVAX", name: "Avalanche BEP-20", address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, logo: "/tokens/avax.svg" },
  { symbol: "SOL", name: "Solana BEP-20", address: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, logo: "/tokens/sol.svg" },
  { symbol: "XRP", name: "Ripple BEP-20", address: "0x1D2F0dA169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, logo: "/tokens/xrp.svg" },
  
  // Other tokens
  { symbol: "MANA", name: "Decentraland", address: "0x26433c8127d9b4e9B71Eaa15111DF99Ea2EeB2f8", decimals: 18, logo: "/tokens/mana.svg" },
  { symbol: "BTT", name: "BitTorrent", address: "0x352Cb5E19b12FC216548a2677bD0fce83BaE434B", decimals: 18, logo: "/tokens/btt.svg" },
];

/**
 * Swap tokens (19 tokens for DEX swaps)
 */
export const SWAP_TOKENS: SwapToken[] = [
  { symbol: "BNB", name: "BNB", address: WBNB_ADDRESS, decimals: 18, isNative: true, logo: "/tokens/bnb.png" },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 18, logo: "/tokens/camly.png" },
  { symbol: "BTCB", name: "Bitcoin BEP-20", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, logo: "/tokens/btc.svg" },
  { symbol: "ETH", name: "Ethereum BEP-20", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, logo: "/tokens/eth.svg" },
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, logo: "/tokens/cake.svg" },
  { symbol: "LINK", name: "Chainlink", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, logo: "/tokens/link.svg" },
  { symbol: "UNI", name: "Uniswap", address: "0xBf5140A22578168FD562DcEaAB237dA49E0c34C7", decimals: 18, logo: "/tokens/uni.svg" },
  { symbol: "SHIB", name: "Shiba Inu", address: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d", decimals: 18, logo: "/tokens/shib.svg" },
  { symbol: "DOGE", name: "Dogecoin BEP-20", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, logo: "/tokens/doge.svg" },
  { symbol: "BABYDOGE", name: "Baby Doge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", decimals: 9, logo: "/tokens/babydoge.svg" },
  { symbol: "ADA", name: "Cardano BEP-20", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, logo: "/tokens/ada.svg" },
  { symbol: "MATIC", name: "Polygon BEP-20", address: "0xCC42724C6683B7E57334c4E856f4C9965ED682bD", decimals: 18, logo: "/tokens/matic.svg" },
  { symbol: "AVAX", name: "Avalanche BEP-20", address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, logo: "/tokens/avax.svg" },
  { symbol: "SOL", name: "Solana BEP-20", address: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, logo: "/tokens/sol.svg" },
  { symbol: "XRP", name: "Ripple BEP-20", address: "0x1D2F0dA169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, logo: "/tokens/xrp.svg" },
  { symbol: "MANA", name: "Decentraland", address: "0x26433c8127d9b4e9B71Eaa15111DF99Ea2EeB2f8", decimals: 18, logo: "/tokens/mana.svg" },
  { symbol: "BTT", name: "BitTorrent", address: "0x352Cb5E19b12FC216548a2677bD0fce83BaE434B", decimals: 18, logo: "/tokens/btt.svg" },
];

/**
 * Tax tokens that require special swap functions (fee-on-transfer)
 */
export const TAX_TOKENS = ["CAMLY", "BABYDOGE", "SHIB"];

/**
 * Token addresses for DexScreener lookups
 */
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

/**
 * Chain-specific tokens
 */
export const CHAIN_TOKENS: Record<number, Token[]> = {
  // BSC
  56: [
    { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" },
    { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
    { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, logo: "/tokens/usdt.svg" },
  ],
  // Ethereum
  1: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  // Polygon
  137: [
    { symbol: "MATIC", name: "Polygon", address: null, decimals: 18, logo: "/tokens/matic.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
  // Arbitrum
  42161: [
    { symbol: "ETH", name: "Ethereum", address: null, decimals: 18, logo: "/tokens/eth.svg" },
    { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, logo: "/tokens/usdt.svg" },
    { symbol: "USDC", name: "USD Coin", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", decimals: 6, logo: "/tokens/usdc.svg" },
  ],
};

/**
 * Get tokens for a specific chain
 */
export const getTokensForChain = (chainId: number): Token[] => {
  return CHAIN_TOKENS[chainId] || [];
};
