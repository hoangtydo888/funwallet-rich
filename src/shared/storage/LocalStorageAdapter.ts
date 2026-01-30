import { StorageAdapter } from './types';

/**
 * LocalStorage Adapter for PWA
 * 
 * Implements StorageAdapter interface using browser localStorage.
 * Used in PWA/web environment.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[LocalStorageAdapter] Error getting key:', key, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('[LocalStorageAdapter] Error setting key:', key, error);
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[LocalStorageAdapter] Error removing key:', key, error);
    }
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const result: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            result[key] = value;
          }
        }
      }
      return result;
    } catch (error) {
      console.error('[LocalStorageAdapter] Error getting all:', error);
      return {};
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('[LocalStorageAdapter] Error checking key:', key, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Only clear fun_wallet prefixed keys to avoid clearing other app data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('fun_wallet')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[LocalStorageAdapter] Error clearing:', error);
    }
  }
}

// Singleton instance for PWA
export const localStorageAdapter = new LocalStorageAdapter();
