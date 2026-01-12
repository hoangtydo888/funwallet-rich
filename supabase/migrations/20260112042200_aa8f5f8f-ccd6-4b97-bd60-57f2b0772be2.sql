-- ============================================
-- FUN WALLET SECURITY UPGRADE - Phase 2
-- Block anonymous access + Security logging
-- ============================================

-- 1. Block anonymous access to sensitive tables
-- encrypted_wallet_keys
CREATE POLICY "block_anon_encrypted_keys" ON public.encrypted_wallet_keys
FOR ALL TO anon USING (false);

-- kyc_submissions (PII data)
CREATE POLICY "block_anon_kyc" ON public.kyc_submissions
FOR ALL TO anon USING (false);

-- profiles
CREATE POLICY "block_anon_profiles" ON public.profiles
FOR ALL TO anon USING (false);

-- wallets
CREATE POLICY "block_anon_wallets" ON public.wallets
FOR ALL TO anon USING (false);

-- transactions
CREATE POLICY "block_anon_transactions" ON public.transactions
FOR ALL TO anon USING (false);

-- staking_positions
CREATE POLICY "block_anon_staking" ON public.staking_positions
FOR ALL TO anon USING (false);

-- user_settings
CREATE POLICY "block_anon_settings" ON public.user_settings
FOR ALL TO anon USING (false);

-- 2. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own security logs
CREATE POLICY "users_read_own_security_logs" ON public.security_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own security logs
CREATE POLICY "users_insert_own_security_logs" ON public.security_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Block anonymous access to security_logs
CREATE POLICY "block_anon_security_logs" ON public.security_logs
FOR ALL TO anon USING (false);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_logs_user_created 
ON public.security_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_event_type 
ON public.security_logs(event_type, created_at DESC);