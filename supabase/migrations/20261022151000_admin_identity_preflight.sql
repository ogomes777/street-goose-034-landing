-- SG034 step 1 of 2: non-breaking identity lookup for MFA enrollment.
-- Does not alter is_admin(), RLS, existing sessions, or privileged RPCs.
CREATE OR REPLACE FUNCTION public.is_admin_identity()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_identity() TO authenticated;
NOTIFY pgrst, 'reload schema';
