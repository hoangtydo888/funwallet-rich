import { ethers } from "ethers";
import { BSC_MAINNET } from "./wallet";

// PancakeSwap Staking/Farming contracts
export const PANCAKE_MASTERCHEF = "0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652"; // MasterChef v3
export const CAKE_ADDRESS = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";

// Staking pool info
export interface StakingPool {
  id: string;
  name: string;
  tokenAddress: string;
  tokenSymbol: string;
  rewardToken: string;
  apy: number;
  tvl: string;
  minStake: string;
  lockPeriod: number; // days
  logo: string;
}

// Available staking pools (simulated for demo)
export const STAKING_POOLS: StakingPool[] = [
  {
    id: "cake-bnb",
    name: "CAKE-BNB LP",
    tokenAddress: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
    tokenSymbol: "CAKE-BNB LP",
    rewardToken: "CAKE",
    apy: 24.5,
    tvl: "$156.2M",
    minStake: "0.01",
    lockPeriod: 0,
    logo: "🥞"
  },
  {
    id: "cake-pool",
    name: "CAKE Syrup Pool",
    tokenAddress: CAKE_ADDRESS,
    tokenSymbol: "CAKE",
    rewardToken: "CAKE",
    apy: 12.8,
    tvl: "$89.4M",
    minStake: "0.1",
    lockPeriod: 0,
    logo: "🎂"
  },
  {
    id: "bnb-usdt",
    name: "BNB-USDT LP",
    tokenAddress: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
    tokenSymbol: "BNB-USDT LP",
    rewardToken: "CAKE",
    apy: 18.3,
    tvl: "$234.7M",
    minStake: "0.01",
    lockPeriod: 0,
    logo: "💰"
  },
  {
    id: "eth-bnb",
    name: "ETH-BNB LP",
    tokenAddress: "0x74E4716E431f45807DCF19f284c7aa99F18a4fbc",
    tokenSymbol: "ETH-BNB LP",
    rewardToken: "CAKE",
    apy: 15.2,
    tvl: "$78.9M",
    minStake: "0.001",
    lockPeriod: 0,
    logo: "⟠"
  },
  {
    id: "cake-locked",
    name: "CAKE Locked Staking",
    tokenAddress: CAKE_ADDRESS,
    tokenSymbol: "CAKE",
    rewardToken: "CAKE",
    apy: 45.6,
    tvl: "$412.3M",
    minStake: "1",
    lockPeriod: 365,
    logo: "🔒"
  }
];

// User stake info
export interface UserStake {
  poolId: string;
  amount: string;
  rewards: string;
  stakedAt: number;
  unlockTime?: number;
}

// Simple ERC20 ABI for staking
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Get provider
const getProvider = () => {
  return new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrl);
};

// Get token balance
export const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string
): Promise<string> => {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error getting token balance:", error);
    return "0";
  }
};

// Simulate staking (demo - actual implementation would use MasterChef contract)
export const stakeTokens = async (
  privateKey: string,
  poolId: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const pool = STAKING_POOLS.find(p => p.id === poolId);
    if (!pool) {
      return { success: false, error: "Pool not found" };
    }

    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Check token balance
    const tokenContract = new ethers.Contract(pool.tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();
    const balance = await tokenContract.balanceOf(wallet.address);
    const amountWei = ethers.parseUnits(amount, decimals);
    
    if (balance < amountWei) {
      return { success: false, error: "Insufficient token balance" };
    }

    // In a real implementation, this would:
    // 1. Approve MasterChef to spend tokens
    // 2. Call deposit() on MasterChef
    // For demo, we simulate a successful stake
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock tx hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return { success: true, txHash: mockTxHash };
  } catch (error: any) {
    console.error("Staking error:", error);
    return { success: false, error: error.message || "Failed to stake" };
  }
};

// Simulate unstaking
export const unstakeTokens = async (
  privateKey: string,
  poolId: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const pool = STAKING_POOLS.find(p => p.id === poolId);
    if (!pool) {
      return { success: false, error: "Pool not found" };
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock tx hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return { success: true, txHash: mockTxHash };
  } catch (error: any) {
    console.error("Unstaking error:", error);
    return { success: false, error: error.message || "Failed to unstake" };
  }
};

// Claim rewards
export const claimRewards = async (
  privateKey: string,
  poolId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock tx hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return { success: true, txHash: mockTxHash };
  } catch (error: any) {
    console.error("Claim rewards error:", error);
    return { success: false, error: error.message || "Failed to claim rewards" };
  }
};

// Calculate estimated rewards
export const calculateRewards = (
  amount: number,
  apy: number,
  daysStaked: number
): number => {
  const dailyRate = apy / 100 / 365;
  return amount * dailyRate * daysStaked;
};
