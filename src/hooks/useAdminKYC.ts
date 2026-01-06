import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KYCSubmission {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  id_number: string;
  phone: string | null;
  address: string | null;
  id_front_path: string;
  id_back_path: string;
  selfie_path: string;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    email: string | null;
    display_name: string | null;
  };
}

export function useAdminKYC() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all KYC submissions with profile info
  const { data: kycList = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching KYC submissions:', error);
        throw error;
      }

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(submission => ({
        ...submission,
        profile: profileMap.get(submission.user_id)
      })) as KYCSubmission[];
    },
    enabled: !!user?.id,
  });

  // Get pending count for stats
  const pendingCount = kycList.filter(k => k.status === 'pending').length;

  // Approve KYC mutation
  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const submission = kycList.find(k => k.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      // Update kyc_submissions status
      const { error: kycError } = await supabase
        .from('kyc_submissions')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (kycError) throw kycError;

      // Update user profile kyc_status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'approved' })
        .eq('user_id', submission.user_id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
      toast.success('Đã duyệt KYC thành công');
    },
    onError: (error) => {
      console.error('Approve KYC error:', error);
      toast.error('Không thể duyệt KYC');
    }
  });

  // Reject KYC mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      const submission = kycList.find(k => k.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      // Update kyc_submissions status
      const { error: kycError } = await supabase
        .from('kyc_submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (kycError) throw kycError;

      // Update user profile kyc_status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('user_id', submission.user_id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-submissions'] });
      toast.success('Đã từ chối KYC');
    },
    onError: (error) => {
      console.error('Reject KYC error:', error);
      toast.error('Không thể từ chối KYC');
    }
  });

  // Get signed URL for document preview
  const getDocumentUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(path, 3600); // 1 hour

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  };

  return {
    kycList,
    pendingCount,
    isLoading,
    refetch,
    approveKYC: approveMutation.mutate,
    rejectKYC: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    getDocumentUrl
  };
}
