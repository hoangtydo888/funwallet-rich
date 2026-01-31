import { StorageAdapter } from '@shared/storage/types';

/**
 * Chrome Storage Adapter for Extension
 * 
 * Implements StorageAdapter interface using chrome.storage.local
 * Used in Chrome Extension environment.
 */
export class ChromeStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error getting key:', key, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error setting key:', key, error);
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error removing key:', key, error);
    }
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const result = await chrome.storage.local.get(null);
      return result as Record<string, string>;
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error getting all:', error);
      return {};
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined;
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error checking key:', key, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear fun_wallet prefixed keys
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allData).filter(key => key.startsWith('fun_wallet'));
      await chrome.storage.local.remove(keysToRemove);
    } catch (error) {
      console.error('[ChromeStorageAdapter] Error clearing:', error);
    }
  }
}

// Singleton instance for extension
export const chromeStorageAdapter = new ChromeStorageAdapter();
