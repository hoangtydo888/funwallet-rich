-- Prevent self-approval even when older permissive owner policies still exist.
CREATE OR REPLACE FUNCTION public.guard_wallet_kyc_review_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); path text;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin') THEN RETURN NEW; END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'Authenticated user required' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'KYC identity is immutable' USING ERRCODE='42501';
  END IF;
  IF public.has_role(actor,'admin') THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM actor OR NEW.status <> 'pending' OR NEW.reviewed_by IS NOT NULL
     OR NEW.reviewed_at IS NOT NULL OR NEW.rejection_reason IS NOT NULL THEN
    RAISE EXCEPTION 'KYC review fields are administrator-only' USING ERRCODE='42501';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Reviewed KYC cannot be edited by its submitter' USING ERRCODE='42501';
  END IF;
  FOREACH path IN ARRAY ARRAY[NEW.id_front_path,NEW.id_back_path,NEW.selfie_path] LOOP
    IF path IS NOT NULL AND (pg_catalog.split_part(path,'/',1) <> actor::text OR path LIKE '%/../%' OR path LIKE '%/./%') THEN
      RAISE EXCEPTION 'KYC document path must belong to the submitter' USING ERRCODE='42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_wallet_kyc_review_fields() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS wallet_kyc_review_fields_guard ON public.kyc_submissions;
CREATE TRIGGER wallet_kyc_review_fields_guard BEFORE INSERT OR UPDATE ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_kyc_review_fields();

DROP POLICY IF EXISTS wallet_kyc_insert_review_guard ON public.kyc_submissions;
CREATE POLICY wallet_kyc_insert_review_guard ON public.kyc_submissions AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR (user_id=auth.uid() AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL));
DROP POLICY IF EXISTS wallet_kyc_update_review_guard ON public.kyc_submissions;
CREATE POLICY wallet_kyc_update_review_guard ON public.kyc_submissions AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR (user_id=auth.uid() AND status='pending'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR (user_id=auth.uid() AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL));

CREATE OR REPLACE FUNCTION public.guard_wallet_profile_kyc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin') THEN RETURN NEW; END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'Authenticated user required' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Profile owner is immutable' USING ERRCODE='42501';
  END IF;
  IF public.has_role(actor,'admin') THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Profile owner mismatch' USING ERRCODE='42501'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.kyc_status <> 'pending' THEN RAISE EXCEPTION 'New profiles must start pending' USING ERRCODE='42501'; END IF;
  ELSIF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    IF NEW.kyc_status <> 'submitted' OR NOT EXISTS(SELECT 1 FROM public.kyc_submissions k WHERE k.user_id=actor AND k.status='pending') THEN
      RAISE EXCEPTION 'KYC status is controlled by review' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_wallet_profile_kyc_status() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS wallet_profile_kyc_status_guard ON public.profiles;
CREATE TRIGGER wallet_profile_kyc_status_guard BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_profile_kyc_status();

-- Administrator review + profile status commit or roll back together.
CREATE OR REPLACE FUNCTION public.review_wallet_kyc(p_submission_id uuid,p_status text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); subject uuid; previous_status text;
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor,'admin') THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  IF p_status='rejected' AND (p_reason IS NULL OR pg_catalog.length(pg_catalog.btrim(p_reason))=0 OR pg_catalog.length(p_reason)>2000) THEN RAISE EXCEPTION 'Rejection reason required (1-2000 characters)'; END IF;
  SELECT k.user_id,k.status INTO subject,previous_status FROM public.kyc_submissions k WHERE k.id=p_submission_id FOR UPDATE;
  IF subject IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF previous_status<>'pending' THEN RAISE EXCEPTION 'Submission already reviewed; refresh before continuing'; END IF;
  UPDATE public.kyc_submissions SET status=p_status,reviewed_by=actor,reviewed_at=pg_catalog.clock_timestamp(),rejection_reason=CASE WHEN p_status='rejected' THEN pg_catalog.btrim(p_reason) ELSE NULL END WHERE id=p_submission_id;
  UPDATE public.profiles SET kyc_status=p_status WHERE user_id=subject;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing; review rolled back'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_wallet_kyc(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_wallet_kyc(uuid,text,text) TO authenticated;
