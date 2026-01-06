-- Create staking_positions table for tracking user staking
CREATE TABLE public.staking_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  pool_name text NOT NULL,
  token_symbol text NOT NULL,
  token_address text,
  amount text NOT NULL,
  apy numeric NOT NULL,
  lock_days integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  earned text DEFAULT '0',
  status text DEFAULT 'active', -- active, completed, withdrawn
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for staking_positions
CREATE POLICY "Users can view their own staking positions" 
ON public.staking_positions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own staking positions" 
ON public.staking_positions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staking positions" 
ON public.staking_positions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staking positions" 
ON public.staking_positions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_staking_positions_updated_at
BEFORE UPDATE ON public.staking_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false);

-- RLS: Users can upload their own KYC docs
CREATE POLICY "Users can upload own KYC docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can view their own KYC docs
CREATE POLICY "Users can view own KYC docs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can update their own KYC docs
CREATE POLICY "Users can update own KYC docs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own KYC docs
CREATE POLICY "Users can delete own KYC docs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);