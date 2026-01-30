/**
 * Storage Adapter Interface
 * 
 * Abstract interface for storage operations.
 * Allows PWA to use localStorage and Extension to use chrome.storage.local
 */

export interface StorageAdapter {
  /**
   * Get a value from storage
   * @param key - Storage key
   * @returns Value or null if not found
   */
  get: (key: string) => Promise<string | null>;

  /**
   * Set a value in storage
   * @param key - Storage key
   * @param value - Value to store
   */
  set: (key: string, value: string) => Promise<void>;

  /**
   * Remove a value from storage
   * @param key - Storage key
   */
  remove: (key: string) => Promise<void>;

  /**
   * Get all values from storage
   * @returns All stored key-value pairs
   */
  getAll: () => Promise<Record<string, string>>;

  /**
   * Check if a key exists in storage
   * @param key - Storage key
   * @returns True if key exists
   */
  has: (key: string) => Promise<boolean>;

  /**
   * Clear all values from storage
   */
  clear: () => Promise<void>;
}

/**
 * Storage keys used across the application
 */
export const STORAGE_KEYS = {
  // Wallet related
  WALLETS: 'fun_wallet_list',
  ACTIVE_WALLET: 'fun_wallet_active',
  ENCRYPTED_KEYS: 'fun_wallet_encrypted_v2',
  
  // Chain related
  CURRENT_CHAIN: 'fun_wallet_chain',
  
  // Security related
  PIN_HASH: 'fun_wallet_pin_hash',
  SESSION_TOKEN: 'fun_wallet_session',
  AUTO_LOCK_TIME: 'fun_wallet_auto_lock',
  LAST_ACTIVITY: 'fun_wallet_last_activity',
  
  // Settings
  SETTINGS: 'fun_wallet_settings',
  THEME: 'fun_wallet_theme',
  LANGUAGE: 'fun_wallet_language',
  
  // Token related
  CUSTOM_TOKENS: 'fun_wallet_custom_tokens',
  TOKEN_PRICES_CACHE: 'fun_wallet_prices_cache',
  
  // DApp connections (extension only)
  DAPP_CONNECTIONS: 'fun_wallet_dapp_connections',
  PENDING_REQUESTS: 'fun_wallet_pending_requests',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
