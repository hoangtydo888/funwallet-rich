// WalletConnect v2 Hook for FUN Wallet
// Supports MetaMask, Trust Wallet, and other WalletConnect-compatible wallets

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";

// WalletConnect Project ID - Register at https://cloud.walletconnect.com
const PROJECT_ID = "c5a3c3e9c3c9c5a3c3e9c3c9c5a3c3e9"; // Demo ID - replace with your own

// BSC Chain config
const BSC_CHAIN = {
  chainId: 56,
  name: "BNB Smart Chain",
  currency: "BNB",
  explorerUrl: "https://bscscan.com",
  rpcUrl: "https://bsc-dataseed.binance.org/",
};

export interface WalletConnectState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  walletName: string | null;
}

export interface UseWalletConnectReturn {
  state: WalletConnectState;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  getSigner: () => Promise<ethers.Signer | null>;
  getProvider: () => ethers.BrowserProvider | null;
  signMessage: (message: string) => Promise<string | null>;
  sendTransaction: (tx: ethers.TransactionRequest) => Promise<ethers.TransactionResponse | null>;
}

// Check if WalletConnect packages are available
let EthereumProvider: any = null;
let WalletConnectModal: any = null;

const loadWalletConnect = async () => {
  try {
    const [providerModule, modalModule] = await Promise.all([
      import("@walletconnect/ethereum-provider"),
      import("@walletconnect/modal"),
    ]);
    EthereumProvider = providerModule.EthereumProvider;
    WalletConnectModal = modalModule.WalletConnectModal;
    return true;
  } catch (error) {
    console.warn("WalletConnect packages not available:", error);
    return false;
  }
};

