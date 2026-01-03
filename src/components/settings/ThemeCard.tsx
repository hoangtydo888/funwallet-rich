import { Check, Sparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Theme } from "@/contexts/ThemeContext";

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}

export const ThemeCard = ({ theme, isActive, onSelect }: ThemeCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl p-4 transition-all duration-300",
        "border-2 hover:scale-[1.02]",
        isActive
          ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Recommended Badge */}
      {theme.isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold shadow-lg">
            <Crown className="h-3 w-3 mr-1" />
            Divine Exclusive
          </Badge>
        </div>
      )}

      {/* Preview Gradient */}
      <div
        className={cn(
          "h-24 rounded-xl mb-4 transition-all duration-300",
          isActive && "shadow-lg"
        )}
        style={{
          background: theme.preview,
          boxShadow: isActive
            ? `0 10px 40px -10px hsl(${theme.colors.primary} / 0.5)`
            : undefined,
        }}
      >
        {/* Decorative elements */}
        <div className="w-full h-full flex items-center justify-center">
          {theme.isRecommended && (
            <Sparkles
              className="h-8 w-8 text-white/80 animate-pulse"
              style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))" }}
            />
          )}
        </div>
      </div>

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
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${theme.colors.primary}), hsl(${theme.colors.secondary}))`,
            }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Glow effect for active theme */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, hsl(${theme.colors.primary} / 0.3) 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};
