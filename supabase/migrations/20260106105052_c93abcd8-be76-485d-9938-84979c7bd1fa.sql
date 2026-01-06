-- Create kyc_submissions table for admin management
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  date_of_birth text,
  nationality text,
  id_number text NOT NULL,
  phone text,
  address text,
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  selfie_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- User can view their own KYC submissions
CREATE POLICY "Users can view own KYC submissions"
ON public.kyc_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- User can insert their own KYC submissions
CREATE POLICY "Users can insert own KYC submissions"
ON public.kyc_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin can manage all KYC submissions
CREATE POLICY "Admins can manage all KYC submissions"
ON public.kyc_submissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_kyc_submissions_updated_at
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for profiles and staking_positions
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.staking_positions REPLICA IDENTITY FULL;

-- Add tables to realtime publication (drop first if exists, then recreate)
DO $$
BEGIN
  -- Try to add tables to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staking_positions;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
END $$;