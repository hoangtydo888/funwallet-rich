import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  border: string;
  ring: string;
  glow: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  isRecommended: boolean;
  colors: ThemeColors;
  preview: string;
}

export const THEMES: Record<string, Theme> = {
  "cosmic-golden-age": {
    id: "cosmic-golden-age",
    name: "Cosmic Golden Age",
    description: "Divine Exclusive Theme - Ánh sáng vũ trụ hoàng kim",
    isRecommended: true,
    colors: {
      primary: "45 100% 50%",           // #FFD700 Pure Gold
      secondary: "40 95% 55%",          // Gold lighter
      accent: "38 92% 50%",             // Amber accent
      background: "0 0% 0%",            // Pure Black #000000
      card: "40 15% 6%",                // Dark with gold tint
      border: "45 30% 20%",             // Gold border subtle
      ring: "45 100% 50%",              // Gold ring
      glow: "45 100% 50%",              // Gold glow
      foreground: "45 20% 95%",         // Light gold-tinted white
      muted: "40 10% 12%",              // Muted gold-dark
      mutedForeground: "45 15% 55%",    // Muted gold text
    },
    preview: "linear-gradient(135deg, #FFD700 0%, #000000 100%)",
  },
  "midnight-blue": {
    id: "midnight-blue",
    name: "Midnight Blue",
    description: "Bầu trời đêm thanh bình",
    isRecommended: false,
    colors: {
      primary: "217 91% 60%",           // #3B82F6 Blue
      secondary: "199 89% 48%",         // Cyan
      accent: "199 89% 48%",
      background: "222 47% 6%",         // Dark blue
      card: "222 47% 9%",
      border: "217 32% 20%",
      ring: "217 91% 60%",
      glow: "217 91% 60%",
      foreground: "210 40% 98%",
      muted: "217 20% 15%",
      mutedForeground: "217 15% 55%",
    },
    preview: "linear-gradient(135deg, #3B82F6 0%, #0F172A 100%)",
  },
  "emerald-forest": {
    id: "emerald-forest",
    name: "Emerald Forest",
    description: "Thiên nhiên xanh mát",
    isRecommended: false,
    colors: {
      primary: "152 76% 45%",           // #10B981 Emerald
      secondary: "160 84% 39%",
      accent: "160 84% 39%",
      background: "160 30% 4%",
      card: "160 25% 7%",
      border: "152 30% 18%",
      ring: "152 76% 45%",
      glow: "152 76% 45%",
      foreground: "152 20% 95%",
      muted: "160 15% 12%",
      mutedForeground: "152 15% 55%",
    },
    preview: "linear-gradient(135deg, #10B981 0%, #064E3B 100%)",
  },
  "royal-purple": {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Vương giả tím cao quý",
    isRecommended: false,
    colors: {
      primary: "262 83% 58%",           // Original purple
      secondary: "280 70% 50%",
      accent: "280 70% 50%",
      background: "262 25% 6%",
      card: "262 25% 9%",
      border: "262 20% 18%",
      ring: "262 83% 58%",
      glow: "262 83% 58%",
      foreground: "260 20% 98%",
      muted: "262 15% 15%",
      mutedForeground: "262 15% 55%",
    },
    preview: "linear-gradient(135deg, #8B5CF6 0%, #1E1B4B 100%)",
  },
  "rose-gold": {
    id: "rose-gold",
    name: "Rose Gold",
    description: "Vàng hồng thanh lịch",
    isRecommended: false,
    colors: {
      primary: "350 80% 65%",           // Rose
      secondary: "20 80% 60%",          // Peach
      accent: "350 80% 65%",
      background: "350 15% 5%",
      card: "350 15% 8%",
      border: "350 20% 18%",
      ring: "350 80% 65%",
      glow: "350 80% 65%",
      foreground: "350 15% 95%",
      muted: "350 10% 12%",
      mutedForeground: "350 15% 55%",
    },
    preview: "linear-gradient(135deg, #F472B6 0%, #1F1315 100%)",
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "fun_wallet_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && THEMES[stored]) {
        return THEMES[stored];
      }
    } catch {
      // Ignore
    }
    return THEMES["cosmic-golden-age"]; // Default theme
  });

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    // Apply all theme colors
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--card", colors.card);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.border);
    root.style.setProperty("--ring", colors.ring);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card-foreground", colors.foreground);
    root.style.setProperty("--popover", colors.card);
    root.style.setProperty("--popover-foreground", colors.foreground);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--muted-foreground", colors.mutedForeground);
    root.style.setProperty("--glow-color", colors.glow);

    // Update gradients based on theme
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${colors.primary}) 0%, hsl(${colors.secondary}) 100%)`
    );
    root.style.setProperty(
      "--gradient-glow",
      `radial-gradient(ellipse at center, hsl(${colors.primary} / 0.15) 0%, transparent 70%)`
    );

    // Store preference
    localStorage.setItem(STORAGE_KEY, currentTheme.id);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    if (THEMES[themeId]) {
      setCurrentTheme(THEMES[themeId]);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEMES }}>
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
