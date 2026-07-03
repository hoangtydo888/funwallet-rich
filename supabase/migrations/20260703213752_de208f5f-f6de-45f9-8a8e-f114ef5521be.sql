
CREATE TABLE IF NOT EXISTS public.encrypted_wallet_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  encrypted_key text NOT NULL,
  key_salt text NOT NULL,
  key_iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encrypted_wallet_keys TO authenticated;
GRANT ALL ON public.encrypted_wallet_keys TO service_role;
ALTER TABLE public.encrypted_wallet_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own encrypted keys" ON public.encrypted_wallet_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ewk_updated_at BEFORE UPDATE ON public.encrypted_wallet_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  favorite_token text,
  recent_addresses jsonb DEFAULT '[]'::jsonb,
  bulk_send_defaults jsonb DEFAULT '{}'::jsonb,
  walletconnect_sessions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_us_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
