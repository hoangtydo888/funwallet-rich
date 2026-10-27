CREATE OR REPLACE FUNCTION public.claim_reward(p_reward_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.rewards%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Chưa đăng nhập'; END IF;
  SELECT * INTO r FROM public.rewards WHERE id = p_reward_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy phần thưởng'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Phần thưởng không ở trạng thái chờ nhận'; END IF;
  UPDATE public.rewards SET status = 'claim_requested' WHERE id = p_reward_id;
  INSERT INTO public.transactions (user_id, tx_type, token_symbol, amount, to_address, status)
  VALUES (auth.uid(), 'reward', COALESCE(r.reward_symbol, 'CAMLY'), r.reward_amount, r.wallet_address, 'pending');
  RETURN 'claim_requested';
END $$;
REVOKE ALL ON FUNCTION public.claim_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_reward(uuid) TO authenticated;