-- SG034 step 2 of 2: ONLY after an admin's TOTP is enrolled and verified
-- on the updated frontend. Requires 20261022151000_admin_identity_preflight.sql.
-- Be aware: any session still at AAL1 immediately loses privileged access.

DO $$
BEGIN
  IF to_regprocedure('public.is_admin_identity()') IS NULL THEN
    RAISE EXCEPTION 'SG034 MFA preflight missing; refusing enforcement';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin_identity()
    AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;
NOTIFY pgrst, 'reload schema';
