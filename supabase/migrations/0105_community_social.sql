-- Street Goose 034 — SG Community como rede social da marca.
-- * Curtidas reais (uma por pessoa, contadas no servidor).
-- * Destaque escolhido pelo lojista (abre o mural da home).
-- * Proporção da foto gravada no envio: o mural monta sem pulo de layout.
-- * community_feed(): feed público só com posts aprovados, autor exibido
--   como @apelido ou primeiro nome (mesma regra do ranking), nível, peça
--   marcada, curtidas e se quem está vendo já curtiu.
-- * Legenda saneada no servidor (defesa além do escape no site) e destaque
--   cai sozinho se o post sair do ar.

alter table public.community_posts
  add column if not exists featured boolean not null default false,
  add column if not exists like_count integer not null default 0,
  add column if not exists image_width integer,
  add column if not exists image_height integer;
alter table public.community_posts
  drop constraint if exists community_posts_image_dims_check,
  add constraint community_posts_image_dims_check check (
    (image_width is null or image_width between 1 and 20000)
    and (image_height is null or image_height between 1 and 20000));

-- quem publica informa a proporção; destaque e curtidas continuam fora do
-- alcance do cliente (sem grant nessas colunas)
grant insert (image_width, image_height) on public.community_posts to authenticated;

create index if not exists community_posts_feed_idx on public.community_posts (status, created_at desc);

-- security definer: sg_clean_text (0010) não é executável por cliente
create or replace function public.community_posts_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- sem marcação nem caractere de controle; quebra de linha fica (no
  -- máximo uma linha em branco seguida)
  new.caption := nullif(btrim(regexp_replace(
                   regexp_replace(coalesce(new.caption, ''), E'[<>\\x01-\\x09\\x0b-\\x1f\\x7f]', '', 'g'),
                   E'\\n{3,}', E'\n\n', 'g')), '');
  new.product_id := public.sg_clean_text(new.product_id, 120);
  if new.status <> 'approved' then
    new.featured := false;
  end if;
  return new;
end;
$$;
revoke all on function public.community_posts_guard() from public, anon, authenticated;

drop trigger if exists community_posts_guard on public.community_posts;
create trigger community_posts_guard
  before insert or update of caption, product_id, status, featured on public.community_posts
  for each row execute function public.community_posts_guard();

-- ============================================================
-- CURTIDAS — só pelas funções (nenhum grant direto na tabela)
-- ============================================================
create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_likes_user_idx on public.community_likes (user_id);
alter table public.community_likes enable row level security;
revoke all on public.community_likes from anon, authenticated;

create or replace function public.community_toggle_like(p_post_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if not exists (select 1 from public.community_posts where id = p_post_id and status = 'approved') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not public.sg_rate_ok('like', v_me::text, 120, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  delete from public.community_likes where post_id = p_post_id and user_id = v_me;
  if found then
    v_liked := false;
  else
    insert into public.community_likes (post_id, user_id) values (p_post_id, v_me) on conflict do nothing;
    v_liked := true;
  end if;

  update public.community_posts
     set like_count = (select count(*) from public.community_likes where post_id = p_post_id)
   where id = p_post_id
  returning like_count into v_count;

  return jsonb_build_object('ok', true, 'liked', v_liked, 'like_count', v_count);
end;
$$;

revoke all on function public.community_toggle_like(uuid) from public, anon;
grant execute on function public.community_toggle_like(uuid) to authenticated;

-- ============================================================
-- FEED PÚBLICO
--   p_sort: 'recent' | 'top' (mais curtidas) | 'home' (destaques primeiro)
--   p_post_id: um post só (link compartilhado)  p_author: posts de alguém
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

-- ============================================================
-- PAINEL — destaque + listagem com curtidas/proporção
-- ============================================================
create or replace function public.admin_feature_post(p_post_id uuid, p_featured boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  perform public.assert_admin();
  select status into v_status from public.community_posts where id = p_post_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(p_featured, false) and v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'reason', 'not_approved');
  end if;
  update public.community_posts set featured = coalesce(p_featured, false) where id = p_post_id;
  return jsonb_build_object('ok', true, 'featured', coalesce(p_featured, false));
end;
$$;

revoke all on function public.admin_feature_post(uuid, boolean) from public, anon;
grant execute on function public.admin_feature_post(uuid, boolean) to authenticated;

create or replace function public.admin_list_community_posts(
  p_status text default 'pending',
  p_limit integer default 60,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select cp.created_at,
           jsonb_build_object(
             'id', cp.id,
             'image_path', cp.image_path,
             'image_width', cp.image_width,
             'image_height', cp.image_height,
             'caption', cp.caption,
             'product_id', cp.product_id,
             'rating', cp.rating,
             'status', cp.status,
             'featured', cp.featured,
             'like_count', cp.like_count,
             'rejection_reason', cp.rejection_reason,
             'created_at', cp.created_at,
             'moderated_at', cp.moderated_at,
             'author', jsonb_build_object('id', u.id, 'email', u.email, 'display_name', p.display_name, 'public_handle', p.public_handle)
           ) as row_data
      from public.community_posts cp
      left join auth.users u on u.id = cp.user_id
      left join public.profiles p on p.id = cp.user_id
     where p_status is null
        or (p_status = 'featured' and cp.featured)
        or cp.status = p_status
     order by cp.created_at desc
     limit least(greatest(coalesce(p_limit, 60), 1), 200)
     offset greatest(coalesce(p_offset, 0), 0)
  ) s;
  return v_result;
end;
$$;
