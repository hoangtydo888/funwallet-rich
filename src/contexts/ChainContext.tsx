import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Chain, SUPPORTED_CHAINS, getChainById } from "@/lib/chains";

interface ChainContextType {
  currentChain: Chain;
  setCurrentChain: (chain: Chain) => void;
  availableChains: Chain[];
  switchChain: (chainId: number) => void;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

const CHAIN_STORAGE_KEY = "fun_wallet_chain";

export const ChainProvider = ({ children }: { children: ReactNode }) => {
  const [currentChain, setCurrentChainState] = useState<Chain>(() => {
    // Load from localStorage or default to BSC
    try {
      const stored = localStorage.getItem(CHAIN_STORAGE_KEY);
      if (stored) {
        const chainId = parseInt(stored);
        const chain = getChainById(chainId);
        if (chain) return chain;
      }
    } catch {
      // Ignore errors
    }
    return SUPPORTED_CHAINS[0]; // Default to BSC
  });

  const setCurrentChain = (chain: Chain) => {
    setCurrentChainState(chain);
    localStorage.setItem(CHAIN_STORAGE_KEY, chain.chainId.toString());
  };

  const switchChain = (chainId: number) => {
    const chain = getChainById(chainId);
    if (chain) {
      setCurrentChain(chain);
    }
  };

  return (
    <ChainContext.Provider
      value={{
        currentChain,
        setCurrentChain,
        availableChains: SUPPORTED_CHAINS,
        switchChain,
      }}
    >
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("useChain must be used within a ChainProvider");
  }
  return context;
};
