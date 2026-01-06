import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";

export interface StakingPosition {
  id: string;
  user_id: string;
  wallet_id: string;
  pool_name: string;
  token_symbol: string;
  token_address: string | null;
  amount: string;
  apy: number;
  lock_days: number;
  started_at: string;
  ends_at: string | null;
  earned: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StakingPool {
  name: string;
  token: string;
  tokenAddress?: string;
  apy: number;
  lockDays: number;
  tvl: string;
  minStake: string;
  fillPercentage: number;
}

// Default staking pools
export const STAKING_POOLS: StakingPool[] = [
  { 
    name: "CAMLY Flexible", 
    token: "CAMLY", 
    apy: 2, 
    lockDays: 0, 
    tvl: "2.5M", 
    minStake: "100", 
    fillPercentage: 75 
  },
  { 
    name: "CAMLY 30 Days", 
    token: "CAMLY", 
    apy: 4, 
    lockDays: 30, 
    tvl: "5.2M", 
    minStake: "500", 
    fillPercentage: 82 
  },
  { 
    name: "CAMLY 90 Days", 
    token: "CAMLY", 
    apy: 6, 
    lockDays: 90, 
    tvl: "8.1M", 
    minStake: "1000", 
    fillPercentage: 65 
  },
  { 
    name: "BNB Staking", 
    token: "BNB", 
    apy: 1, 
    lockDays: 0, 
    tvl: "15M", 
    minStake: "0.1", 
    fillPercentage: 90 
  },
  { 
    name: "USDT Savings", 
    token: "USDT", 
    apy: 1, 
    lockDays: 0, 
    tvl: "25M", 
    minStake: "100", 
    fillPercentage: 88 
  },
];

export function useStaking() {
  const { user } = useAuth();
  const { activeWallet } = useWallet();
  const queryClient = useQueryClient();

  // Fetch user's staking positions
  const { data: positions = [], isLoading, refetch } = useQuery({
    queryKey: ['staking-positions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('staking_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching staking positions:', error);
        throw error;
      }
      
      return (data || []) as StakingPosition[];
    },
    enabled: !!user?.id,
  });

  // Get active positions only
  const activePositions = positions.filter(p => p.status === 'active');

  // Calculate total staked
  const totalStaked = activePositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.amount || '0');
  }, 0);

  // Calculate total earned
  const totalEarned = activePositions.reduce((sum, pos) => {
    return sum + parseFloat(pos.earned || '0');
  }, 0);

  // Calculate average APY
  const averageApy = activePositions.length > 0
    ? activePositions.reduce((sum, pos) => sum + pos.apy, 0) / activePositions.length
    : 0;

  // Stake tokens mutation
  const stakeMutation = useMutation({
    mutationFn: async ({ 
      pool, 
      amount 
    }: { 
      pool: StakingPool; 
      amount: string;
    }) => {
      if (!user?.id || !activeWallet?.id) {
        throw new Error('No active wallet');
      }

      const endsAt = pool.lockDays > 0 
        ? new Date(Date.now() + pool.lockDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('staking_positions')
        .insert({
          user_id: user.id,
          wallet_id: activeWallet.id,
          pool_name: pool.name,
          token_symbol: pool.token,
          token_address: pool.tokenAddress || null,
          amount,
          apy: pool.apy,
          lock_days: pool.lockDays,
          ends_at: endsAt,
          earned: '0',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      toast({
        title: "Staking thành công!",
        description: "Bạn đã stake thành công.",
      });
    },
    onError: (error) => {
      console.error('Staking error:', error);
      toast({
        title: "Lỗi staking",
        description: "Có lỗi xảy ra khi stake token.",
        variant: "destructive",
      });
    },
  });

  // Claim rewards mutation
  const claimMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      // Calculate estimated earnings based on time staked
      const startedAt = new Date(position.started_at);
      const now = new Date();
      const daysStaked = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = position.apy / 365 / 100;
      const newEarnings = parseFloat(position.amount) * dailyRate * daysStaked;
      const totalEarned = parseFloat(position.earned || '0') + newEarnings;

      const { data, error } = await supabase
        .from('staking_positions')
        .update({ 
          earned: totalEarned.toFixed(6),
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      toast({
        title: "Claim thành công!",
        description: "Phần thưởng đã được cộng vào tài khoản.",
      });
    },
    onError: (error) => {
      console.error('Claim error:', error);
      toast({
        title: "Lỗi claim",
        description: "Có lỗi xảy ra khi claim phần thưởng.",
        variant: "destructive",
      });
    },
  });

  // Unstake mutation
  const unstakeMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      // Check if still locked
      if (position.ends_at && new Date(position.ends_at) > new Date()) {
        throw new Error('Position is still locked');
      }

      const { data, error } = await supabase
        .from('staking_positions')
        .update({ 
          status: 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', positionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-positions'] });
      toast({
        title: "Unstake thành công!",
        description: "Token đã được trả về ví của bạn.",
      });
    },
    onError: (error: Error) => {
      console.error('Unstake error:', error);
      toast({
        title: "Lỗi unstake",
        description: error.message === 'Position is still locked' 
          ? "Token vẫn đang trong thời gian khóa." 
          : "Có lỗi xảy ra khi unstake.",
        variant: "destructive",
      });
    },
  });

  return {
    positions,
    activePositions,
    isLoading,
    totalStaked,
    totalEarned,
    averageApy,
    pools: STAKING_POOLS,
    stake: stakeMutation.mutate,
    claim: claimMutation.mutate,
    unstake: unstakeMutation.mutate,
    isStaking: stakeMutation.isPending,
    isClaiming: claimMutation.isPending,
    isUnstaking: unstakeMutation.isPending,
    refetch,
  };
}
