-- Street Goose 034 — SG Community: comentários + perfil público.
-- * Comentários só em post aprovado e só por quem está logado; texto saneado
--   no servidor (mesma regra da legenda) e com limite de ritmo.
-- * Apagar comentário: quem escreveu, o dono do post ou um admin.
-- * comment_count no post (contado no servidor) e no community_feed.
-- * community_profile(): cabeçalho do perfil público (nome pela mesma regra
--   do feed, nível, visuais no ar, curtidas recebidas) — só de quem tem
--   visual no ar, ou de você mesmo.
-- Nenhum grant direto na tabela nova: tudo passa pelas funções.

alter table public.community_posts
  add column if not exists comment_count integer not null default 0;

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_user_idx on public.community_comments (user_id);
alter table public.community_comments enable row level security;
revoke all on public.community_comments from anon, authenticated;

-- autor como aparece em público (mesma regra do community_feed). Interna:
-- sem grant, para ninguém listar nomes por id fora das funções abaixo.
create or replace function public.community_author(p_user uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', u.uid,
    'name', coalesce('@' || p.public_handle,
                     nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''),
                     'Membro Street Goose'),
    'avatar_url', p.avatar_url,
    'level', public.level_for_xp(coalesce(t.total_xp, 0)::integer),
    'level_name', (select lv.name from public.levels lv
                    where lv.level_number = public.level_for_xp(coalesce(t.total_xp, 0)::integer)))
  from (select p_user as uid) u
  left join public.profiles p on p.id = u.uid
  left join public.xp_totals t on t.user_id = u.uid;
$$;
revoke all on function public.community_author(uuid) from public, anon, authenticated;

