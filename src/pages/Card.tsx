import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Lock, Unlock, Settings, History, Sparkles, Crown, Shield, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useCard } from "@/hooks/useCard";
import BottomNav from "@/components/layout/BottomNav";

const cardTiers = [
  {
    id: "bronze" as const,
    name: "Bronze",
    icon: "🥉",
    limit: "$1,000/tháng",
    benefits: ["Thanh toán online", "Rút ATM cơ bản"],
    requirement: "Miễn phí",
    color: "from-amber-600 to-amber-800",
  },
  {
    id: "silver" as const,
    name: "Silver",
    icon: "🥈",
    limit: "$5,000/tháng",
    benefits: ["Hạn mức cao hơn", "Cashback 1%", "ATM 50+ quốc gia"],
    requirement: "Stake 100 CAMLY",
    color: "from-gray-400 to-gray-600",
  },
  {
    id: "gold" as const,
    name: "Gold",
    icon: "🥇",
    limit: "Không giới hạn",
    benefits: ["Unlimited spending", "Cashback 2%", "ATM 150+ quốc gia", "Priority support 24/7", "NFT Badge độc quyền"],
    requirement: "Stake 1000 CAMLY",
    color: "from-yellow-400 to-amber-500",
  },
];

const nftBadges = [
  { id: "gold", icon: "🥇", name: "Gold Badge" },
  { id: "silver", icon: "🥈", name: "Silver Badge" },
  { id: "bronze", icon: "🥉", name: "Bronze Badge" },
  { id: "rainbow", icon: "🌈", name: "Rainbow Badge" },
];

const FunCard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { card, loading, updating, toggleCardLock, updateTier, updateBadge, topUpBalance } = useCard();
  const [showCardNumber, setShowCardNumber] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTier = cardTiers.find(t => t.id === card?.card_tier) || cardTiers[0];
  const selectedBadgeData = nftBadges.find(b => b.id === card?.nft_badge_id);

  // Format card number for display
  const formatCardNumber = (number: string | undefined): string => {
    if (!number) return "•••• •••• •••• ••••";
    if (!showCardNumber) {
      return `•••• •••• •••• ${number.slice(-4)}`;
    }
    return number.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleUpgrade = async (tierId: "bronze" | "silver" | "gold") => {
    if (updating || tierId === card?.card_tier) return;
    await updateTier(tierId);
  };

  const handleBadgeSelect = async (badgeId: string) => {
    if (updating) return;
    const newBadgeId = badgeId === card?.nft_badge_id ? null : badgeId;
    await updateBadge(newBadgeId);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">FUN Card</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Virtual Card */}
        <div className="perspective-1000">
          <Card 
            className={`relative overflow-hidden bg-gradient-to-br ${currentTier.color} text-white shadow-2xl transform transition-transform hover:rotate-y-5 hover:scale-105`}
            style={{ aspectRatio: "1.6/1" }}
          >
            <CardContent className="p-6 h-full flex flex-col justify-between relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <h2 className="text-xl font-heading font-bold">FUN CARD</h2>
                  <p className="text-sm opacity-80">{currentTier.name}</p>
                </div>
                {selectedBadgeData && (
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl animate-pulse-glow">
                    {selectedBadgeData.icon}
                  </div>
                )}
              </div>

              {/* Chip & Contactless */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md">
                  <div className="w-full h-full grid grid-cols-3 gap-0.5 p-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-yellow-600/30 rounded-sm" />
                    ))}
                  </div>
                </div>
                <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                </svg>
              </div>

              {/* Card Number */}
              <div className="relative z-10">
                <p className="text-lg font-mono tracking-widest">
                  {formatCardNumber(card?.card_number)}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <p className="text-xs opacity-70">CARDHOLDER</p>
                  <p className="font-semibold">{user?.email?.split("@")[0].toUpperCase() || "FUN USER"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">VALID THRU</p>
                  <p className="font-semibold">12/28</p>
                </div>
              </div>

              {/* Lock Overlay */}
              {card?.is_locked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="text-center">
                    <Lock className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-semibold">Thẻ đã bị khóa</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Card Balance & Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Số dư thẻ</p>
              <p className="text-2xl font-bold rainbow-text">${card?.balance.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Hạn mức</p>
              <p className="text-2xl font-bold text-foreground">{currentTier.limit}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={toggleCardLock}
            disabled={updating}
          >
            {updating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : card?.is_locked ? (
              <Unlock className="w-5 h-5 text-success" />
            ) : (
              <Lock className="w-5 h-5 text-destructive" />
            )}
            <span className="text-xs">{card?.is_locked ? "Mở khóa" : "Khóa thẻ"}</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => topUpBalance(100)}
            disabled={updating}
          >
            <CreditCard className="w-5 h-5 text-secondary" />
            <span className="text-xs">Nạp tiền</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate("/history")}
          >
            <History className="w-5 h-5 text-accent" />
            <span className="text-xs">Lịch sử</span>
          </Button>
        </div>

        {/* Show/Hide Card Number */}
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <span>Hiển thị số thẻ</span>
            </div>
            <Switch checked={showCardNumber} onCheckedChange={setShowCardNumber} />
          </CardContent>
        </Card>

        {/* Card Tiers */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            Card Tiers
          </h2>
          
          {cardTiers.map((tier) => (
            <Card 
              key={tier.id}
              className={`cursor-pointer transition-all ${
                card?.card_tier === tier.id 
                  ? "gradient-border ring-2 ring-primary" 
                  : "glass-card hover:border-primary/50"
              }`}
              onClick={() => handleUpgrade(tier.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <div>
                      <h3 className="font-semibold">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">{tier.limit}</p>
                    </div>
                  </div>
                  {card?.card_tier === tier.id && (
                    <Badge className="bg-primary text-primary-foreground">Hiện tại</Badge>
                  )}
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground mb-3">
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Yêu cầu: <span className="font-medium text-foreground">{tier.requirement}</span>
                </p>
              </CardContent>
            </Card>
          ))}

          {card?.card_tier !== "gold" && (
            <Button 
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold"
              onClick={() => handleUpgrade("gold")}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              Nâng cấp Gold
            </Button>
          )}
        </div>

        {/* NFT Badge Selection */}
        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">NFT Badge trên thẻ</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {nftBadges.map((badge) => (
              <button
                key={badge.id}
                onClick={() => handleBadgeSelect(badge.id)}
                disabled={updating}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                  card?.nft_badge_id === badge.id
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted hover:bg-muted/80"
                } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{badge.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global ATM */}
        <Card className="gradient-border overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Rút tiền ATM toàn cầu</h3>
              <p className="text-sm text-muted-foreground">Hỗ trợ 150+ quốc gia</p>
            </div>
            <Button variant="outline" size="sm">
              Tìm ATM
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default FunCard;
