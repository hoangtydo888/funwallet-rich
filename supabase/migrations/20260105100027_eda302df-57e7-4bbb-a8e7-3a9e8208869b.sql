-- =====================================================
-- FUN Wallet: Encrypted Keys and User Settings Tables
-- For cross-device sync of wallets
-- =====================================================

-- Table for encrypted private keys (synced across devices)
CREATE TABLE public.encrypted_wallet_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

-- Enable RLS
ALTER TABLE public.encrypted_wallet_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own encrypted keys
CREATE POLICY "Users can view own encrypted keys"
ON public.encrypted_wallet_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encrypted keys"
ON public.encrypted_wallet_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own encrypted keys"
ON public.encrypted_wallet_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own encrypted keys"
ON public.encrypted_wallet_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Table for user settings (synced across devices)
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  favorite_token TEXT DEFAULT 'CAMLY',
  recent_addresses JSONB DEFAULT '[]',
  bulk_send_defaults JSONB DEFAULT '{}',
  walletconnect_sessions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_encrypted_wallet_keys_updated_at
BEFORE UPDATE ON public.encrypted_wallet_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();