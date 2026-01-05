import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { toast } from "@/hooks/use-toast";

// WalletConnect Project ID - Get from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = "3a8170812b534d0ff9d794f19a901d64"; // Demo project ID

// BSC Chain config
const BSC_CHAIN_ID = 56;
const BSC_RPC_URL = "https://bsc-dataseed1.binance.org";

export interface WalletConnectState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  provider: BrowserProvider | null;
}

export interface UseWalletConnectReturn extends WalletConnectState {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner | null>;
  switchToBSC: () => Promise<boolean>;
  signMessage: (message: string) => Promise<string | null>;
}

// Storage key for WalletConnect session
const WC_SESSION_KEY = "wc_session_active";

export const useWalletConnect = (): UseWalletConnectReturn => {
  const [state, setState] = useState<WalletConnectState>({
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    provider: null,
  });

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      // Check if ethereum provider exists (MetaMask, Trust Wallet, etc.)
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: "eth_accounts" 
          }) as string[];
          
          if (accounts && accounts.length > 0) {
            const provider = new BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            
            setState({
              isConnected: true,
              address: accounts[0],
              chainId: Number(network.chainId),
              isConnecting: false,
              provider,
            });
          }
        } catch (error) {
          console.log("No existing wallet connection");
        }
      }
    };

    checkExistingConnection();

    // Listen for account changes
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setState({
            isConnected: false,
            address: null,
            chainId: null,
            isConnecting: false,
            provider: null,
          });
          localStorage.removeItem(WC_SESSION_KEY);
        } else {
          setState(prev => ({
            ...prev,
            address: accounts[0],
            isConnected: true,
          }));
        }
      };

      const handleChainChanged = (chainId: string) => {
        setState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16),
        }));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "Không tìm thấy ví",
        description: "Vui lòng cài đặt MetaMask hoặc Trust Wallet",
        variant: "destructive",
      });
      return null;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      setState({
        isConnected: true,
        address: accounts[0],
        chainId: Number(network.chainId),
        isConnecting: false,
        provider,
      });

      localStorage.setItem(WC_SESSION_KEY, "true");

      toast({
        title: "Kết nối thành công! 🎉",
        description: `Đã kết nối ví ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });

      return accounts[0];
    } catch (error: any) {
      console.error("Connect error:", error);
      setState(prev => ({ ...prev, isConnecting: false }));
      
      if (error.code === 4001) {
        toast({
          title: "Từ chối kết nối",
          description: "Bạn đã từ chối kết nối ví",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi kết nối",
          description: error.message || "Không thể kết nối ví",
          variant: "destructive",
        });
      }
      return null;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      isConnecting: false,
      provider: null,
    });
    localStorage.removeItem(WC_SESSION_KEY);
    
    toast({
      title: "Đã ngắt kết nối",
      description: "Ví đã được ngắt kết nối",
    });
  }, []);

  // Get signer for transactions
  const getSigner = useCallback(async (): Promise<JsonRpcSigner | null> => {
    if (!state.provider) {
      // Try to create provider if ethereum exists
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          return await provider.getSigner();
        } catch (error) {
          console.error("Error getting signer:", error);
          return null;
        }
      }
      return null;
    }

    try {
      return await state.provider.getSigner();
    } catch (error) {
      console.error("Error getting signer:", error);
      return null;
    }
  }, [state.provider]);

  // Switch to BSC network
  const switchToBSC = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
                chainName: "BNB Smart Chain",
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
                rpcUrls: [BSC_RPC_URL],
                blockExplorerUrls: ["https://bscscan.com"],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding BSC chain:", addError);
          return false;
        }
      }
      console.error("Error switching to BSC:", switchError);
      return false;
    }
  }, []);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const signer = await getSigner();
    if (!signer) {
      toast({
        title: "Không có signer",
        description: "Vui lòng kết nối ví trước",
        variant: "destructive",
      });
      return null;
    }

    try {
      return await signer.signMessage(message);
    } catch (error: any) {
      if (error.code === 4001) {
        toast({
          title: "Từ chối ký",
          description: "Bạn đã từ chối ký tin nhắn",
          variant: "destructive",
        });
      }
      return null;
    }
  }, [getSigner]);

  return {
    ...state,
    connect,
    disconnect,
    getSigner,
    switchToBSC,
    signMessage,
  };
};

// Declare ethereum type for window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isTrust?: boolean;
    };
  }
}

export default useWalletConnect;
