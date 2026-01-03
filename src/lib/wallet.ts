import { ethers } from "ethers";

// BNB Chain Mainnet
export const BSC_MAINNET = {
  chainId: 56,
  name: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  symbol: "BNB",
  explorer: "https://bscscan.com",
};

// Common BEP-20 tokens on BSC
export const COMMON_TOKENS = [
  { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "🔶" },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "💵" },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "💲" },
  { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18, logo: "🟡" },
];

// ERC-20 ABI for balance and transfer
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Create provider for BSC
export const getProvider = () => {
  return new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrl);
};

// Generate new wallet
export const createNewWallet = (): { address: string; privateKey: string; mnemonic: string } => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
  };
};

// Import wallet from mnemonic
export const importWalletFromMnemonic = (mnemonic: string): { address: string; privateKey: string } | null => {
  try {
    const wallet = ethers.Wallet.fromPhrase(mnemonic.trim());
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch {
    return null;
  }
};

// Import wallet from private key
export const importWalletFromPrivateKey = (privateKey: string): { address: string } | null => {
  try {
    const wallet = new ethers.Wallet(privateKey.trim());
    return {
      address: wallet.address,
    };
  } catch {
    return null;
  }
};

// Get BNB balance
export const getBNBBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return "0";
  }
};

// Get token balance
export const getTokenBalance = async (tokenAddress: string, walletAddress: string): Promise<string> => {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch {
    return "0";
  }
};

// Get all balances for common tokens
export const getAllBalances = async (walletAddress: string) => {
  const balances = await Promise.all(
    COMMON_TOKENS.map(async (token) => {
      let balance = "0";
      if (token.address === null) {
        balance = await getBNBBalance(walletAddress);
      } else {
        balance = await getTokenBalance(token.address, walletAddress);
      }
      return {
        ...token,
        balance,
      };
    })
  );
  return balances;
};

// Send BNB
export const sendBNB = async (
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<{ hash: string } | { error: string }> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });
    
    return { hash: tx.hash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    return { error: errorMessage };
  }
};

// Send BEP-20 token
export const sendToken = async (
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number = 18
): Promise<{ hash: string } | { error: string }> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    const tx = await contract.transfer(toAddress, ethers.parseUnits(amount, decimals));
    
    return { hash: tx.hash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    return { error: errorMessage };
  }
};

// Validate address
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// Format address for display
export const formatAddress = (address: string, chars: number = 6): string => {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
};

// Format balance
export const formatBalance = (balance: string, decimals: number = 4): string => {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(decimals);
};
