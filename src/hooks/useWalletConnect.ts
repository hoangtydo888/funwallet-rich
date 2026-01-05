import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { toast } from "@/hooks/use-toast";

// WalletConnect Project ID
const PROJECT_ID = "3fcc6bba6f1de962d911bb5b5c3dba68";

// BSC Chain config
const BSC_CHAIN_ID = 56;

export interface WalletConnectState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  provider: EthereumProvider | null;
  error: string | null;
}

export const useWalletConnect = () => {
  const [state, setState] = useState<WalletConnectState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    chainId: null,
    provider: null,
    error: null,
  });

  // Initialize provider
  const initProvider = useCallback(async (): Promise<EthereumProvider | null> => {
    try {
      const provider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: [BSC_CHAIN_ID],
        optionalChains: [1, 137, 42161, 10, 43114, 250, 8453],
        showQrModal: true,
        metadata: {
          name: "FUN Wallet",
          description: "FUN Wallet - Ví Ánh Sáng Hoàng Kim ❤️",
          url: window.location.origin,
          icons: [`${window.location.origin}/logo.png`],
        },
        qrModalOptions: {
          themeMode: "dark",
          themeVariables: {
            "--wcm-accent-color": "#00FF7F",
            "--wcm-background-color": "#1a1a2e",
          },
        },
      });

      return provider;
    } catch (error) {
      console.error("Failed to init WalletConnect provider:", error);
      return null;
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      let provider = state.provider;
      
      if (!provider) {
        provider = await initProvider();
        if (!provider) {
          throw new Error("Không thể khởi tạo WalletConnect");
        }
      }

      // Enable and connect
      await provider.connect();

      const accounts = provider.accounts;
      const chainId = provider.chainId;

      if (accounts.length === 0) {
        throw new Error("Không có tài khoản nào được kết nối");
      }

      const address = accounts[0];

      setState({
        isConnected: true,
        isConnecting: false,
        address,
        chainId,
        provider,
        error: null,
      });

      // Save connection state
      localStorage.setItem("wc_connected", "true");
      localStorage.setItem("wc_address", address);

      toast({
        title: "Kết nối thành công! ❤️",
        description: `Ví ${address.slice(0, 6)}...${address.slice(-4)} đã sẵn sàng`,
      });

      return address;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi kết nối";
      console.error("WalletConnect error:", error);
      
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));

      // Don't show toast for user cancellation
      if (!errorMessage.includes("User rejected") && !errorMessage.includes("cancelled")) {
        toast({
          title: "Lỗi kết nối",
          description: errorMessage,
          variant: "destructive",
        });
      }

      return null;
    }
  }, [state.provider, initProvider]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      if (state.provider) {
        await state.provider.disconnect();
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }

    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      chainId: null,
      provider: null,
      error: null,
    });

    localStorage.removeItem("wc_connected");
    localStorage.removeItem("wc_address");

    toast({
      title: "Đã ngắt kết nối",
      description: "Ví đã được ngắt kết nối an toàn",
    });
  }, [state.provider]);

  // Get ethers signer for transactions
  const getSigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!state.provider || !state.isConnected) {
      console.error("Provider not connected");
      return null;
    }

    try {
      const ethersProvider = new ethers.BrowserProvider(state.provider);
      const signer = await ethersProvider.getSigner();
      return signer;
    } catch (error) {
      console.error("Failed to get signer:", error);
      return null;
    }
  }, [state.provider, state.isConnected]);

  // Send native token (BNB)
  const sendNative = useCallback(
    async (toAddress: string, amount: string): Promise<string | null> => {
      const signer = await getSigner();
      if (!signer) {
        toast({
          title: "Chưa kết nối ví",
          description: "Vui lòng kết nối ví trước khi gửi",
          variant: "destructive",
        });
        return null;
      }

      try {
        const tx = await signer.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount),
        });

        console.log("Transaction sent:", tx.hash);
        return tx.hash;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi giao dịch";
        console.error("Send native error:", error);
        throw new Error(errorMessage);
      }
    },
    [getSigner]
  );

  // Send ERC20 token
  const sendToken = useCallback(
    async (
      tokenAddress: string,
      toAddress: string,
      amount: string,
      decimals: number = 18
    ): Promise<string | null> => {
      const signer = await getSigner();
      if (!signer) {
        toast({
          title: "Chưa kết nối ví",
          description: "Vui lòng kết nối ví trước khi gửi",
          variant: "destructive",
        });
        return null;
      }

      try {
        const erc20Abi = [
          "function transfer(address to, uint256 amount) returns (bool)",
        ];
        const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const amountWei = ethers.parseUnits(amount, decimals);

        const tx = await contract.transfer(toAddress, amountWei);
        console.log("Token transfer sent:", tx.hash);
        return tx.hash;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi giao dịch token";
        console.error("Send token error:", error);
        throw new Error(errorMessage);
      }
    },
    [getSigner]
  );

  // Switch chain
  const switchChain = useCallback(
    async (chainId: number) => {
      if (!state.provider) return false;

      try {
        await state.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        return true;
      } catch (error) {
        console.error("Switch chain error:", error);
        return false;
      }
    },
    [state.provider]
  );

  // Auto-reconnect on mount
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem("wc_connected") === "true";
      
      if (wasConnected) {
        const provider = await initProvider();
        if (provider && provider.session) {
          const accounts = provider.accounts;
          const chainId = provider.chainId;

          if (accounts.length > 0) {
            setState({
              isConnected: true,
              isConnecting: false,
              address: accounts[0],
              chainId,
              provider,
              error: null,
            });
          }
        }
      }
    };

    autoConnect();
  }, [initProvider]);

  // Listen for events
  useEffect(() => {
    if (!state.provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({ ...prev, address: accounts[0] }));
        localStorage.setItem("wc_address", accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setState((prev) => ({ ...prev, chainId }));
    };

    const handleDisconnect = () => {
      disconnect();
    };

    state.provider.on("accountsChanged", handleAccountsChanged);
    state.provider.on("chainChanged", handleChainChanged);
    state.provider.on("disconnect", handleDisconnect);

    return () => {
      state.provider?.removeListener("accountsChanged", handleAccountsChanged);
      state.provider?.removeListener("chainChanged", handleChainChanged);
      state.provider?.removeListener("disconnect", handleDisconnect);
    };
  }, [state.provider, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    getSigner,
    sendNative,
    sendToken,
    switchChain,
  };
};
