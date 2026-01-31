/**
 * Shared Types for FUN Wallet
 * 
 * Core type definitions used by both PWA and Chrome Extension
 */

// ============== Chain Types ==============

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

export interface Token {
  symbol: string;
  name: string;
  address: string | null; // null for native token
  decimals: number;
  logo: string;
  chainId?: number;
}

export interface TokenBalance extends Token {
  balance: string;
  balanceUsd?: number;
  priceUsd?: number;
  priceChange24h?: number;
}

// ============== Wallet Types ==============

export interface WalletAccount {
  address: string;
  name: string;
  isPrimary: boolean;
  createdAt: number;
}

export interface EncryptedKeyData {
  encryptedKey: string;    // Base64 encoded ciphertext
  iv: string;              // Base64 encoded (12 bytes)
  salt: string;            // Base64 encoded (16 bytes)
  version: number;         // Schema version for migrations
  createdAt: number;       // Timestamp for audit
}

export interface SecureWalletStorage {
  version: number;
  wallets: {
    [address: string]: EncryptedKeyData;
  };
  // Encrypted mnemonics (only for wallets created in-app, not imported)
  mnemonics?: {
    [address: string]: EncryptedKeyData;
  };
  lastAccess: number;
}

// ============== Transaction Types ==============

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  timestamp?: number;
}

export interface TransactionHistory {
  id: string;
  txHash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenAddress?: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'approve';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: string;
  blockNumber?: number;
}

// ============== DApp Connection Types (Extension) ==============

export interface DAppConnection {
  origin: string;
  name: string;
  icon?: string;
  connectedAt: number;
  permissions: DAppPermission[];
  chainId: number;
  accounts: string[];
}

export type DAppPermission = 
  | 'eth_accounts'
  | 'eth_sign'
  | 'personal_sign'
  | 'eth_signTypedData'
  | 'eth_sendTransaction'
  | 'wallet_switchEthereumChain';

export interface PendingRequest {
  id: string;
  method: string;
  params: unknown[];
  origin: string;
  timestamp: number;
}

// ============== Staking Types ==============

export interface StakingPool {
  id: string;
  name: string;
  tokenAddress: string;
  tokenSymbol: string;
  rewardToken: string;
  apy: number;
  tvl: string;
  minStake: string;
  lockPeriod: number; // days
  logo: string;
}

export interface StakingPosition {
  poolId: string;
  amount: string;
  rewards: string;
  stakedAt: number;
  unlockTime?: number;
  apy: number;
}

// ============== Swap Types ==============

export interface SwapToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  logo: string;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  path: string[];
  priceImpact: string;
  source: 'PancakeSwap' | 'DexScreener' | 'Estimated';
  isEstimate?: boolean;
  minAmountOut?: string;
}

// ============== Price Types ==============

export interface TokenPrice {
  symbol: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  lastUpdated: number;
}

// ============== Security Types ==============

export interface SecurityConfig {
  autoLockMinutes: number;
  requirePinForTransactions: boolean;
  biometricEnabled: boolean;
  lastActivity: number;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

// ============== Result Types ==============

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export interface AsyncResult<T> {
  data?: T;
  error?: string;
  loading: boolean;
}
