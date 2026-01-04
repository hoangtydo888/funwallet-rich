import { Check, Sparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Theme } from "@/contexts/ThemeContext";
import { RAINBOW_COLORS } from "@/contexts/ThemeContext";

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}

export const ThemeCard = ({ theme, isActive, onSelect }: ThemeCardProps) => {
  const isRainbow = theme.id === "rainbow-fresh-awakening";
  const rainbowColors = Object.values(RAINBOW_COLORS);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl p-4 transition-all duration-300 bg-card",
        "border-2 hover:scale-[1.02]",
        isActive
          ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
          : "border-border hover:border-primary/50",
        isRainbow && isActive && "glow-rainbow"
      )}
    >
      {/* Recommended Badge */}
      {theme.isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-[#00FF7F] to-[#00BFFF] text-white font-semibold shadow-lg">
            <Crown className="h-3 w-3 mr-1" />
            Tươi Sáng
          </Badge>
        </div>
      )}

      {/* Preview Gradient - Rainbow animated */}
      <div
        className={cn(
          "h-24 rounded-xl mb-4 transition-all duration-300",
          isActive && "shadow-lg",
          isRainbow && "animate-gradient"
        )}
        style={{
          background: theme.preview,
          backgroundSize: isRainbow ? "400% 100%" : undefined,
        }}
      >
        {/* Rainbow emoji for the theme */}
        <div className="w-full h-full flex items-center justify-center">
          {isRainbow ? (
            <span className="text-4xl drop-shadow-lg">🌈</span>
          ) : (
            theme.isRecommended && (
              <Sparkles
                className="h-8 w-8 text-white/80 animate-pulse"
                style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))" }}
              />
            )
          )}
        </div>
      </div>

      {/* Color swatches for rainbow theme */}
      {isRainbow && (
        <div className="flex justify-center gap-1.5 mb-3">
          {rainbowColors.map((color, index) => (
            <div
              key={index}
              className="w-5 h-5 rounded-full shadow-md border-2 border-white"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm truncate">
            {theme.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {theme.description}
          </p>
        </div>

        {/* Active indicator */}
        {isActive && (
          <div
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-[#00FF7F]"
          >
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
