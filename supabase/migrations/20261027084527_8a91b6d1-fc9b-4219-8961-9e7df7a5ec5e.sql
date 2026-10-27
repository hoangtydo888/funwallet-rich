ALTER FUNCTION public.claim_reward(uuid) SECURITY INVOKER;

CREATE POLICY "users claim own pending rewards" ON public.rewards
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'claim_requested');

CREATE OR REPLACE FUNCTION public.guard_reward_user_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.reward_amount IS DISTINCT FROM OLD.reward_amount
     OR NEW.reward_symbol IS DISTINCT FROM OLD.reward_symbol
     OR NEW.wallet_address IS DISTINCT FROM OLD.wallet_address
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.reward_type IS DISTINCT FROM OLD.reward_type
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'Chỉ được đổi trạng thái phần thưởng';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_reward_user_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rewards_guard_user_update BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.guard_reward_user_update();