/**
 * FUN Wallet — Single Source of Truth for theme tokens
 *
 * Extracted from "Hình 1" (Rainbow Fresh Awakening).
 * These values MUST match `:root` in `src/index.css` exactly.
 * Do NOT write these values to `document.documentElement` at runtime —
 * `index.css` owns them and `ThemeProvider` only toggles the `.dark` class.
 */

export const RAINBOW_COLORS = {
  red: "#FF0000",
  orange: "#FFA500",
  yellow: "#FFFF00",
  green: "#00FF7F",
  blue: "#00BFFF",
  indigo: "#4B0082",
  violet: "#FF00FF",
} as const;

/** HSL "H S% L%" strings, matched to index.css `:root` for light mode. */
export const THEME_TOKENS_LIGHT = {
  background: "0 0% 98%",
  foreground: "180 50% 20%",
  card: "0 0% 100%",
  cardForeground: "180 50% 20%",
  popover: "0 0% 100%",
  popoverForeground: "180 50% 20%",
  primary: "157 100% 50%",
  primaryForeground: "180 60% 15%",
  secondary: "195 100% 50%",
  secondaryForeground: "195 60% 15%",
  muted: "0 0% 96%",
  mutedForeground: "180 30% 40%",
  accent: "45 100% 50%",
  accentForeground: "45 60% 15%",
  destructive: "0 84% 60%",
  destructiveForeground: "0 0% 100%",
  success: "157 100% 45%",
  successForeground: "0 0% 100%",
  warning: "35 100% 50%",
  warningForeground: "35 60% 15%",
  border: "0 0% 88%",
  input: "0 0% 88%",
  ring: "157 100% 50%",
  glow: "157 100% 50%",
} as const;

export const THEME_TOKENS_DARK = {
  background: "180 40% 6%",
  foreground: "150 20% 95%",
  card: "180 35% 9%",
  cardForeground: "150 20% 95%",
  popover: "180 35% 9%",
  popoverForeground: "150 20% 95%",
  primary: "157 100% 55%",
  primaryForeground: "180 60% 8%",
  secondary: "195 100% 55%",
  secondaryForeground: "195 60% 8%",
  muted: "180 20% 14%",
  mutedForeground: "150 15% 68%",
  accent: "45 100% 55%",
  accentForeground: "45 60% 10%",
  destructive: "0 74% 58%",
  destructiveForeground: "0 0% 100%",
  success: "157 100% 50%",
  successForeground: "180 40% 6%",
  warning: "35 100% 55%",
  warningForeground: "35 60% 10%",
  border: "180 20% 16%",
  input: "180 20% 18%",
  ring: "157 100% 55%",
  glow: "157 100% 55%",
} as const;

/** Vibrant Dashboard action-tile palette (from Hình 1). */
export const TILE_TOKENS = {
  red: "0 100% 50%",       // Gửi
  coral: "10 100% 65%",    // Gửi nhiều
  orange: "30 100% 50%",   // Nhận
  yellow: "60 100% 50%",   // Swap
  green: "157 100% 50%",   // Stake
  cyan: "195 100% 55%",    // Thêm / WC
  purple: "270 100% 25%",  // Giá
  magenta: "300 100% 50%", // DApps
  emerald: "160 100% 45%", // Backup
  violet: "280 70% 55%",   // QR
  teal: "180 80% 45%",     // History
  pink: "330 100% 55%",    // Learn
  slate: "0 0% 92%",       // Refresh (neutral)
} as const;

export type TileColor = keyof typeof TILE_TOKENS;

/** Ordered list used by the /theme-preview swatch grid. */
export const TOKEN_SWATCHES = [
  "background",
  "foreground",
  "card",
  "primary",
  "secondary",
  "accent",
  "muted",
  "mutedForeground",
  "border",
  "ring",
  "success",
  "warning",
  "destructive",
] as const;