export const useWalletConnect = (): UseWalletConnectReturn => {
  const [state, setState] = useState<WalletConnectState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    chainId: null,
    walletName: null,
  });

  const providerRef = useRef<any>(null);
  const modalRef = useRef<any>(null);
  const ethersProviderRef = useRef<ethers.BrowserProvider | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize WalletConnect on mount
  useEffect(() => {
    const init = async () => {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      const loaded = await loadWalletConnect();
      if (!loaded) return;

      try {
        // Create modal
        modalRef.current = new WalletConnectModal({
          projectId: PROJECT_ID,
          chains: [BSC_CHAIN.chainId],
          themeMode: "light",
          themeVariables: {
            "--wcm-accent-color": "#00FF7F",
            "--wcm-background-color": "#FAFAFA",
          },
        });

        // Create provider
        providerRef.current = await EthereumProvider.init({
          projectId: PROJECT_ID,
          chains: [BSC_CHAIN.chainId],
          showQrModal: false,
          metadata: {
            name: "FUN Wallet",
            description: "FUN Wallet - Chia sẻ phước lành",
            url: window.location.origin,
            icons: [`${window.location.origin}/logo.png`],
          },
        });

        // Check for existing session
        if (providerRef.current.connected) {
          const accounts = providerRef.current.accounts;
          if (accounts && accounts.length > 0) {
            ethersProviderRef.current = new ethers.BrowserProvider(providerRef.current);
            setState({
              isConnected: true,
              isConnecting: false,
              address: accounts[0],
              chainId: providerRef.current.chainId,
              walletName: providerRef.current.session?.peer?.metadata?.name || "External Wallet",
            });
          }
        }

        // Listen for events
        providerRef.current.on("accountsChanged", (accounts: string[]) => {
          if (accounts.length === 0) {
            setState((prev) => ({ ...prev, isConnected: false, address: null }));
          } else {
            setState((prev) => ({ ...prev, address: accounts[0] }));
          }
        });

        providerRef.current.on("chainChanged", (chainId: number) => {
          setState((prev) => ({ ...prev, chainId }));
        });

        providerRef.current.on("disconnect", () => {
          ethersProviderRef.current = null;
          setState({
            isConnected: false,
            isConnecting: false,
            address: null,
            chainId: null,
            walletName: null,
          });
        });
      } catch (error) {
        console.error("Failed to initialize WalletConnect:", error);
      }
    };

    init();

    return () => {
      // Cleanup listeners on unmount
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!providerRef.current || !modalRef.current) {
      // Fallback: Try to connect via window.ethereum (MetaMask injected)
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          setState((prev) => ({ ...prev, isConnecting: true }));
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          
          if (accounts && accounts.length > 0) {
            ethersProviderRef.current = provider;
            const network = await provider.getNetwork();
            
            setState({
              isConnected: true,
              isConnecting: false,
              address: accounts[0],
              chainId: Number(network.chainId),
              walletName: "MetaMask",
            });
            
            toast({
              title: "Kết nối thành công! ❤️",
              description: `Ví: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
            });
            
            return accounts[0];
          }
        } catch (error: any) {
          console.error("MetaMask connection failed:", error);
          setState((prev) => ({ ...prev, isConnecting: false }));
          toast({
            title: "Kết nối thất bại",
            description: error.message || "Không thể kết nối với MetaMask",
            variant: "destructive",
          });
        }
        return null;
      }

      toast({
        title: "Chưa sẵn sàng",
        description: "Vui lòng cài đặt MetaMask hoặc Trust Wallet",
        variant: "destructive",
      });
      return null;
    }

    try {
      setState((prev) => ({ ...prev, isConnecting: true }));

      // Generate URI and show modal
      const displayUri = (uri: string) => {
        modalRef.current.openModal({ uri });
      };

      providerRef.current.on("display_uri", displayUri);

      // Connect
      await providerRef.current.connect();
      modalRef.current.closeModal();

      // Get accounts
      const accounts = providerRef.current.accounts;
      if (accounts && accounts.length > 0) {
        ethersProviderRef.current = new ethers.BrowserProvider(providerRef.current);
        
        setState({
          isConnected: true,
          isConnecting: false,
          address: accounts[0],
          chainId: providerRef.current.chainId,
          walletName: providerRef.current.session?.peer?.metadata?.name || "External Wallet",
        });

        toast({
          title: "Kết nối thành công! ❤️",
          description: `Ví: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });

        return accounts[0];
      }

      return null;
    } catch (error: any) {
      console.error("WalletConnect connection failed:", error);
      setState((prev) => ({ ...prev, isConnecting: false }));
      
      if (error.message !== "User rejected") {
        toast({
          title: "Kết nối thất bại",
          description: error.message || "Không thể kết nối ví",
          variant: "destructive",
        });
      }
      
      return null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (providerRef.current?.connected) {
        await providerRef.current.disconnect();
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }

    ethersProviderRef.current = null;
    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      chainId: null,
      walletName: null,
    });

    toast({
      title: "Đã ngắt kết nối",
      description: "Ví đã được ngắt kết nối an toàn",
    });
  }, []);

  const getSigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!ethersProviderRef.current) {
      return null;
    }

    try {
      return await ethersProviderRef.current.getSigner();
    } catch (error) {
      console.error("Failed to get signer:", error);
      return null;
    }
  }, []);

  const getProvider = useCallback((): ethers.BrowserProvider | null => {
    return ethersProviderRef.current;
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const signer = await getSigner();
    if (!signer) {
      toast({
        title: "Lỗi",
        description: "Vui lòng kết nối ví trước",
        variant: "destructive",
      });
      return null;
    }

    try {
      return await signer.signMessage(message);
    } catch (error: any) {
      console.error("Sign message failed:", error);
      toast({
        title: "Ký thất bại",
        description: error.message || "Không thể ký message",
        variant: "destructive",
      });
      return null;
    }
  }, [getSigner]);

  const sendTransaction = useCallback(
    async (tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse | null> => {
      const signer = await getSigner();
      if (!signer) {
        toast({
          title: "Lỗi",
          description: "Vui lòng kết nối ví trước",
          variant: "destructive",
        });
        return null;
      }

      try {
        return await signer.sendTransaction(tx);
      } catch (error: any) {
        console.error("Send transaction failed:", error);
        toast({
          title: "Giao dịch thất bại",
          description: error.message || "Không thể gửi giao dịch",
          variant: "destructive",
        });
        return null;
      }
    },
    [getSigner]
  );

  return {
    state,
    connect,
    disconnect,
    getSigner,
    getProvider,
    signMessage,
    sendTransaction,
  };
};
