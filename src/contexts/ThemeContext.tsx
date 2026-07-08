import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { RAINBOW_COLORS, THEME_TOKENS_LIGHT } from "@/theme/tokens";

/**
 * Theme is LOCKED to the Rainbow Fresh Awakening system defined in
 * `src/index.css` and `src/theme/tokens.ts`. This provider only toggles
 * the `.dark` class on <html>. It does NOT write CSS variables at runtime —
 * doing so is what caused colors to drift across routes / refreshes.
 */

export { RAINBOW_COLORS };

export type ThemeMode = "light" | "dark";

export interface Theme {
  id: string;
  name: string;
  description: string;
  isRecommended: boolean;
  isDefault?: boolean;
  colors: Record<string, string>;
  preview: string;
  rainbowColors?: typeof RAINBOW_COLORS;
}

/** Kept for backward compatibility with Settings / ThemeCard UI. */
export const THEMES: Record<string, Theme> = {
  "rainbow-fresh-awakening": {
    id: "rainbow-fresh-awakening",
    name: "Rainbow Fresh Awakening",
    description: "Tươi sáng rạng ngời — hệ màu đã khóa theo Hình 1",
    isRecommended: true,
    isDefault: true,
    colors: THEME_TOKENS_LIGHT as unknown as Record<string, string>,
    preview:
      "linear-gradient(135deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)",
    rainbowColors: RAINBOW_COLORS,
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: typeof THEMES;
  rainbowColors: typeof RAINBOW_COLORS;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = "fun_wallet_mode";
const LEGACY_THEME_KEY = "fun_wallet_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      /* ignore */
    }
    return "light";
  });

  // Clean up legacy theme key so old per-route theme drift can't return
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_THEME_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Toggle `.dark` on <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // Dev-only guard: warn if anything writes theme tokens after mount
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const root = document.documentElement;
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.attributeName === "style") {
          const style = root.getAttribute("style") ?? "";
          if (/--(primary|secondary|accent|background|foreground|card|border|ring|muted)\b/.test(style)) {
            // eslint-disable-next-line no-console
            console.warn(
              "[ThemeContext] Detected runtime write to theme tokens on <html>. " +
                "Colors are locked in index.css — remove the setProperty call.",
              style
            );
          }
        }
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  const setTheme = (_themeId: string) => {
    // Only one theme exists now. Kept for API compatibility.
  };

  const setMode = (next: ThemeMode) => setModeState(next);
  const toggleMode = () => setModeState((m) => (m === "dark" ? "light" : "dark"));

  const currentTheme = THEMES["rainbow-fresh-awakening"];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        themes: THEMES,
        rainbowColors: RAINBOW_COLORS,
        mode,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
