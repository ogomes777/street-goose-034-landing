-- Street Goose 034: protection of internal privileged helper functions.
-- Already applied in production via:
-- streetgoose_privileged_helpers_restricted_searchpath_20261019
-- Idempotent metadata-only changes: existing SECURITY DEFINER, EXECUTE grants,
-- implementation, ownership, signatures and RLS remain unchanged.
BEGIN;
ALTER FUNCTION public.assert_admin() SET search_path = '';
ALTER FUNCTION public.community_author(uuid) SET search_path = '';
ALTER FUNCTION public.coupon_check(text, uuid) SET search_path = '';
ALTER FUNCTION public.sg_rate_ok(text, text, integer, interval) SET search_path = '';
COMMIT;
