import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface WatchlistItem {
  id: string;
  chain_id: number;
  token_address: string;
  symbol: string;
  name: string | null;
  logo_url: string | null;
  decimals: number | null;
  created_at: string;
}

export const useWatchlist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_watchlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isWatched = useCallback(
    (chainId: number, tokenAddress: string) =>
      items.some(
        (i) =>
          i.chain_id === chainId &&
          i.token_address.toLowerCase() === tokenAddress.toLowerCase(),
      ),
    [items],
  );

  const add = async (t: Omit<WatchlistItem, "id" | "created_at">) => {
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_watchlist").insert({
      user_id: user.id,
      chain_id: t.chain_id,
      token_address: t.token_address.toLowerCase(),
      symbol: t.symbol,
      name: t.name,
      logo_url: t.logo_url,
      decimals: t.decimals ?? 18,
    });
    if (error) {
      toast({ title: "Không thể thêm", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Đã thêm vào Watchlist ⭐" });
      refresh();
    }
  };

  const remove = async (chainId: number, tokenAddress: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("chain_id", chainId)
      .eq("token_address", tokenAddress.toLowerCase());
    if (error) {
      toast({ title: "Không thể xóa", description: error.message, variant: "destructive" });
    } else {
      refresh();
    }
  };

  const toggle = async (t: Omit<WatchlistItem, "id" | "created_at">) => {
    if (isWatched(t.chain_id, t.token_address)) {
      await remove(t.chain_id, t.token_address);
    } else {
      await add(t);
    }
  };

  return { items, loading, refresh, isWatched, add, remove, toggle };
};
