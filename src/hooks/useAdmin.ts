import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserWithWallets {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  wallets: {
    id: string;
    address: string;
    name: string;
    chain: string;
    created_at: string;
  }[];
}

export interface Reward {
  id: string;
  user_id: string;
  wallet_address: string;
  reward_type: string;
  reward_amount: string;
  reward_symbol: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  sent_at: string | null;
  created_by: string;
  user_email?: string;
  user_name?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalWallets: number;
  usersWithWallets: number;
  totalRewards: number;
  pendingRewards: number;
  sentRewards: number;
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithWallets[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalWallets: 0,
    usersWithWallets: 0,
    totalRewards: 0,
    pendingRewards: 0,
    sentRewards: 0,
  });

  const checkIsAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return false;
      }

      setIsAdmin(data === true);
      return data === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Fetch all wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (walletsError) {
        console.error('Error fetching wallets:', walletsError);
        return;
      }

      // Combine profiles with their wallets
      const usersWithWallets: UserWithWallets[] = (profiles || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        display_name: profile.display_name,
        created_at: profile.created_at,
        wallets: (wallets || []).filter((w) => w.user_id === profile.user_id),
      }));

      setUsers(usersWithWallets);

      // Calculate stats
      const usersWithWalletsCount = usersWithWallets.filter((u) => u.wallets.length > 0).length;
      
      setStats((prev) => ({
        ...prev,
        totalUsers: profiles?.length || 0,
        totalWallets: wallets?.length || 0,
        usersWithWallets: usersWithWalletsCount,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [isAdmin]);

  const fetchRewards = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rewards:', error);
        return;
      }

      // Enrich with user info
      const enrichedRewards: Reward[] = (data || []).map((reward) => {
        const userData = users.find((u) => u.user_id === reward.user_id);
        return {
          ...reward,
          user_email: userData?.email || undefined,
          user_name: userData?.display_name || undefined,
        };
      });

      setRewards(enrichedRewards);

      // Update reward stats
      const pending = enrichedRewards.filter((r) => r.status === 'pending').length;
      const sent = enrichedRewards.filter((r) => r.status === 'sent').length;

      setStats((prev) => ({
        ...prev,
        totalRewards: enrichedRewards.length,
        pendingRewards: pending,
        sentRewards: sent,
      }));
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  }, [isAdmin, users]);

  const createReward = async (data: {
    user_id: string;
    wallet_address: string;
    reward_type: string;
    reward_amount: string;
    reward_symbol?: string;
    notes?: string;
  }) => {
    if (!user || !isAdmin) return { error: new Error('Unauthorized') };

    const { error } = await supabase.from('rewards').insert({
      ...data,
      created_by: user.id,
    });

    if (!error) {
      await fetchRewards();
    }

    return { error };
  };

  const updateRewardStatus = async (rewardId: string, status: string) => {
    if (!isAdmin) return { error: new Error('Unauthorized') };

    const updateData: { status: string; sent_at?: string } = { status };
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rewards')
      .update(updateData)
      .eq('id', rewardId);

    if (!error) {
      await fetchRewards();
    }

    return { error };
  };

  useEffect(() => {
    checkIsAdmin();
  }, [checkIsAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  useEffect(() => {
    if (isAdmin && users.length > 0) {
      fetchRewards();
    }
  }, [isAdmin, users, fetchRewards]);

  return {
    isAdmin,
    loading,
    users,
    rewards,
    stats,
    fetchUsers,
    fetchRewards,
    createReward,
    updateRewardStatus,
  };
};
