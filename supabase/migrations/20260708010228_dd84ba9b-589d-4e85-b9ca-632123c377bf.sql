
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'vi';

ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS block_number bigint;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS gas_used numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tx_timestamp timestamptz;
ALTER TABLE public.user_learning_stats ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.learning_progress ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.staking_positions ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now();
