import { ethers } from "ethers";
import { Chain, Token, TokenBalance, Result } from '../types';
import { BSC_MAINNET, COMMON_TOKENS } from '../constants/tokens';
import { SUPPORTED_CHAINS, getChainById } from '../constants/chains';

/**
 * ERC-20 ABI for token operations
 */
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

/**
 * Create provider for default chain (BSC)
 */
export const getProvider = (): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrl);
};

/**
 * Create provider for a specific chain
 */
export const getProviderForChain = (chain: Chain): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(chain.rpcUrl);
};

/**
 * Generate new wallet with mnemonic
 */
export const createNewWallet = (): { address: string; privateKey: string; mnemonic: string } => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
  };
};

/**
 * Import wallet from mnemonic phrase
 */
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

/**
 * Import wallet from private key
 */
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

/**
 * Get native token balance (BNB, ETH, etc.)
 */
export const getNativeBalance = async (address: string, chain?: Chain): Promise<string> => {
  try {
    const provider = chain ? getProviderForChain(chain) : getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch {
    return "0";
  }
};

/**
 * Legacy function for BNB balance
 */
export const getBNBBalance = async (address: string): Promise<string> => {
  return getNativeBalance(address);
};

/**
 * Get ERC-20 token balance
 */
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

/**
 * Get token decimals from blockchain
 */
export const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    return Number(decimals);
  } catch {
    return 18; // fallback
  }
};

/**
 * Get all token balances for common tokens
 */
export const getAllBalances = async (walletAddress: string): Promise<TokenBalance[]> => {
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

/**
 * Send native token (BNB, ETH, etc.)
 */
export const sendNativeToken = async (
  privateKey: string,
  toAddress: string,
  amount: string,
  chain?: Chain
): Promise<Result<{ hash: string }, string>> => {
  try {
    const provider = chain ? getProviderForChain(chain) : getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount),
    });
    
    return { success: true, data: { hash: tx.hash } };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    return { success: false, error: errorMessage };
  }
};

/**
 * Legacy function for sending BNB
 */
export const sendBNB = async (
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<{ hash: string } | { error: string }> => {
  const result = await sendNativeToken(privateKey, toAddress, amount);
  if (result.success) {
    return { hash: result.data.hash };
  }
  return { error: (result as { success: false; error: string }).error };
};

/**
 * Send ERC-20 token with precision handling
 */
export const sendToken = async (
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals?: number
): Promise<{ hash: string } | { error: string }> => {
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get actual decimals from blockchain for precision
    const actualDecimals = await contract.decimals();
    const useDecimals = Number(actualDecimals);
    
    // Get real balance for comparison
    const realBalance = await contract.balanceOf(wallet.address);
    
    // Parse amount with correct precision
    let parsedAmount = ethers.parseUnits(amount, useDecimals);
    
    console.log(`[SEND TOKEN] Amount: ${amount}, Parsed: ${parsedAmount.toString()}, Balance: ${realBalance.toString()}, Decimals: ${useDecimals}`);
    
    // If amount is near max (99.99%+), use full balance to avoid dust
    const threshold = realBalance * 9999n / 10000n;
    if (parsedAmount >= threshold && parsedAmount <= realBalance) {
      console.log(`[SEND TOKEN] Amount near max, using full balance: ${realBalance.toString()}`);
      parsedAmount = realBalance;
    }
    
    // Check sufficient balance
    if (parsedAmount > realBalance) {
      const formattedBalance = ethers.formatUnits(realBalance, useDecimals);
      return { error: `Số dư không đủ. Balance thực tế: ${formattedBalance}` };
    }
    
    const tx = await contract.transfer(toAddress, parsedAmount);
    
    return { hash: tx.hash };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    console.error("[SEND TOKEN ERROR]", errorMessage);
    return { error: errorMessage };
  }
};

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Format address for display (0x1234...5678)
 */
export const formatAddress = (address: string, chars: number = 6): string => {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
};

/**
 * Format balance with precision
 */
export const formatBalance = (balance: string, decimals: number = 4): string => {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(decimals);
};

/**
 * Get wallet from private key
 */
export const getWalletFromPrivateKey = (privateKey: string, chain?: Chain): ethers.Wallet => {
  const provider = chain ? getProviderForChain(chain) : getProvider();
  return new ethers.Wallet(privateKey, provider);
};
