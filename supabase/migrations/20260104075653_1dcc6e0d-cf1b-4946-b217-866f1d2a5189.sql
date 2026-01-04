-- Create rewards table for tracking user rewards
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  reward_type text NOT NULL, -- 'token', 'nft', 'points'
  reward_amount text NOT NULL,
  reward_symbol text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'claimed'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Admin can manage all rewards
CREATE POLICY "Admins can manage all rewards"
ON public.rewards FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own rewards
CREATE POLICY "Users can view own rewards"
ON public.rewards FOR SELECT
USING (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));