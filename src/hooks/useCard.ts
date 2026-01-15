import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserCard {
  id: string;
  user_id: string;
  card_number: string;
  card_tier: "bronze" | "silver" | "gold";
  balance: number;
  is_locked: boolean;
  nft_badge_id: string | null;
  created_at: string;
  updated_at: string;
}

// Generate a random card number
const generateCardNumber = (): string => {
  const prefix = "5432"; // FUN Card prefix
  const random = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return prefix + random;
};

export const useCard = () => {
  const { user } = useAuth();
  const [card, setCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch user's card
  const fetchCard = useCallback(async () => {
    if (!user) {
      setCard(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCard({
          ...data,
          card_tier: data.card_tier as "bronze" | "silver" | "gold",
          balance: Number(data.balance),
        });
      } else {
        // Create new card for user
        const newCard = await createCard();
        if (newCard) setCard(newCard);
      }
    } catch (error) {
      console.error("Error fetching card:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin thẻ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create new card
  const createCard = async (): Promise<UserCard | null> => {
    if (!user) return null;

    try {
      const newCardData = {
        user_id: user.id,
        card_number: generateCardNumber(),
        card_tier: "bronze",
        balance: 0,
        is_locked: false,
        nft_badge_id: null,
      };

      const { data, error } = await supabase
        .from("user_cards")
        .insert(newCardData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "🎉 Thẻ đã được tạo!",
        description: "FUN Card Bronze của bạn đã sẵn sàng",
      });

      return {
        ...data,
        card_tier: data.card_tier as "bronze" | "silver" | "gold",
        balance: Number(data.balance),
      };
    } catch (error) {
      console.error("Error creating card:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo thẻ mới",
        variant: "destructive",
      });
      return null;
    }
  };

  // Lock/unlock card
  const toggleCardLock = async (): Promise<boolean> => {
    if (!user || !card) return false;

    setUpdating(true);
    try {
      const newLockState = !card.is_locked;
      const { error } = await supabase
        .from("user_cards")
        .update({ is_locked: newLockState })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCard({ ...card, is_locked: newLockState });
      toast({
        title: newLockState ? "🔒 Thẻ đã khóa" : "🔓 Thẻ đã mở khóa",
        description: newLockState 
          ? "Thẻ của bạn đã được khóa tạm thời" 
          : "Thẻ của bạn đã sẵn sàng sử dụng",
      });
      return true;
    } catch (error) {
      console.error("Error toggling card lock:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thay đổi trạng thái thẻ",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Update card tier
  const updateTier = async (newTier: "bronze" | "silver" | "gold"): Promise<boolean> => {
    if (!user || !card) return false;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ card_tier: newTier })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCard({ ...card, card_tier: newTier });
      toast({
        title: `🎉 Nâng cấp thành công!`,
        description: `Thẻ của bạn đã được nâng lên ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}`,
      });
      return true;
    } catch (error) {
      console.error("Error updating tier:", error);
      toast({
        title: "Lỗi",
        description: "Không thể nâng cấp thẻ",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Update NFT badge
  const updateBadge = async (badgeId: string | null): Promise<boolean> => {
    if (!user || !card) return false;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ nft_badge_id: badgeId })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCard({ ...card, nft_badge_id: badgeId });
      toast({
        title: "✨ Badge đã cập nhật",
        description: badgeId ? "Badge mới đã được áp dụng lên thẻ" : "Đã xóa badge khỏi thẻ",
      });
      return true;
    } catch (error) {
      console.error("Error updating badge:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật badge",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Top up card balance
  const topUpBalance = async (amount: number): Promise<boolean> => {
    if (!user || !card) return false;

    setUpdating(true);
    try {
      const newBalance = card.balance + amount;
      const { error } = await supabase
        .from("user_cards")
        .update({ balance: newBalance })
        .eq("id", card.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCard({ ...card, balance: newBalance });
      toast({
        title: "💰 Nạp tiền thành công!",
        description: `Đã nạp $${amount.toFixed(2)} vào thẻ`,
      });
      return true;
    } catch (error) {
      console.error("Error topping up balance:", error);
      toast({
        title: "Lỗi",
        description: "Không thể nạp tiền",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  return {
    card,
    loading,
    updating,
    toggleCardLock,
    updateTier,
    updateBadge,
    topUpBalance,
    refreshCard: fetchCard,
  };
};
