
-- user_cards
CREATE TABLE IF NOT EXISTS public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  card_number text NOT NULL,
  card_tier text NOT NULL DEFAULT 'bronze',
  balance numeric NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  nft_badge_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards" ON public.user_cards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_cards_updated BEFORE UPDATE ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- nft_collections
CREATE TABLE IF NOT EXISTS public.nft_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid,
  contract_address text NOT NULL,
  token_id text NOT NULL,
  name text,
  description text,
  image_url text,
  metadata_url text,
  chain text NOT NULL DEFAULT 'bsc',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nft_collections TO authenticated;
GRANT ALL ON public.nft_collections TO service_role;
ALTER TABLE public.nft_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nfts" ON public.nft_collections FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- staking_positions
CREATE TABLE IF NOT EXISTS public.staking_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid,
  pool_name text NOT NULL,
  token_symbol text NOT NULL,
  token_address text,
  amount text NOT NULL,
  apy numeric NOT NULL DEFAULT 0,
  lock_days integer NOT NULL DEFAULT 0,
  earned text NOT NULL DEFAULT '0',
  status text NOT NULL DEFAULT 'active',
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.staking_positions TO authenticated;
GRANT ALL ON public.staking_positions TO service_role;
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own staking" ON public.staking_positions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER staking_updated BEFORE UPDATE ON public.staking_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- learning_progress
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own learning" ON public.learning_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_learning_stats
CREATE TABLE IF NOT EXISTS public.user_learning_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  certificates_earned text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_learning_stats TO authenticated;
GRANT ALL ON public.user_learning_stats TO service_role;
ALTER TABLE public.user_learning_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats" ON public.user_learning_stats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- security_logs
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_details jsonb,
  success boolean NOT NULL DEFAULT true,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_logs TO authenticated;
GRANT ALL ON public.security_logs TO service_role;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs read" ON public.security_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own logs insert" ON public.security_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
