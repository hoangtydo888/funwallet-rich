import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  createNewWallet,
  importWalletFromMnemonic,
  importWalletFromPrivateKey,
  getAllBalances,
  COMMON_TOKENS,
} from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";

export interface WalletData {
  id: string;
  name: string;
  address: string;
  chain: string;
  is_primary: boolean;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  logo: string;
  balance: string;
}

const PRIVATE_KEY_STORAGE_KEY = "fun_wallet_pk";

export const useWallet = () => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [activeWallet, setActiveWallet] = useState<WalletData | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch wallets from database
  const fetchWallets = useCallback(async () => {
    if (!user) {
      setWallets([]);
      setActiveWallet(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setWallets(data || []);
      
      // Set primary wallet as active
      const primary = data?.find((w) => w.is_primary) || data?.[0];
      if (primary) {
        setActiveWallet(primary);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch balances for active wallet
  const fetchBalances = useCallback(async () => {
    if (!activeWallet) {
      setBalances([]);
      return;
    }

    setBalanceLoading(true);
    try {
      const tokenBalances = await getAllBalances(activeWallet.address);
      setBalances(tokenBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Set default empty balances
      setBalances(COMMON_TOKENS.map((t) => ({ ...t, balance: "0" })));
    } finally {
      setBalanceLoading(false);
    }
  }, [activeWallet]);

  // Create new wallet
  const createWallet = async (name: string = "Ví chính"): Promise<{ mnemonic: string } | null> => {
    if (!user) return null;

    try {
      const { address, privateKey, mnemonic } = createNewWallet();

      // Save wallet to database
      const { data, error } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          name,
          address,
          chain: "bsc",
          is_primary: wallets.length === 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Store private key in localStorage (encrypted in production)
      const existingKeys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      existingKeys[address] = privateKey;
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(existingKeys));

      toast({
        title: "Ví đã được tạo!",
        description: "Hãy sao lưu seed phrase của bạn ngay bây giờ",
      });

      await fetchWallets();
      return { mnemonic };
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Import wallet from mnemonic
  const importFromMnemonic = async (mnemonic: string, name: string = "Ví import"): Promise<boolean> => {
    if (!user) return false;

    const wallet = importWalletFromMnemonic(mnemonic);
    if (!wallet) {
      toast({
        title: "Lỗi",
        description: "Seed phrase không hợp lệ",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if wallet already exists
      const existing = wallets.find((w) => w.address.toLowerCase() === wallet.address.toLowerCase());
      if (existing) {
        toast({
          title: "Ví đã tồn tại",
          description: "Địa chỉ ví này đã được thêm vào tài khoản của bạn",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase.from("wallets").insert({
        user_id: user.id,
        name,
        address: wallet.address,
        chain: "bsc",
        is_primary: wallets.length === 0,
      });

      if (error) throw error;

      // Store private key
      const existingKeys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      existingKeys[wallet.address] = wallet.privateKey;
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(existingKeys));

      toast({
        title: "Import thành công!",
        description: "Ví của bạn đã được thêm vào tài khoản",
      });

      await fetchWallets();
      return true;
    } catch (error) {
      console.error("Error importing wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể import ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Import from private key
  const importFromPrivateKey = async (privateKey: string, name: string = "Ví import"): Promise<boolean> => {
    if (!user) return false;

    const wallet = importWalletFromPrivateKey(privateKey);
    if (!wallet) {
      toast({
        title: "Lỗi",
        description: "Private key không hợp lệ",
        variant: "destructive",
      });
      return false;
    }

    try {
      const existing = wallets.find((w) => w.address.toLowerCase() === wallet.address.toLowerCase());
      if (existing) {
        toast({
          title: "Ví đã tồn tại",
          description: "Địa chỉ ví này đã được thêm vào tài khoản của bạn",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase.from("wallets").insert({
        user_id: user.id,
        name,
        address: wallet.address,
        chain: "bsc",
        is_primary: wallets.length === 0,
      });

      if (error) throw error;

      const existingKeys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      existingKeys[wallet.address] = privateKey;
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(existingKeys));

      toast({
        title: "Import thành công!",
        description: "Ví của bạn đã được thêm vào tài khoản",
      });

      await fetchWallets();
      return true;
    } catch (error) {
      console.error("Error importing wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể import ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get private key for wallet
  const getPrivateKey = (address: string): string | null => {
    try {
      const keys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      return keys[address] || null;
    } catch {
      return null;
    }
  };

  // Calculate total USD value
  const getTotalBalance = (): number => {
    // Simple calculation - in production use real prices
    const bnbPrice = 600; // Example price
    const bnbBalance = balances.find((b) => b.symbol === "BNB");
    const stableBalance = balances
      .filter((b) => ["USDT", "USDC", "BUSD"].includes(b.symbol))
      .reduce((sum, b) => sum + parseFloat(b.balance), 0);

    return (parseFloat(bnbBalance?.balance || "0") * bnbPrice) + stableBalance;
  };

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    wallets,
    activeWallet,
    setActiveWallet,
    balances,
    loading,
    balanceLoading,
    createWallet,
    importFromMnemonic,
    importFromPrivateKey,
    getPrivateKey,
    getTotalBalance,
    refreshBalances: fetchBalances,
  };
};
