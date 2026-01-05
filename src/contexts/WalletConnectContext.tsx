import { createContext, useContext, ReactNode } from "react";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { ethers } from "ethers";

interface WalletConnectContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  getSigner: () => Promise<ethers.Signer | null>;
  sendNative: (toAddress: string, amount: string) => Promise<string | null>;
  sendToken: (
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals?: number
  ) => Promise<string | null>;
  switchChain: (chainId: number) => Promise<boolean>;
}

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined);

export const WalletConnectProvider = ({ children }: { children: ReactNode }) => {
  const walletConnect = useWalletConnect();

  return (
    <WalletConnectContext.Provider value={walletConnect}>
      {children}
    </WalletConnectContext.Provider>
  );
};

export const useWalletConnectContext = () => {
  const context = useContext(WalletConnectContext);
  if (!context) {
    throw new Error("useWalletConnectContext must be used within WalletConnectProvider");
  }
  return context;
};
