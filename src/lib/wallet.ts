import { ethers } from "ethers";

// BNB Chain Mainnet
export const BSC_MAINNET = {
  chainId: 56,
  name: "BNB Smart Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  symbol: "BNB",
  explorer: "https://bscscan.com",
};

// 19 Common BEP-20 tokens on BSC with logo paths
export const COMMON_TOKENS = [
  // 4 Token chính theo thứ tự ưu tiên - CAMLY có decimals = 3!
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 3, logo: "/tokens/camly.png" },
  { symbol: "BTCB", name: "Bitcoin BEP-20", address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, logo: "/tokens/btc.svg" },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, logo: "/tokens/usdt.svg" },
  { symbol: "BNB", name: "BNB", address: null, decimals: 18, logo: "/tokens/bnb.png" },
  
  // Stablecoins khác
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, logo: "/tokens/usdc.svg" },
  
  // Major Coins
  { symbol: "ETH", name: "Ethereum BEP-20", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18, logo: "/tokens/eth.svg" },
  
  // DeFi & Exchange Tokens
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, logo: "/tokens/cake.svg" },
  { symbol: "LINK", name: "Chainlink", address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", decimals: 18, logo: "/tokens/link.svg" },
  { symbol: "UNI", name: "Uniswap", address: "0xBf5140A22578168FD562DcEaAB237dA49E0c34C7", decimals: 18, logo: "/tokens/uni.svg" },
  
  // Meme Coins
  { symbol: "SHIB", name: "Shiba Inu", address: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d", decimals: 18, logo: "/tokens/shib.svg" },
  { symbol: "DOGE", name: "Dogecoin BEP-20", address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43", decimals: 8, logo: "/tokens/doge.svg" },
  { symbol: "BABYDOGE", name: "Baby Doge", address: "0xc748673057861a797275CD8A068AbB95A902e8de", decimals: 9, logo: "/tokens/babydoge.svg" },
  
  // L1/L2 Wrapped Tokens
  { symbol: "ADA", name: "Cardano BEP-20", address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", decimals: 18, logo: "/tokens/ada.svg" },
  { symbol: "MATIC", name: "Polygon BEP-20", address: "0xCC42724C6683B7E57334c4E856f4C9965ED682bD", decimals: 18, logo: "/tokens/matic.svg" },
  { symbol: "AVAX", name: "Avalanche BEP-20", address: "0x1CE0c2827e2eF14D5C4f29a091d735A204794041", decimals: 18, logo: "/tokens/avax.svg" },
  { symbol: "SOL", name: "Solana BEP-20", address: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", decimals: 18, logo: "/tokens/sol.svg" },
  { symbol: "XRP", name: "Ripple BEP-20", address: "0x1D2F0dA169ceB9fC7B3144628dB156f3F6c60dBE", decimals: 18, logo: "/tokens/xrp.svg" },
  
  // Other Tokens
  { symbol: "MANA", name: "Decentraland", address: "0x26433c8127d9b4e9B71Eaa15111DF99Ea2EeB2f8", decimals: 18, logo: "/tokens/mana.svg" },
  { symbol: "BTT", name: "BitTorrent", address: "0x352Cb5E19b12FC216548a2677bD0fce83BaE434B", decimals: 18, logo: "/tokens/btt.svg" },
];

// ERC-20 ABI for balance, transfer, and swap
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
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

// Get token decimals from blockchain (safer than hardcoded)
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

// Send BEP-20 token - now auto-fetches decimals from blockchain for safety
// Includes precision handling to avoid "transfer amount exceeds balance" errors
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
    
    // Lấy decimals thực tế từ blockchain để đảm bảo chính xác 100%
    const actualDecimals = await contract.decimals();
    const useDecimals = Number(actualDecimals);
    
    // Lấy balance thực tế để so sánh và xử lý precision
    const realBalance = await contract.balanceOf(wallet.address);
    
    // Parse amount với precision chuẩn
    let parsedAmount = ethers.parseUnits(amount, useDecimals);
    
    console.log(`[SEND TOKEN] Amount: ${amount}, Parsed: ${parsedAmount.toString()}, Balance: ${realBalance.toString()}, Decimals: ${useDecimals}`);
    
    // Nếu amount gần bằng balance (99.99%+), sử dụng toàn bộ balance để tránh dust
    const threshold = realBalance * 9999n / 10000n; // 99.99%
    if (parsedAmount >= threshold && parsedAmount <= realBalance) {
      console.log(`[SEND TOKEN] Amount gần max, sử dụng toàn bộ balance: ${realBalance.toString()}`);
      parsedAmount = realBalance;
    }
    
    // Double-check không vượt quá balance
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
