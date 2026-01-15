-- Create user_cards table for Card page
CREATE TABLE public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_number TEXT NOT NULL,
  card_tier TEXT NOT NULL DEFAULT 'bronze',
  balance DECIMAL(18,2) DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  nft_badge_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_cards
CREATE POLICY "Users can view own card" ON public.user_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card" ON public.user_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card" ON public.user_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "block_anon_cards" ON public.user_cards
  FOR ALL USING (false);

-- Create learning_progress table
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_progress
CREATE POLICY "Users can view own progress" ON public.learning_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "block_anon_learning" ON public.learning_progress
  FOR ALL USING (false);

-- Create user_learning_stats table
CREATE TABLE public.user_learning_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  certificates_earned TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_learning_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_learning_stats
CREATE POLICY "Users can view own stats" ON public.user_learning_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_learning_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_learning_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "block_anon_learning_stats" ON public.user_learning_stats
  FOR ALL USING (false);

-- Create trigger for updated_at
CREATE TRIGGER update_user_cards_updated_at
  BEFORE UPDATE ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_learning_stats_updated_at
  BEFORE UPDATE ON public.user_learning_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();