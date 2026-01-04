import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 7 màu cầu vồng - sử dụng trong toàn app
export const RAINBOW_COLORS = {
  red: "#FF0000",
  orange: "#FFA500",
  yellow: "#FFFF00",
  green: "#00FF7F",      // Màu chủ đạo Spring Green
  blue: "#00BFFF",
  indigo: "#4B0082",
  violet: "#FF00FF",
} as const;

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
  isDefault?: boolean;
  colors: ThemeColors;
  preview: string;
  rainbowColors?: typeof RAINBOW_COLORS;
}

export const THEMES: Record<string, Theme> = {
  "rainbow-fresh-awakening": {
    id: "rainbow-fresh-awakening",
    name: "Rainbow Fresh Awakening",
    description: "Tươi sáng rạng ngời - Năng lượng tích cực",
    isRecommended: true,
    isDefault: true,
    colors: {
      primary: "157 100% 50%",           // #00FF7F Spring Green
      secondary: "195 100% 50%",         // #00BFFF Deep Sky Blue
      accent: "45 100% 50%",             // Yellow accent
      background: "0 0% 98%",            // #FAFAFA gần trắng
      card: "0 0% 100%",                 // Pure White cards
      border: "0 0% 88%",                // Light gray border
      ring: "157 100% 50%",              // Green ring
      glow: "157 100% 50%",              // Green glow
      foreground: "180 50% 20%",         // Xanh ngọc lam đậm - dễ đọc
      muted: "0 0% 96%",                 // Very light gray
      mutedForeground: "180 30% 40%",    // Xanh ngọc lam nhạt
    },
    preview: "linear-gradient(135deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)",
    rainbowColors: RAINBOW_COLORS,
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: typeof THEMES;
  rainbowColors: typeof RAINBOW_COLORS;
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
    return THEMES["rainbow-fresh-awakening"]; // Default theme
  });

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    // Remove dark class for light mode
    root.classList.remove("dark");

    // Apply all theme colors
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", "180 60% 15%");
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--secondary-foreground", "195 60% 15%");
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-foreground", "45 60% 15%");
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

    // Rainbow gradient
    root.style.setProperty(
      "--gradient-rainbow",
      "linear-gradient(135deg, #FF0000, #FFA500, #FFFF00, #00FF7F, #00BFFF, #4B0082, #FF00FF)"
    );
    root.style.setProperty(
      "--gradient-primary",
      "linear-gradient(135deg, hsl(157, 100%, 50%) 0%, hsl(195, 100%, 50%) 100%)"
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
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEMES, rainbowColors: RAINBOW_COLORS }}>
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
