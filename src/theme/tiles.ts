/**
 * FUN Wallet — Dashboard tile colors (single source of truth).
 *
 * Class strings are written literally so Tailwind's JIT can see them.
 * Shared by `src/pages/Dashboard.tsx` and `src/pages/TileDiagnostics.tsx`
 * so the diagnostics screen can never drift from the real Dashboard.
 */

import { TILE_TOKENS, type TileColor } from "./tokens";

export const TILE_STYLES: Record<TileColor, string> = {
  red: "bg-tile-red text-white shadow-elegant",
  coral: "bg-tile-coral text-white shadow-elegant",
  orange: "bg-tile-orange text-white shadow-elegant",
  yellow: "bg-tile-yellow text-black shadow-elegant",
  green: "bg-tile-green text-black shadow-elegant",
  cyan: "bg-tile-cyan text-white shadow-elegant",
  purple: "bg-tile-purple text-white shadow-elegant",
  magenta: "bg-tile-magenta text-white shadow-elegant",
  emerald: "bg-tile-emerald text-white shadow-elegant",
  violet: "bg-tile-violet text-white shadow-elegant",
  teal: "bg-tile-teal text-white shadow-elegant",
  pink: "bg-tile-pink text-white shadow-elegant",
  slate: "bg-tile-slate text-foreground shadow-elegant",
};

/** The exact tile order/labels used on the Dashboard quick-action grids. */
export const DASHBOARD_TILES: { label: string; color: TileColor }[] = [
  { label: "Gửi", color: "red" },
  { label: "Gửi nhiều", color: "coral" },
  { label: "Nhận", color: "orange" },
  { label: "Swap", color: "yellow" },
  { label: "Stake", color: "green" },
  { label: "Thêm / Tạo ví", color: "cyan" },
  { label: "Giá", color: "purple" },
  { label: "DApps", color: "magenta" },
  { label: "Backup", color: "emerald" },
  { label: "WalletConnect", color: "cyan" },
  { label: "QR", color: "violet" },
  { label: "Refresh", color: "slate" },
  { label: "Token", color: "yellow" },
  { label: "NFT", color: "orange" },
  { label: "History", color: "teal" },
  { label: "Ví của tôi", color: "green" },
  { label: "Learn", color: "pink" },
];

/** HSL token string for a tile color, e.g. "0 100% 50%". */
export const tileToken = (color: TileColor) => TILE_TOKENS[color];

export { TILE_TOKENS };
export type { TileColor };
