-- Street Goose 034 / identity-bound MFA.
-- Client may inspect whether the signed-in identity is an administrator
-- before enrollment. The privileged check (is_admin) MUST require AAL2.
-- Existing RPCs call assert_admin -> is_admin; existing RLS policies
-- and comment moderation also consult is_admin. One server-side guard.

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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin_identity()
    AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

-- Supabase issues the signed 'aal' claim only after an MFA challenge.
-- All preexisting policies referencing is_admin() and all assert_admin()
-- callers consequently fail closed at AAL1 without mass-policy rewrites.
-- Do not store static admin passwords in frontend or database.

-- Ensure PostgREST immediately exposes the pre-MFA identity RPC.
NOTIFY pgrst, 'reload schema';
