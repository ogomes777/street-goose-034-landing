-- New accounts participate automatically; existing preferences are preserved.
alter table public.profiles alter column ranking_opt_in set default true;

-- Intentional SECURITY DEFINER: exposes only the public ranking fields of participants,
-- never emails, auth metadata, orders or private profiles. Explicit role grants.
create or replace function public.get_ranking_page(p_offset integer default 0, p_limit integer default 25)
returns jsonb language sql stable security definer set search_path = '' as $$
  with ranked as (
    select p.id as user_id,
           coalesce(nullif(p.public_handle, ''), 'goose.' || left(replace(p.id::text, '-', ''), 8)) as handle,
           p.avatar_url,
           public.level_for_xp(coalesce(t.total_xp, 0)::integer) as level,
           coalesce(t.total_xp, 0)::bigint as total_xp,
           row_number() over(order by coalesce(t.total_xp, 0) desc, p.created_at asc, p.id asc) as position
    from public.profiles p left join public.xp_totals t on t.user_id = p.id
    where p.ranking_opt_in = true
  ), page as (
    select user_id, handle, avatar_url, level, total_xp, position from ranked
    order by position limit least(greatest(coalesce(p_limit,25),1),50)
    offset greatest(coalesce(p_offset,0),0)
  )
  select jsonb_build_object('total', (select count(*) from ranked),
    'rows', coalesce((select jsonb_agg(to_jsonb(page) - 'position' order by position) from page), '[]'::jsonb));
$$;
revoke all on function public.get_ranking_page(integer, integer) from public;
grant execute on function public.get_ranking_page(integer, integer) to anon, authenticated;

-- Same tie-breaker as the public list, including 0 XP participants.
create or replace function public.my_ranking()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_xp integer; v_opt boolean; v_handle text; v_pos bigint; v_total bigint;
begin
  if v_user is null then return jsonb_build_object('ok',false,'reason','auth_required'); end if;
  select coalesce(total_xp,0)::integer into v_xp from public.xp_totals where user_id=v_user;
  v_xp := coalesce(v_xp,0);
  select ranking_opt_in, public_handle into v_opt,v_handle from public.profiles where id=v_user;
  with ranked as (
    select p.id,row_number() over(order by coalesce(t.total_xp,0) desc,p.created_at asc,p.id asc) as pos
    from public.profiles p left join public.xp_totals t on t.user_id=p.id where p.ranking_opt_in=true
  ) select count(*),max(pos) filter(where id=v_user) into v_total,v_pos from ranked;
  return jsonb_build_object('ok',true,'opted_in',coalesce(v_opt,false),'handle',v_handle,
    'total_xp',v_xp,'level',public.level_for_xp(v_xp),'position',v_pos,'participants',v_total);
end;
$$;
revoke all on function public.my_ranking() from public,anon;
grant execute on function public.my_ranking() to authenticated;
