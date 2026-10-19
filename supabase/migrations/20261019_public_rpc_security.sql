-- Street Goose 034 / Supabase / 2026-10-19
-- Applied to production in two guarded Supabase migrations:
--   harden_public_rpc_search_path_20261019
--   cap_public_ranking_null_limit_20261019
-- Archive for version control / reproducing the schema on a new environment.
-- Do not blindly replay over migration history: compare live state first.

begin;

-- All public RPC implementations below reference their relations and helper
-- functions by schema. A locked search_path prevents names in client
-- controllable schemas from being resolved with SECURITY DEFINER privileges.
-- EXECUTE grants and SECURITY DEFINER ownership are intentionally preserved:
-- public community/ranking/newsletter still need the existing endpoints.
alter function public.community_comments(uuid, integer, integer) set search_path = '';
alter function public.community_feed(text, integer, integer, uuid, uuid) set search_path = '';
alter function public.community_profile(uuid) set search_path = '';
alter function public.is_admin() set search_path = '';
alter function public.newsletter_subscribe(text, text) set search_path = '';

-- Retain the opt-in-only public ranking while capping p_limit even when a
-- caller explicitly passes NULL. PostgreSQL LIMIT NULL means unbounded.
create or replace function public.get_ranking(p_limit integer default 7)
returns table(user_id uuid, handle text, avatar_url text, level integer, total_xp bigint)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id as user_id,
         coalesce(p.public_handle,
                  nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''),
                  'Membro Street Goose') as handle,
         p.avatar_url,
         public.level_for_xp(coalesce(t.total_xp, 0)::integer) as level,
         coalesce(t.total_xp, 0)::bigint as total_xp
  from public.profiles p
  left join public.xp_totals t on t.user_id = p.id
  where p.ranking_opt_in = true
  order by coalesce(t.total_xp, 0) desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 7), 1), 50);
$function$;

commit;
