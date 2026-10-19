-- Security assertions for manual execution using the Supabase SQL Editor.
-- Needs privileged database connection. READ ONLY; do not run as a scheduled job.
-- Each block returns PASS/true or raises an error. No customer details are read out.
-- 1: Every admin RPC must reject a signed-in NON-admin, even with malformed args.
BEGIN TRANSACTION READ ONLY;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000034',true);
SET LOCAL ROLE authenticated;
DO $audit$
DECLARE r record; denied_count integer := 0; v_sql text;
BEGIN
  IF public.is_admin() THEN RAISE EXCEPTION 'fake_admin_unexpectedly_true'; END IF;
  FOR r IN
    SELECT p.proname fn,coalesce((SELECT string_agg('NULL::'||format_type(x.oid,-1),', ')
      FROM unnest(p.proargtypes) AS x(oid)),'') args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.prosecdef
      AND p.proname LIKE 'admin_%'
      AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    ORDER BY p.proname
  LOOP
    v_sql := format('SELECT public.%I(%s)',r.fn,r.args);
    BEGIN
      EXECUTE v_sql;
      RAISE EXCEPTION 'unauthorized_admin_rpc_%',r.fn;
    EXCEPTION WHEN insufficient_privilege THEN
      denied_count := denied_count + 1;
    END;
  END LOOP;
  IF denied_count <> 16 THEN RAISE EXCEPTION 'expected_16_denials_got_%',denied_count; END IF;
END
$audit$;
SELECT 'PASS: 16 admin functions denied to nonadmin' AS result;
ROLLBACK;

-- 2: A real database-admin identity may read reports through role
-- authenticated. Its UUID stays inside transaction settings, never output.
-- This tests database authorization logic, NOT JWT signature validation.
BEGIN TRANSACTION READ ONLY;
SELECT set_config('audit.admin_id',(SELECT user_id::text FROM public.admins ORDER BY user_id LIMIT 1),true);
SELECT set_config('request.jwt.claim.sub',current_setting('audit.admin_id',true),true);
SET LOCAL ROLE authenticated;
SELECT jsonb_build_object(
 'is_admin',public.is_admin(),
 'order_counts',jsonb_typeof(public.admin_order_counts())='object',
 'order_list',jsonb_typeof(public.admin_list_orders(null,null,1,0))='array',
 'customer_list',jsonb_typeof(public.admin_list_customers(null,1,0))='array',
 'overview',jsonb_typeof(public.admin_overview('America/Sao_Paulo'))='object',
 'finance',jsonb_typeof(public.admin_finance_summary(null,null,'day','America/Sao_Paulo'))='object'
) AS authorized_read_only_checks;
ROLLBACK;

-- 3: Empty user session cannot invoke customer mutations.
BEGIN TRANSACTION READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT jsonb_build_object(
 'add_comment',public.community_add_comment('00000000-0000-0000-0000-000000000034'::uuid,'audit')->>'reason'='auth_required',
 'delete_comment',public.community_delete_comment('00000000-0000-0000-0000-000000000034'::uuid)->>'reason'='auth_required',
 'profile',public.community_my_profile()->>'reason'='auth_required',
 'edit_profile',public.community_save_profile('Audit','audit_handle','','')->>'reason'='auth_required',
 'like',public.community_toggle_like('00000000-0000-0000-0000-000000000034'::uuid)->>'reason'='auth_required',
 'reward',public.redeem_reward('00000000-0000-0000-0000-000000000034'::uuid)->>'reason'='auth_required',
 'ranking',public.set_my_ranking(true,'audit_handle')->>'reason'='auth_required',
 'coupon',public.validate_coupon('audit')->>'reason'='auth_required'
) AS unauthenticated_denial_checks;
ROLLBACK;
