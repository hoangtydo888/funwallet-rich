import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  createNewWallet,
  importWalletFromMnemonic,
  importWalletFromPrivateKey,
  getAllBalances,
  getTokenBalance,
  COMMON_TOKENS,
  formatAddress,
} from "@/lib/wallet";
import { toast } from "@/hooks/use-toast";
import { loadCustomTokens, type CustomToken } from "@/components/wallet/ImportTokenDialog";
import { type TokenPrice } from "@/lib/priceTracker";

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
      // Get balances for common tokens
      const tokenBalances = await getAllBalances(activeWallet.address);
      
      // Get balances for custom tokens
      const customTokens = loadCustomTokens();
      const customBalances = await Promise.all(
        customTokens.map(async (token: CustomToken) => {
          const balance = await getTokenBalance(token.address, activeWallet.address);
          return {
            ...token,
            balance,
          };
        })
      );

      // Combine and set balances
      setBalances([...tokenBalances, ...customBalances]);
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Set default empty balances
      setBalances(COMMON_TOKENS.map((t) => ({ ...t, balance: "0" })));
    } finally {
      setBalanceLoading(false);
    }
  }, [activeWallet]);

  // Create new wallet
  const createWallet = async (name: string = "Ví chính"): Promise<{ mnemonic: string; address: string; privateKey: string } | null> => {
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

      // Store private key in localStorage (legacy - will be encrypted by caller)
      const existingKeys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      existingKeys[address] = privateKey;
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(existingKeys));

      toast({
        title: "Ví đã được tạo!",
        description: "Hãy sao lưu seed phrase của bạn ngay bây giờ",
      });

      await fetchWallets();
      return { mnemonic, address, privateKey };
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
  const importFromMnemonic = async (mnemonic: string, name: string = "Ví import"): Promise<{ address: string; privateKey: string } | null> => {
    if (!user) return null;

    const wallet = importWalletFromMnemonic(mnemonic);
    if (!wallet) {
      toast({
        title: "Lỗi",
        description: "Seed phrase không hợp lệ",
        variant: "destructive",
      });
      return null;
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
        return null;
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
      return { address: wallet.address, privateKey: wallet.privateKey };
    } catch (error) {
      console.error("Error importing wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể import ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Import from private key
  const importFromPrivateKey = async (privateKey: string, name: string = "Ví import"): Promise<{ address: string } | null> => {
    if (!user) return null;

    const wallet = importWalletFromPrivateKey(privateKey);
    if (!wallet) {
      toast({
        title: "Lỗi",
        description: "Private key không hợp lệ",
        variant: "destructive",
      });
      return null;
    }

    try {
      const existing = wallets.find((w) => w.address.toLowerCase() === wallet.address.toLowerCase());
      if (existing) {
        toast({
          title: "Ví đã tồn tại",
          description: "Địa chỉ ví này đã được thêm vào tài khoản của bạn",
          variant: "destructive",
        });
        return null;
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
      return { address: wallet.address };
    } catch (error) {
      console.error("Error importing wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể import ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Get private key for wallet (case-insensitive address matching)
  const getPrivateKey = (address: string): string | null => {
    try {
      const keys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
      // So sánh không phân biệt hoa/thường vì Ethereum address có checksum
      const normalizedAddress = address.toLowerCase();
      for (const storedAddress of Object.keys(keys)) {
        if (storedAddress.toLowerCase() === normalizedAddress) {
          return keys[storedAddress];
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Delete wallet
  const deleteWallet = async (walletId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const wallet = wallets.find((w) => w.id === walletId);
      
      const { error } = await supabase
        .from("wallets")
        .delete()
        .eq("id", walletId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove private key from localStorage
      if (wallet) {
        const keys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
        delete keys[wallet.address];
        localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(keys));
      }

      await fetchWallets();
      return true;
    } catch (error) {
      console.error("Error deleting wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Set primary wallet
  const setPrimaryWallet = async (walletId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Remove primary from all wallets
      await supabase
        .from("wallets")
        .update({ is_primary: false })
        .eq("user_id", user.id);

      // Set new primary
      const { error } = await supabase
        .from("wallets")
        .update({ is_primary: true })
        .eq("id", walletId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchWallets();
      return true;
    } catch (error) {
      console.error("Error setting primary wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể đặt ví chính. Vui lòng thử lại.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Rename wallet
  const renameWallet = async (walletId: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("wallets")
        .update({ name: newName })
        .eq("id", walletId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchWallets();
      return true;
    } catch (error) {
      console.error("Error renaming wallet:", error);
      toast({
        title: "Lỗi",
        description: "Không thể đổi tên ví. Vui lòng thử lại.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Link private key to existing wallet (for cross-device sync)
  const linkPrivateKey = async (walletAddress: string, privateKey: string): Promise<boolean> => {
    const wallet = importWalletFromPrivateKey(privateKey);
    if (!wallet) {
      toast({
        title: "❌ Private Key không hợp lệ",
        description: "Vui lòng kiểm tra lại private key",
        variant: "destructive",
      });
      return false;
    }

    // Verify address matches
    if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
      toast({
        title: "❌ Địa chỉ không khớp",
        description: `Private key này thuộc về ví ${formatAddress(wallet.address)}, không phải ${formatAddress(walletAddress)}`,
        variant: "destructive",
      });
      return false;
    }

    // Save private key to localStorage
    const existingKeys = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || "{}");
    existingKeys[wallet.address] = privateKey;
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(existingKeys));

    toast({
      title: "✅ Import thành công!",
      description: "Private key đã được lưu trên thiết bị này. Giờ bạn có thể chuyển tiền.",
    });

    return true;
  };

  // Calculate total USD value using realtime prices
  const getTotalBalance = (prices?: TokenPrice[]): number => {
    if (!prices || prices.length === 0) {
      // Fallback: only count stablecoins at $1.00
      return balances
        .filter((b) => ["USDT", "USDC", "BUSD", "DAI"].includes(b.symbol.toUpperCase()))
        .reduce((sum, b) => sum + parseFloat(b.balance), 0);
    }

    // Calculate with realtime prices for ALL tokens
    return balances.reduce((sum, token) => {
      const price = prices.find(
        (p) => p.symbol.toUpperCase() === token.symbol.toUpperCase()
      );
      const balance = parseFloat(token.balance) || 0;
      const priceValue = price?.price ?? 0;
      return sum + balance * priceValue;
    }, 0);
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
    linkPrivateKey,
    deleteWallet,
    setPrimaryWallet,
    renameWallet,
    getTotalBalance,
    refreshBalances: fetchBalances,
  };
};
