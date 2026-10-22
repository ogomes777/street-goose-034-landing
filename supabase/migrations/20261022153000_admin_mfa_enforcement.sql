-- Street Goose 034: defense-in-depth for management identities.
-- Deploy only together with js/admin-mfa-gate.js after testing enrollment.
-- Supabase Auth's signed JWT (aal2) is the authoritative second-factor proof.
-- No shared administrator password or client-side secret is introduced.

create or replace function public.sg_admin_mfa_verified()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

-- Admin policies may be composed with public/customer ownership policies;
-- replace ONLY the admin-specific branch instead of blocking ordinary users.
-- Existing ownership and public-shop policies remain untouched.
do $mfa_policies$
declare
  p record;
  policy_roles text;
  new_qual text;
  new_check text;
  statement text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (position('is_admin()' in coalesce(qual, '')) > 0
           or position('is_admin()' in coalesce(with_check, '')) > 0)
  loop
    select string_agg(case when role_name = 'public' then 'PUBLIC'
                           else format('%I', role_name) end, ', ')
      into policy_roles
    from unnest(p.roles) as role_name;

    new_qual := replace(p.qual, 'is_admin()', '(is_admin() and public.sg_admin_mfa_verified())');
    new_check := replace(p.with_check, 'is_admin()', '(is_admin() and public.sg_admin_mfa_verified())');

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);

    statement := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname, p.schemaname, p.tablename,
      p.permissive, p.cmd, policy_roles
    );

    if new_qual is not null then
      statement := statement || ' using (' || new_qual || ')';
    end if;
    if new_check is not null then
      statement := statement || ' with check (' || new_check || ')';
    end if;
    execute statement;
  end loop;
end;
$mfa_policies$;

-- RPCs use assert_admin() rather than the frontend guard. Enforce verified
-- MFA there as well, including for clients that call /rest/v1/rpc directly.
create or replace function public.assert_admin()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.sg_admin_mfa_verified() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
end;
$$;

-- Helper has no sensitive information and must be callable by an RLS policy
-- for every role subject to those policies.
grant execute on function public.sg_admin_mfa_verified() to anon, authenticated;
