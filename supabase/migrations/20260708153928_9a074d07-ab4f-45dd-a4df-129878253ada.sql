
-- custom_networks table
CREATE TABLE public.custom_networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chain_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  rpc_url TEXT NOT NULL,
  symbol TEXT NOT NULL,
  explorer TEXT,
  logo_url TEXT,
  color TEXT DEFAULT '#00CED1',
  is_testnet BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chain_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_networks TO authenticated;
GRANT ALL ON public.custom_networks TO service_role;

ALTER TABLE public.custom_networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom networks"
  ON public.custom_networks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_custom_networks_updated_at
  BEFORE UPDATE ON public.custom_networks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_watchlist table
CREATE TABLE public.user_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  logo_url TEXT,
  decimals INTEGER DEFAULT 18,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chain_id, token_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_watchlist TO authenticated;
GRANT ALL ON public.user_watchlist TO service_role;

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist"
  ON public.user_watchlist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
