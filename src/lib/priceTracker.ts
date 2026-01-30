/**
 * Price Tracker - PWA Re-export from shared
 * 
 * This file re-exports from shared module for backward compatibility
 * All price tracking logic is now in src/shared/lib/priceTracker.ts
 */

// Re-export everything from shared
export * from '../shared/lib/priceTracker';

// PWA-specific storage functions (use localStorage directly)
const ALERTS_KEY = "fun_wallet_price_alerts";
const FAVORITES_KEY = "fun_wallet_favorite_tokens";

import type { PriceAlert } from '../shared/lib/priceTracker';

// Save alerts to local storage
export const saveAlerts = (alerts: PriceAlert[]): void => {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
};

// Load alerts from local storage
export const loadAlerts = (): PriceAlert[] => {
  try {
    const saved = localStorage.getItem(ALERTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save favorite tokens
export const saveFavorites = (favorites: string[]): void => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

// Load favorite tokens
export const loadFavorites = (): string[] => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : ["BNB", "CAKE", "ETH"];
  } catch {
    return ["BNB", "CAKE", "ETH"];
  }
};