-- ============================================================
-- COMENTÁRIOS
-- ============================================================
create or replace function public.community_comments(
  p_post_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_admin boolean := v_me is not null and public.is_admin();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_items jsonb;
  v_total integer;
begin
  select user_id into v_owner from public.community_posts where id = p_post_id and status = 'approved';
  if v_owner is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select count(*) into v_total from public.community_comments where post_id = p_post_id;

  select coalesce(jsonb_agg(x.j order by x.created_at, x.id), '[]'::jsonb) into v_items
  from (
    select c.id, c.created_at,
           jsonb_build_object(
             'id', c.id,
             'body', c.body,
             'created_at', c.created_at,
             'mine', v_me is not null and c.user_id = v_me,
             'can_delete', v_me is not null and (c.user_id = v_me or v_owner = v_me or v_admin),
             'author', public.community_author(c.user_id)) as j
      from public.community_comments c
     where c.post_id = p_post_id
     order by c.created_at, c.id
     limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('ok', true, 'items', v_items, 'total', v_total);
end;
$$;
revoke all on function public.community_comments(uuid, integer, integer) from public;
grant execute on function public.community_comments(uuid, integer, integer) to anon, authenticated;

create or replace function public.community_add_comment(p_post_id uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_body text;
  v_id uuid;
  v_created timestamptz;
  v_count integer;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and status = 'approved') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  -- sem marcação nem caractere de controle; no máximo uma quebra de linha seguida
  v_body := nullif(btrim(regexp_replace(
              regexp_replace(coalesce(p_body, ''), E'[<>\\x01-\\x09\\x0b-\\x1f\\x7f]', '', 'g'),
              E'\\n{2,}', E'\n', 'g')), '');
  if v_body is null then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  if char_length(v_body) > 400 then
    return jsonb_build_object('ok', false, 'reason', 'too_long');
  end if;
  if not public.sg_rate_ok('comment', v_me::text, 20, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.community_comments (post_id, user_id, body)
  values (p_post_id, v_me, v_body)
  returning id, created_at into v_id, v_created;

  update public.community_posts
     set comment_count = (select count(*) from public.community_comments where post_id = p_post_id)
   where id = p_post_id
  returning comment_count into v_count;

  return jsonb_build_object('ok', true, 'comment_count', v_count, 'comment', jsonb_build_object(
    'id', v_id,
    'body', v_body,
    'created_at', v_created,
    'mine', true,
    'can_delete', true,
    'author', public.community_author(v_me)));
end;
$$;
revoke all on function public.community_add_comment(uuid, text) from public, anon;
grant execute on function public.community_add_comment(uuid, text) to authenticated;

create or replace function public.community_delete_comment(p_comment_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_post uuid;
  v_author uuid;
  v_owner uuid;
  v_count integer;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  select c.post_id, c.user_id, cp.user_id into v_post, v_author, v_owner
    from public.community_comments c
    join public.community_posts cp on cp.id = c.post_id
   where c.id = p_comment_id;
  if v_post is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not (v_author = v_me or v_owner = v_me or public.is_admin()) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  delete from public.community_comments where id = p_comment_id;
  update public.community_posts
     set comment_count = (select count(*) from public.community_comments where post_id = v_post)
   where id = v_post
  returning comment_count into v_count;

  return jsonb_build_object('ok', true, 'comment_count', coalesce(v_count, 0));
end;
$$;
revoke all on function public.community_delete_comment(uuid) from public, anon;
grant execute on function public.community_delete_comment(uuid) to authenticated;

-- ============================================================
-- PERFIL PÚBLICO
-- ============================================================
create or replace function public.community_profile(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_posts integer;
  v_likes integer;
  v_since timestamptz;
begin
  if p_user is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select count(*), coalesce(sum(like_count), 0), min(created_at)
    into v_posts, v_likes, v_since
    from public.community_posts
   where user_id = p_user and status = 'approved';
  if v_posts = 0 and (v_me is null or v_me <> p_user) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'profile', public.community_author(p_user) || jsonb_build_object(
    'posts', v_posts,
    'likes', v_likes,
    'since', v_since,
    'me', v_me is not null and v_me = p_user));
end;
$$;
revoke all on function public.community_profile(uuid) from public;
grant execute on function public.community_profile(uuid) to anon, authenticated;

-- ============================================================
-- FEED PÚBLICO — igual à 0105, agora com comment_count
-- ============================================================
create or replace function public.community_feed(
  p_sort text default 'recent',
  p_limit integer default 24,
  p_offset integer default 0,
  p_post_id uuid default null,
  p_author uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_items jsonb;
  v_stats jsonb;
begin
  select coalesce(jsonb_agg(x.row_data order by x.ord), '[]'::jsonb) into v_items
  from (
    select row_number() over (order by
               (case when p_sort = 'top' then cp.like_count else 0 end) desc,
               (case when p_sort = 'home' then cp.featured::int else 0 end) desc,
               cp.created_at desc, cp.id) as ord,
           jsonb_build_object(
             'id', cp.id,
             'image_path', cp.image_path,
             'image_width', cp.image_width,
             'image_height', cp.image_height,
             'caption', cp.caption,
             'product_id', cp.product_id,
             'created_at', cp.created_at,
             'featured', cp.featured,
             'like_count', cp.like_count,
             'comment_count', cp.comment_count,
             'liked', v_me is not null and exists (
               select 1 from public.community_likes l where l.post_id = cp.id and l.user_id = v_me),
             'mine', v_me is not null and cp.user_id = v_me,
             'author', jsonb_build_object(
               'id', cp.user_id,
               'name', coalesce('@' || p.public_handle,
                                nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''),
                                'Membro Street Goose'),
               'avatar_url', p.avatar_url,
               'level', public.level_for_xp(coalesce(t.total_xp, 0)::integer),
               'level_name', (select lv.name from public.levels lv
                               where lv.level_number = public.level_for_xp(coalesce(t.total_xp, 0)::integer)))
           ) as row_data
      from public.community_posts cp
      left join public.profiles p on p.id = cp.user_id
      left join public.xp_totals t on t.user_id = cp.user_id
     where cp.status = 'approved'
       and (p_post_id is null or cp.id = p_post_id)
       and (p_author is null or cp.user_id = p_author)
  ) x
  where x.ord > v_offset and x.ord <= v_offset + v_limit;

  select jsonb_build_object(
           'posts', count(*),
           'members', count(distinct user_id),
           'likes', coalesce(sum(like_count), 0))
    into v_stats
    from public.community_posts
   where status = 'approved';

  return jsonb_build_object('items', v_items, 'stats', v_stats);
end;
$$;

revoke all on function public.community_feed(text, integer, integer, uuid, uuid) from public;
grant execute on function public.community_feed(text, integer, integer, uuid, uuid) to anon, authenticated;
