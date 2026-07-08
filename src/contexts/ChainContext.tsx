import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Chain, SUPPORTED_CHAINS, getChainById } from "@/lib/chains";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChainContextType {
  currentChain: Chain;
  setCurrentChain: (chain: Chain) => void;
  availableChains: Chain[];
  builtInChains: Chain[];
  customChains: Chain[];
  switchChain: (chainId: number) => void;
  addCustomChain: (chain: Omit<Chain, "isCustom">) => Promise<{ success: boolean; error?: string }>;
  removeCustomChain: (chainId: number) => Promise<void>;
  refreshCustomChains: () => Promise<void>;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

const CHAIN_STORAGE_KEY = "fun_wallet_chain";
const CUSTOM_CHAINS_LOCAL = "fun_wallet_custom_chains";

const loadLocalCustom = (): Chain[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_CHAINS_LOCAL);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const ChainProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [customChains, setCustomChains] = useState<Chain[]>(loadLocalCustom);
  const [currentChain, setCurrentChainState] = useState<Chain>(() => {
    try {
      const stored = localStorage.getItem(CHAIN_STORAGE_KEY);
      if (stored) {
        const chainId = parseInt(stored);
        const chain = getChainById(chainId);
        if (chain) return chain;
      }
    } catch {
      /* ignore */
    }
    return SUPPORTED_CHAINS[0];
  });

  const availableChains = [...SUPPORTED_CHAINS, ...customChains];

  const setCurrentChain = (chain: Chain) => {
    setCurrentChainState(chain);
    localStorage.setItem(CHAIN_STORAGE_KEY, chain.chainId.toString());
  };

  const switchChain = (chainId: number) => {
    const chain = availableChains.find((c) => c.chainId === chainId);
    if (chain) setCurrentChain(chain);
  };

  const refreshCustomChains = useCallback(async () => {
    if (!user) {
      setCustomChains(loadLocalCustom());
      return;
    }
    try {
      const { data, error } = await supabase
        .from("custom_networks")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const chains: Chain[] = (data || []).map((r) => ({
        chainId: r.chain_id,
        name: r.name,
        shortName: r.short_name,
        rpcUrl: r.rpc_url,
        symbol: r.symbol,
        explorer: r.explorer || "",
        logo: r.logo_url || "/tokens/default.svg",
        color: r.color || "#00CED1",
        isTestnet: r.is_testnet,
        isCustom: true,
      }));
      setCustomChains(chains);
      localStorage.setItem(CUSTOM_CHAINS_LOCAL, JSON.stringify(chains));
    } catch (e) {
      console.error("Failed to load custom chains", e);
    }
  }, [user]);

  useEffect(() => {
    refreshCustomChains();
  }, [refreshCustomChains]);

  const addCustomChain = async (chain: Omit<Chain, "isCustom">) => {
    // Check duplicate
    if (availableChains.some((c) => c.chainId === chain.chainId)) {
      return { success: false, error: "Chain ID này đã tồn tại" };
    }
    if (!user) {
      const next = [...customChains, { ...chain, isCustom: true }];
      setCustomChains(next);
      localStorage.setItem(CUSTOM_CHAINS_LOCAL, JSON.stringify(next));
      return { success: true };
    }
    const { error } = await supabase.from("custom_networks").insert({
      user_id: user.id,
      chain_id: chain.chainId,
      name: chain.name,
      short_name: chain.shortName,
      rpc_url: chain.rpcUrl,
      symbol: chain.symbol,
      explorer: chain.explorer,
      logo_url: chain.logo,
      color: chain.color,
      is_testnet: chain.isTestnet,
    });
    if (error) return { success: false, error: error.message };
    await refreshCustomChains();
    return { success: true };
  };

  const removeCustomChain = async (chainId: number) => {
    if (user) {
      await supabase.from("custom_networks").delete().eq("chain_id", chainId);
    }
    const next = customChains.filter((c) => c.chainId !== chainId);
    setCustomChains(next);
    localStorage.setItem(CUSTOM_CHAINS_LOCAL, JSON.stringify(next));
    // If removed current, fallback to default
    if (currentChain.chainId === chainId) setCurrentChain(SUPPORTED_CHAINS[0]);
  };

  return (
    <ChainContext.Provider
      value={{
        currentChain,
        setCurrentChain,
        availableChains,
        builtInChains: SUPPORTED_CHAINS,
        customChains,
        switchChain,
        addCustomChain,
        removeCustomChain,
        refreshCustomChains,
      }}
    >
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) throw new Error("useChain must be used within a ChainProvider");
  return context;
};
