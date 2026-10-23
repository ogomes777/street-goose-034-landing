-- SG034 / Defense in depth: privileged API calls must use an active MFA session.
-- AAL2 alone is a signed JWT claim and may survive a logout until expiration.
-- Checking auth.sessions allows revocation to take effect immediately on
-- admin RPCs and RLS that use public.is_admin().
-- This migration does not change access for shoppers or anonymous visitors.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin_identity()
    AND coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    AND EXISTS (
      SELECT 1
      FROM auth.sessions s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (auth.jwt()->>'session_id')
        AND s.aal::text = 'aal2'
        AND (s.not_after IS NULL OR s.not_after > now())
    );
$$;

-- Keep grants as they are: some public RLS predicates call is_admin().
-- The function itself returns false for anonymous or ordinary identities.
NOTIFY pgrst, 'reload schema';
