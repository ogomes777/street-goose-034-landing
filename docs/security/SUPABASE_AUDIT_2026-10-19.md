# Supabase security review / Street Goose 034

Verified on 2026-10-19 against production project `hfmzlieixfkisbyweprv`. **No credentials, user data, RLS policies or subscription plans were modified.** SQL is archived in `supabase/migrations/20261019_public_rpc_security.sql`; actual production changes were applied using the Supabase migration connector.

## Applied to production

1. Set `search_path = ''` on six `SECURITY DEFINER` RPCs with schema-qualified database references: `community_comments`, `community_feed`, `community_profile`, `get_ranking`, `is_admin`, `newsletter_subscribe`. `get_ranking_page` already used `search_path = ''`.
2. Fixed the public `get_ranking(NULL)` edge case: a PostgreSQL `LIMIT NULL` would previously remove the 50-row cap. The function now treats NULL as the default of 7 and always caps returned rows at 50.
3. No EXECUTE permissions were changed, so public community, ranking and newsletter endpoints remain available. Anonymous smoke tests passed for `is_admin`, ranking with NULL/default/oversized/negative limits, paginated ranking, feed, community profile and comments. No actual newsletter subscription was created.
4. RLS table inspection found that `admin_users`, `admin_sessions`, `admins`, and `community_comments` are RLS-enabled, have no direct SELECT grants to anonymous or authenticated users and have no policies. This is intentional deny-by-default; no policy was added.

## Advisors still report items, but these are not all exploitable vulnerabilities

- `anon_security_definer_function_executable` (7): Public community/ranking/newsletter are implemented as `SECURITY DEFINER` RPCs on purpose, with constrained outputs and permissions. They must remain callable anonymously until replaced by equivalent RLS-safe APIs.
- `authenticated_security_definer_function_executable` (39): Includes administrator APIs, which require `public.assert_admin()`, plus user-scoped actions using `auth.uid()`. Do not blindly revoke: the Admin dashboard, customer orders, rewards, and community depend on authenticated RPC access. Full per-function threat modeling and live, real-role regression tests are needed before modifying these interfaces.
- `rls_enabled_no_policy` (16, INFO): RLS without an allow-policy denies direct access. Some are intentionally admin-only and manipulated via restricted functions. Do not create broad SELECT policies to silence the advisor.
- `extension_in_public` (1): `pg_net` 0.20.4 reports `extrelocatable = false`, with 28 extension-owned objects; functions `deliver_customer_emails` and `invoke_push_worker` depend on `net.http_*`. Simple `ALTER EXTENSION ... SET SCHEMA` will not work. Moving or reinstalling it could disrupt customer email/push notifications. Needs a separate dependency-aware maintenance procedure and rollback.
- `auth_leaked_password_protection` (1): Organization `SET77 LABS` is confirmed on the **Supabase Free** plan. Official Supabase docs state this built-in HaveIBeenPwned password protection requires **Pro or above**; an upgrade cannot be performed without authorization and financial approval. Other password-strength restrictions remain advisable in Auth settings without falsely claiming equivalent leak protection.

Reference: https://supabase.com/docs/guides/auth/password-security

## Remaining validation

- Test admin RPCs using a dedicated **non-admin** and an actual admin user in a controlled environment, including failure and success paths. Read-only anonymous tests do not establish authorized administration behavior.
- Periodically re-run Security Advisor after permission changes.
- Maintain a recoverable backup and test an isolated restore before any broader security/schema migration.
- Validate storefront checkout on a real iPhone and Android device; automated browser tests have already been performed separately.

**Note:** The Supabase Security Advisor may continue reporting the same counts despite strengthened `search_path`, because its warning is based on the presence of reachable `SECURITY DEFINER` functions, not a proof of unsafe implementation.
