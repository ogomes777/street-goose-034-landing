-- Street Goose 034 | Production-compatible defense in depth, 19 Oct 2026.
-- Applied in production using Supabase migrations:
--   streetgoose_admin_rpc_restricted_searchpath_20261019
--   streetgoose_customer_rpc_restricted_searchpath_20261019
-- This file versions those changes for future environments. It is idempotent.
-- NO DROP, REVOKE, auth changes, customer-data changes or UI changes.
-- Existing SECURITY DEFINER and function signatures are preserved.
BEGIN;
-- Administrator RPCs require public.assert_admin(). All referenced database
-- relations/custom helpers are schema-qualified; pg_catalog built-ins remain
-- available with an empty search_path.
ALTER FUNCTION public.admin_adjust_xp(uuid, integer, text) SET search_path = '';
ALTER FUNCTION public.admin_delete_finance_entry(uuid) SET search_path = '';
ALTER FUNCTION public.admin_delete_order(uuid) SET search_path = '';
ALTER FUNCTION public.admin_feature_post(uuid, boolean) SET search_path = '';
ALTER FUNCTION public.admin_finance_summary(timestamptz, timestamptz, text, text) SET search_path = '';
ALTER FUNCTION public.admin_list_community_posts(text, integer, integer) SET search_path = '';
ALTER FUNCTION public.admin_list_customers(text, integer, integer) SET search_path = '';
ALTER FUNCTION public.admin_list_finance(timestamptz, timestamptz, text, text, integer, integer) SET search_path = '';
ALTER FUNCTION public.admin_list_orders(text, text, integer, integer) SET search_path = '';
ALTER FUNCTION public.admin_moderate_post(uuid, text, text) SET search_path = '';
ALTER FUNCTION public.admin_order_counts() SET search_path = '';
ALTER FUNCTION public.admin_overview(text) SET search_path = '';
ALTER FUNCTION public.admin_save_finance_entry(uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.admin_save_order(uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.admin_update_order(uuid, text, jsonb, integer, text) SET search_path = '';
-- admin_send_notification_campaign was already hardened to search_path='' .
-- Customer RPCs continue to use auth.uid(), restricted inputs and original
-- EXECUTE grants. No function body was changed by these ALTER statements.
ALTER FUNCTION public.community_add_comment(uuid, text) SET search_path = '';
ALTER FUNCTION public.community_delete_comment(uuid) SET search_path = '';
ALTER FUNCTION public.community_handle_available(text) SET search_path = '';
ALTER FUNCTION public.community_my_profile() SET search_path = '';
ALTER FUNCTION public.community_save_profile(text, text, text, text) SET search_path = '';
ALTER FUNCTION public.community_toggle_like(uuid) SET search_path = '';
ALTER FUNCTION public.create_whatsapp_order(jsonb, jsonb, text, text) SET search_path = '';
ALTER FUNCTION public.redeem_reward(uuid) SET search_path = '';
ALTER FUNCTION public.set_my_ranking(boolean, text) SET search_path = '';
ALTER FUNCTION public.validate_coupon(text) SET search_path = '';
COMMIT;
