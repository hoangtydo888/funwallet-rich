import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Crown, Award, Medal } from "lucide-react";

interface MintBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMint: (badgeType: "gold" | "silver" | "bronze") => Promise<{ success: boolean }>;
}

const badges = [
  {
    type: "gold" as const,
    name: "Gold Badge",
    price: "0.05 BNB",
    icon: Crown,
    gradient: "from-yellow-400 to-amber-500",
    benefits: ["VIP Access", "Exclusive Airdrops", "Premium Support"],
  },
  {
    type: "silver" as const,
    name: "Silver Badge",
    price: "0.02 BNB",
    icon: Award,
    gradient: "from-slate-300 to-slate-400",
    benefits: ["Early Access", "Community Events", "Priority Support"],
  },
  {
    type: "bronze" as const,
    name: "Bronze Badge",
    price: "0.01 BNB",
    icon: Medal,
    gradient: "from-orange-400 to-orange-600",
    benefits: ["Member Badge", "Community Access", "Basic Rewards"],
  },
];

export const MintBadgeDialog = ({ open, onOpenChange, onMint }: MintBadgeDialogProps) => {
  const [minting, setMinting] = useState<string | null>(null);

  const handleMint = async (badgeType: "gold" | "silver" | "bronze") => {
    setMinting(badgeType);
    const result = await onMint(badgeType);
    setMinting(null);
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Mint FUN Badge
          </DialogTitle>
          <DialogDescription>
            Sở hữu FUN Badge độc quyền để nhận đặc quyền trong hệ sinh thái
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            const isLoading = minting === badge.type;

            return (
              <div
                key={badge.type}
                className="p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Badge icon */}
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center text-white shrink-0`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  {/* Badge info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{badge.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {badge.price}
                      </Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {badge.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mint button */}
                  <Button
                    onClick={() => handleMint(badge.type)}
                    disabled={minting !== null}
                    className={`shrink-0 bg-gradient-to-r ${badge.gradient} hover:opacity-90`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Mint"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground text-center">
            * Giá mint demo. Trong phiên bản chính thức, badge sẽ được mint trên BNB Chain.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
