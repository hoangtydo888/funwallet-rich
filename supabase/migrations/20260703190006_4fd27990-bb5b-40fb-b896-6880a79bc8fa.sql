
-- wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  name text NOT NULL DEFAULT 'Wallet',
  chain text NOT NULL DEFAULT 'bsc',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallets" ON public.wallets FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid,
  tx_hash text,
  tx_type text NOT NULL,
  token_symbol text,
  token_address text,
  amount text,
  from_address text,
  to_address text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own tx insert" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tx update" ON public.transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  reward_type text NOT NULL,
  reward_amount text NOT NULL,
  reward_symbol text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards select" ON public.rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rewards admin write" ON public.rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- bulk_transfers
CREATE TABLE IF NOT EXISTS public.bulk_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  token_symbol text NOT NULL,
  token_address text,
  total_recipients integer NOT NULL DEFAULT 0,
  total_amount text NOT NULL DEFAULT '0',
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bulk_transfers TO authenticated;
GRANT ALL ON public.bulk_transfers TO service_role;
ALTER TABLE public.bulk_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bulk" ON public.bulk_transfers FOR ALL TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = created_by);

-- bulk_transfer_items
CREATE TABLE IF NOT EXISTS public.bulk_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_transfer_id uuid NOT NULL REFERENCES public.bulk_transfers(id) ON DELETE CASCADE,
  recipient_address text NOT NULL,
  amount text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bulk_transfer_items TO authenticated;
GRANT ALL ON public.bulk_transfer_items TO service_role;
ALTER TABLE public.bulk_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk items via parent" ON public.bulk_transfer_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bulk_transfers b WHERE b.id = bulk_transfer_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_transfers b WHERE b.id = bulk_transfer_id AND b.created_by = auth.uid()));
