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
export const STAKING_ENABLED = false;
export const STAKING_POOLS: StakingPool[] = [];

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

// No verified staking contracts are configured. Never fabricate tx hashes.
const unavailable: {success:boolean;txHash?:string;error?:string} = {success:false,error:"Staking chưa khả dụng: chưa có hợp đồng được thẩm định và cấu hình."};
export const stakeTokens = async (_key:string,_pool:string,_amount:string) => unavailable;
export const unstakeTokens = async (_key:string,_pool:string,_amount:string) => unavailable;
export const claimRewards = async (_key:string,_pool:string) => unavailable;

// Calculate estimated rewards
export const calculateRewards = (
  amount: number,
  apy: number,
  daysStaked: number
): number => {
  const dailyRate = apy / 100 / 365;
  return amount * dailyRate * daysStaked;
};
