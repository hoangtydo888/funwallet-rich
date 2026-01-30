/**
 * @fun-wallet/shared
 * 
 * Shared code for FUN Wallet PWA and Chrome Extension
 * Contains core wallet logic, encryption, types, and constants
 */

// Types (selective exports to avoid conflicts with priceTracker)
export type {
  Chain,
  Token,
  TokenBalance,
  WalletAccount,
  EncryptedKeyData,
  SecureWalletStorage,
  TransactionRequest,
  TransactionResult,
  TransactionHistory,
  DAppConnection,
  DAppPermission,
  PendingRequest,
  StakingPool,
  StakingPosition,
  SwapToken,
  SwapQuote,
  SecurityConfig,
  PasswordStrength,
  Result,
  AsyncResult,
} from './types';

// Note: TokenPrice from ./types is different from priceTracker.TokenPrice
// Use priceTracker.TokenPrice for price fetching operations

// Constants
export {
  BSC_MAINNET,
  WBNB_ADDRESS,
  PANCAKE_ROUTER,
  COMMON_TOKENS,
  SWAP_TOKENS,
  TAX_TOKENS,
  TOKEN_ADDRESSES,
  CHAIN_TOKENS,
  getTokensForChain,
} from './constants/tokens';
export * from './constants/chains';

// Storage
export * from './storage/types';
export * from './storage/LocalStorageAdapter';

// Core Libraries - wallet and encryption
export * from './lib/encryption';
export * from './lib/wallet';

// DexScreener (avoid TOKEN_ADDRESSES conflict - already exported from tokens)
export {
  fetchTokenFromDexScreener,
  fetchMultipleTokens,
  getDexScreenerChartUrl,
  searchTokens,
  type DexScreenerPair,
  type TokenInfo,
} from './lib/dexscreener';

// Price Tracker - exports its own TokenPrice interface
export {
  fetchDEXPrice,
  fetchTokenPrices,
  fetchTokenPricesWithCache,
  fetchTokenPrice,
  checkAlerts,
  formatPrice,
  formatChange,
  formatMarketCap,
  getTrendingTokens,
  type TokenPrice,
  type PriceAlert,
} from './lib/priceTracker';

// Hooks
export { useTokenPrices } from './hooks/useTokenPrices';
export { useBalance } from './hooks/useBalance';
