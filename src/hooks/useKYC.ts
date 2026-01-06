import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type KYCStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface KYCFormData {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  idNumber: string;
  phone: string;
  address: string;
}

export function useKYC() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Fetch KYC status from profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-kyc', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status, display_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Upload KYC document
  const uploadDocument = async (file: File, type: 'id_front' | 'id_back' | 'selfie'): Promise<string | null> => {
    if (!user?.id) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi upload",
        description: `Không thể upload ${type}. Vui lòng thử lại.`,
        variant: "destructive",
      });
      return null;
    }

    setUploadProgress(prev => ({ ...prev, [type]: 100 }));
    return data.path;
  };

  // Submit KYC mutation
  const submitKYCMutation = useMutation({
    mutationFn: async ({ 
      formData, 
      documents 
    }: { 
      formData: KYCFormData; 
      documents: { idFront: File; idBack: File; selfie: File }; 
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload all documents
      const [idFrontPath, idBackPath, selfiePath] = await Promise.all([
        uploadDocument(documents.idFront, 'id_front'),
        uploadDocument(documents.idBack, 'id_back'),
        uploadDocument(documents.selfie, 'selfie'),
      ]);

      if (!idFrontPath || !idBackPath || !selfiePath) {
        throw new Error('Failed to upload documents');
      }

      // Insert into kyc_submissions table for admin review
      const { error: kycError } = await supabase
        .from('kyc_submissions')
        .insert({
          user_id: user.id,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth || null,
          nationality: formData.nationality || null,
          id_number: formData.idNumber,
          phone: formData.phone || null,
          address: formData.address || null,
          id_front_path: idFrontPath,
          id_back_path: idBackPath,
          selfie_path: selfiePath,
          status: 'pending'
        });

      if (kycError) throw kycError;

      // Update profile with KYC status
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'submitted',
          display_name: formData.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-kyc'] });
      toast({
        title: "KYC đã gửi!",
        description: "Hồ sơ của bạn đang được xét duyệt.",
      });
    },
    onError: (error) => {
      console.error('KYC submission error:', error);
      toast({
        title: "Lỗi gửi KYC",
        description: "Có lỗi xảy ra. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  return {
    kycStatus: (profile?.kyc_status as KYCStatus) || 'pending',
    profile,
    isLoading,
    uploadProgress,
    submitKYC: submitKYCMutation.mutate,
    isSubmitting: submitKYCMutation.isPending,
  };
}
