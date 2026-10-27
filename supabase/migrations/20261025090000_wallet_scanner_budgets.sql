-- Server-only, shared across edge instances. Never exposes wallet/address data.
CREATE TABLE IF NOT EXISTS public.wallet_scan_budgets (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE public.wallet_scan_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wallet_scan_budgets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.wallet_scan_budgets FROM service_role;

CREATE OR REPLACE FUNCTION public.consume_wallet_scan_budget(p_user uuid, p_scope text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_item record;
  v_hits integer;
BEGIN
  IF p_user IS NULL OR p_scope NOT IN ('token-scanner','nft-scanner','bscscan-proxy') OR p_scope IS NULL THEN
    RAISE EXCEPTION 'Invalid scan budget input';
  END IF;
  -- All scopes share user/global ceilings, so switching endpoints cannot evade them.
  FOR v_item IN
    SELECT * FROM (VALUES
      ('user-minute:'||p_user::text,pg_catalog.date_trunc('minute',v_now),12,60),
      ('user-hour:'||p_user::text,pg_catalog.date_trunc('hour',v_now),120,3600),
      ('global-minute',pg_catalog.date_trunc('minute',v_now),600,60),
      ('global-hour',pg_catalog.date_trunc('hour',v_now),6000,3600)
    ) AS limits(bucket,window_start,cap,retry)
  LOOP
    v_hits := NULL;
    INSERT INTO public.wallet_scan_budgets AS budgets(bucket,window_start,hits)
    VALUES(v_item.bucket,v_item.window_start,1)
    ON CONFLICT(bucket,window_start) DO UPDATE SET hits=budgets.hits+1
      WHERE budgets.hits<v_item.cap
    RETURNING hits INTO v_hits;
    IF v_hits IS NULL THEN RETURN v_item.retry; END IF;
  END LOOP;
  DELETE FROM public.wallet_scan_budgets WHERE window_start < v_now - interval '2 hours';
  RETURN 0;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_wallet_scan_budget(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_wallet_scan_budget(uuid,text) TO service_role;
