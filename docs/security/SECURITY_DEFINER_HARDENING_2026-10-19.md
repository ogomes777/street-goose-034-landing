# Street Goose 034 / SECURITY DEFINER defense-in-depth (19 Oct 2026)

## Result: validated non-destructive hardening
Production Supabase project: `hfmzlieixfkisbyweprv`.

The following changes were successfully applied as Supabase migrations:
- `streetgoose_admin_rpc_restricted_searchpath_20261019` — 15 administrator RPCs.
- `streetgoose_customer_rpc_restricted_searchpath_20261019` — 10 authenticated customer RPCs.
- `streetgoose_privileged_helpers_restricted_searchpath_20261019` — 4 internal security helpers (`assert_admin`, `community_author`, `coupon_check`, `sg_rate_ok`).

An additional administrator RPC was already using the empty search path. The six public RPCs previously hardened also remain unchanged. Overall, 29 new function metadata updates were applied in this review, including four privileged helpers.

**Exactly what changed:** function metadata `search_path` is now `''`, preventing unintended object resolution through `public`. Existing `SECURITY DEFINER`, function source, arguments, ownership and `EXECUTE` grants were preserved. No frontend, visual design, customer records or production auth configuration were modified.

## Read-only verifications (executed successfully before/after migration)

- 16/16 administrator RPCs raised `42501` for an authenticated identity with no administrative privileges.
- A database-simulated existing admin identity passed checks for `is_admin`, order counts, orders list, customer list, general overview, and finance summary. The results returned only type assertions, not customer data.
- 9 customer actions rejected an empty auth session as `auth_required`, and `create_whatsapp_order` rejected it with SQLSTATE `28000`.
- Four internal helpers were checked: authorized administrator reports, public feed and ranking still worked, coupon lookup rejected an unknown code, and the rate-limit counter returned correctly in a transaction rolled back after the test.
- An identity without admin rights could not see other users' orders, order items, address details or pending community posts (read-only RLS checks).
- Admin RPC metadata: 16/16 now have restricted search paths, 0 remain with `search_path=public`.
- The pre-existing public ranking/community RPC smoke tests passed with an anonymous database role in an earlier migration.
- No test orders, newsletters, notifications or customers were created.

The checks are archived in `supabase/tests/security_definer_role_regression_20261019.sql`.

## Important limitations

- A secure search path is **defense-in-depth**, not sufficient on its own to prove every RPC is secure.
- SECURITY DEFINER advisory counts can remain (7 for anon and 39 for authenticated), because the checker flags reachability by role, not necessarily flawed authorization.
- No mass `REVOKE` or RLS policy grants were applied. Public RPCs remain reachable only as required by the product.
- Login and JWT signature verification, real iPhone/Android and all mutating success paths require additional external end-to-end tests.
- No automatic assertion of absolute security is justified. Behavior beyond the inspected/role-tested paths needs continued monitoring.
- Separate privacy observation: `xp_totals` is currently a conventional view owned by postgres and SELECT-granted to authenticated; direct access could reveal XP totals for future non-opted-in users. Current query found one XP account and zero non-opted-in accounts. **Do not alter this view without a scoped compatibility test**, especially with ranking dependencies.

## Rollback

These ALTER FUNCTION settings can be reverted to their previous value by an authorized schema migration:
`ALTER FUNCTION public.<name>(<types>) SET search_path = 'public';`

The 15 admin functions and 10 customer functions were on `search_path='public'` before this hardening. Rollback must be applied only after investigating an actual regression.

## Remaining priorities

1. Validate remote APIs with actual signed JWTs belonging to a non-admin and a real admin, in a controlled test environment.
2. Review customer-level authorization for all other privileged functions with mutation paths and implement focused regression tests.
3. Investigate XP view and ranking opt-in data visibility, separately from this no-UI-change hardening.
4. Keep Auth leaked-password protection on the backlog; Supabase Free cannot enable the built-in HaveIBeenPwned feature. No billing changes were made.
5. Confirm backup restoration before any broad database security migration.

Refs: https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0029_authenticated_security_definer_function_executable
