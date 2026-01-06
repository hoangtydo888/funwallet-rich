import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const previousKycStatus = useRef<string | null>(null);
  const previousEarnings = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    // Listen for KYC status changes on profiles table
    const kycChannel = supabase
      .channel('kyc-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.kyc_status as string | null;
          const oldStatus = payload.old?.kyc_status as string | null;

          // Only notify if status actually changed
          if (newStatus && newStatus !== oldStatus && previousKycStatus.current !== newStatus) {
            previousKycStatus.current = newStatus;

            if (newStatus === 'approved') {
              toast.success('🎉 KYC đã được duyệt!', {
                description: 'Tài khoản của bạn đã được xác minh thành công.',
                duration: 8000,
              });
            } else if (newStatus === 'rejected') {
              toast.error('❌ KYC bị từ chối', {
                description: 'Vui lòng kiểm tra lý do và gửi lại hồ sơ.',
                duration: 8000,
              });
            }
          }
        }
      )
      .subscribe();

    // Listen for staking rewards updates
    const stakingChannel = supabase
      .channel('staking-rewards-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'staking_positions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const positionId = payload.new?.id as string;
          const newEarned = parseFloat(payload.new?.earned as string || '0');
          const oldEarned = parseFloat(payload.old?.earned as string || '0');
          const tokenSymbol = payload.new?.token_symbol as string;
          const poolName = payload.new?.pool_name as string;

          const prevEarned = previousEarnings.current.get(positionId) ?? oldEarned;

          // Only notify if earned increased
          if (newEarned > prevEarned) {
            previousEarnings.current.set(positionId, newEarned);
            const diff = (newEarned - prevEarned).toFixed(4);
            
            toast.success(`💰 +${diff} ${tokenSymbol}`, {
              description: `Phần thưởng staking từ pool ${poolName}`,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kycChannel);
      supabase.removeChannel(stakingChannel);
    };
  }, [user?.id]);
}
