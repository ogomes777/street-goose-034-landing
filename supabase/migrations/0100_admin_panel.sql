-- Street Goose 034 — painel do lojista (/admin).
-- Quem é admin fica numa tabela própria, editável só por SQL (painel
-- Supabase ou CLI) — nenhuma tela do site concede/remove admin. Tudo que o
-- painel faz passa por is_admin(): RPCs security definer para o que junta
-- dados de várias tabelas ou tem regra de negócio (pedidos, clientes,
-- moderação) e policies de RLS para CRUD simples (cupons, recompensas,
-- newsletter). Usuário comum chama qualquer uma dessas e recebe 'forbidden'
-- ou zero linhas.
--
-- Tornar alguém admin (SQL editor):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'dono@exemplo.com';

-- ============================================================
-- ADMINS
-- ============================================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- sem policy: ninguém lê nem escreve pela API; só via SQL/service_role
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- uso interno das RPCs admin_* (rodam como dono da função, então não
-- precisam de grant para authenticated)
create or replace function public.assert_admin()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_admin() from public, anon, authenticated;

-- ============================================================
-- COLUNAS DE APOIO
-- ============================================================
alter table public.orders add column if not exists staff_note text;
alter table public.community_posts add column if not exists moderated_by uuid references auth.users(id) on delete set null;

-- ============================================================
-- RLS — CRUD simples direto pela API, só para admin
-- ============================================================
drop policy if exists "coupons: admin reads" on public.coupons;
drop policy if exists "coupons: admin inserts" on public.coupons;
drop policy if exists "coupons: admin updates" on public.coupons;
create policy "coupons: admin reads" on public.coupons
  for select using ((select public.is_admin()));
create policy "coupons: admin inserts" on public.coupons
  for insert with check ((select public.is_admin()));
create policy "coupons: admin updates" on public.coupons
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "rewards: admin reads all" on public.rewards;
drop policy if exists "rewards: admin inserts" on public.rewards;
drop policy if exists "rewards: admin updates" on public.rewards;
create policy "rewards: admin reads all" on public.rewards
  for select using ((select public.is_admin()));
create policy "rewards: admin inserts" on public.rewards
  for insert with check ((select public.is_admin()));
create policy "rewards: admin updates" on public.rewards
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "reward_redemptions: admin reads" on public.reward_redemptions;
create policy "reward_redemptions: admin reads" on public.reward_redemptions
  for select using ((select public.is_admin()));

drop policy if exists "newsletter_subscribers: admin reads" on public.newsletter_subscribers;
drop policy if exists "newsletter_subscribers: admin updates" on public.newsletter_subscribers;
create policy "newsletter_subscribers: admin reads" on public.newsletter_subscribers
  for select using ((select public.is_admin()));
create policy "newsletter_subscribers: admin updates" on public.newsletter_subscribers
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

-- fotos da comunidade: admin precisa ver as pendentes para moderar (URL
-- assinada é gerada com o JWT de quem pede, então depende de select aqui)
drop policy if exists "community bucket: admin reads all" on storage.objects;
create policy "community bucket: admin reads all" on storage.objects
  for select using (bucket_id = 'community' and (select public.is_admin()));

-- e foto aprovada precisa ser legível por qualquer visitante — sem isso o
-- feed público (CommunityService.getApprovedFeed) só conseguia assinar a
-- URL da própria foto de quem estava logado. Pendente/rejeitada continua
-- privada: a condição olha o status do post dono do arquivo.
drop policy if exists "community bucket: approved readable" on storage.objects;
create policy "community bucket: approved readable" on storage.objects
  for select using (
    bucket_id = 'community'
    and exists (
      select 1 from public.community_posts cp
       where cp.image_path = storage.objects.name and cp.status = 'approved'
    )
  );

-- ============================================================
-- VISÃO GERAL — números do topo do painel
-- ============================================================
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'orders_pending', (select count(*) from public.orders where status = 'pending_payment'),
    'orders_paid_30d', (select count(*) from public.orders where status in ('paid','fulfilled') and updated_at > now() - interval '30 days'),
    'revenue_30d_cents', (select coalesce(sum(total_cents), 0) from public.orders where status in ('paid','fulfilled') and updated_at > now() - interval '30 days'),
    'posts_pending', (select count(*) from public.community_posts where status = 'pending'),
    'customers', (select count(*) from auth.users),
    'newsletter_active', (select count(*) from public.newsletter_subscribers where unsubscribed_at is null)
  );
end;
$$;

-- ============================================================
-- PEDIDOS
-- ============================================================
create or replace function public.admin_list_orders(
  p_status text default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_result jsonb;
begin
  perform public.assert_admin();
  if v_search is not null then
    -- busca literal: % e _ digitados não viram curinga
    v_like := '%' || replace(replace(replace(lower(v_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select o.created_at,
           jsonb_build_object(
             'id', o.id,
             'short_id', upper(left(o.id::text, 8)),
             'status', o.status,
             'currency', o.currency,
             'subtotal_cents', o.subtotal_cents,
             'total_cents', o.total_cents,
             'coupon_code', o.coupon_code,
             'shipping_address', o.shipping_address,
             'payment_method', o.payment_method,
             'payment_provider_ref', o.payment_provider_ref,
             'staff_note', o.staff_note,
             'created_at', o.created_at,
             'updated_at', o.updated_at,
             'customer', jsonb_build_object('id', u.id, 'email', u.email, 'display_name', p.display_name),
             'items', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
                        'unit_price_cents', oi.unit_price_cents, 'qty', oi.qty) order by oi.product_name)
                 from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
           ) as row_data
      from public.orders o
      left join auth.users u on u.id = o.user_id
      left join public.profiles p on p.id = o.user_id
     where (p_status is null or o.status = p_status)
       and (v_like is null
            or lower(o.id::text) like v_like
            or lower(coalesce(u.email, '')) like v_like
            or lower(coalesce(p.display_name, '')) like v_like
            or lower(coalesce(o.shipping_address ->> 'name', '')) like v_like
            or lower(coalesce(o.shipping_address ->> 'phone', '')) like v_like)
     order by o.created_at desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500)
     offset greatest(coalesce(p_offset, 0), 0)
  ) s;

  return v_result;
end;
$$;

-- Atualiza preço dos itens, total, status e nota interna. Preço/total são
-- gravados antes do status, então o trigger award_xp_on_paid já calcula o
-- XP com o total confirmado. Pedido não vira 'paid' com total zerado (o
-- trigger daria o XP mínimo por um pedido sem preço).
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status text default null,
  p_item_prices jsonb default null, -- [{ "id": "<order_item id>", "unit_price_cents": 19700 }]
  p_total_cents integer default null,
  p_staff_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_price integer;
  v_subtotal integer;
  v_total integer;
begin
  perform public.assert_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if p_status is not null and p_status not in ('pending_payment','paid','fulfilled','cancelled','refunded') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if p_total_cents is not null and p_total_cents < 0 then
    raise exception 'invalid_total' using errcode = '22023';
  end if;

  if p_item_prices is not null then
    if jsonb_typeof(p_item_prices) <> 'array' then
      raise exception 'invalid_items' using errcode = '22023';
    end if;
    for v_item in select * from jsonb_array_elements(p_item_prices) loop
      v_price := (v_item ->> 'unit_price_cents')::integer;
      if v_price is null or v_price < 0 then
        raise exception 'invalid_price' using errcode = '22023';
      end if;
      update public.order_items
         set unit_price_cents = v_price
       where id = (v_item ->> 'id')::uuid and order_id = p_order_id;
    end loop;
  end if;

  select coalesce(sum(unit_price_cents * qty), 0) into v_subtotal
    from public.order_items where order_id = p_order_id;

  v_total := case
    when p_total_cents is not null then p_total_cents
    when p_item_prices is not null then v_subtotal
    else v_order.total_cents
  end;

  update public.orders
     set subtotal_cents = v_subtotal,
         total_cents = v_total,
         staff_note = case when p_staff_note is null then staff_note else nullif(trim(p_staff_note), '') end,
         updated_at = now()
   where id = p_order_id;

  if p_status is not null and p_status <> v_order.status then
    if p_status in ('paid','fulfilled') and v_total <= 0 then
      raise exception 'total_required' using errcode = '22023';
    end if;
    update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  end if;

  return (select to_jsonb(o) from public.orders o where o.id = p_order_id);
end;
$$;

-- ============================================================
-- CLIENTES
-- ============================================================
create or replace function public.admin_list_customers(
  p_search text default null,
  p_limit integer default 200,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_result jsonb;
begin
  perform public.assert_admin();
  if v_search is not null then
    v_like := '%' || replace(replace(replace(lower(v_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select u.created_at,
           jsonb_build_object(
             'id', u.id,
             'email', u.email,
             'display_name', p.display_name,
             'public_handle', p.public_handle,
             'ranking_opt_in', coalesce(p.ranking_opt_in, false),
             'created_at', u.created_at,
             'last_sign_in_at', u.last_sign_in_at,
             'order_count', (select count(*) from public.orders o where o.user_id = u.id),
             'paid_order_count', (select count(*) from public.orders o where o.user_id = u.id and o.status in ('paid','fulfilled')),
             'total_spent_cents', (select coalesce(sum(o.total_cents), 0) from public.orders o where o.user_id = u.id and o.status in ('paid','fulfilled')),
             'total_xp', x.total_xp,
             'level', public.level_for_xp(x.total_xp),
             'is_admin', exists (select 1 from public.admins a where a.user_id = u.id),
             'newsletter', exists (select 1 from public.newsletter_subscribers n where n.email = lower(u.email) and n.unsubscribed_at is null)
           ) as row_data
      from auth.users u
      left join public.profiles p on p.id = u.id
      cross join lateral (
        select coalesce(sum(amount), 0)::integer as total_xp from public.xp_ledger l where l.user_id = u.id
      ) x
     where v_like is null
        or lower(coalesce(u.email, '')) like v_like
        or lower(coalesce(p.display_name, '')) like v_like
        or lower(coalesce(p.public_handle, '')) like v_like
     order by u.created_at desc
     limit least(greatest(coalesce(p_limit, 200), 1), 1000)
     offset greatest(coalesce(p_offset, 0), 0)
  ) s;

  return v_result;
end;
$$;

-- ============================================================
-- COMUNIDADE — moderação
-- ============================================================
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
             'caption', cp.caption,
             'product_id', cp.product_id,
             'rating', cp.rating,
             'status', cp.status,
             'rejection_reason', cp.rejection_reason,
             'created_at', cp.created_at,
             'moderated_at', cp.moderated_at,
             'author', jsonb_build_object('id', u.id, 'email', u.email, 'display_name', p.display_name, 'public_handle', p.public_handle)
           ) as row_data
      from public.community_posts cp
      left join auth.users u on u.id = cp.user_id
      left join public.profiles p on p.id = cp.user_id
     where p_status is null or cp.status = p_status
     order by cp.created_at desc
     limit least(greatest(coalesce(p_limit, 60), 1), 200)
     offset greatest(coalesce(p_offset, 0), 0)
  ) s;
  return v_result;
end;
$$;

-- aprovar dispara award_xp_on_post_approved (migration 0002)
create or replace function public.admin_moderate_post(
  p_post_id uuid,
  p_status text,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row public.community_posts%rowtype;
begin
  perform public.assert_admin();
  if p_status not in ('approved','rejected','pending') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if p_status = 'rejected' and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  update public.community_posts
     set status = p_status,
         rejection_reason = case when p_status = 'rejected' then left(trim(p_reason), 500) else null end,
         moderated_at = case when p_status = 'pending' then null else now() end,
         moderated_by = case when p_status = 'pending' then null else auth.uid() end
   where id = p_post_id
  returning * into v_row;

  if not found then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  return to_jsonb(v_row);
end;
$$;

-- ============================================================
-- GRANTS — Supabase dá execute em função nova para anon por padrão;
-- admin_* só para logado, e mesmo assim barradas por assert_admin()
-- ============================================================
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_list_orders(text, text, integer, integer) from public, anon;
revoke all on function public.admin_update_order(uuid, text, jsonb, integer, text) from public, anon;
revoke all on function public.admin_list_customers(text, integer, integer) from public, anon;
revoke all on function public.admin_list_community_posts(text, integer, integer) from public, anon;
revoke all on function public.admin_moderate_post(uuid, text, text) from public, anon;

grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_orders(text, text, integer, integer) to authenticated;
grant execute on function public.admin_update_order(uuid, text, jsonb, integer, text) to authenticated;
grant execute on function public.admin_list_customers(text, integer, integer) to authenticated;
grant execute on function public.admin_list_community_posts(text, integer, integer) to authenticated;
grant execute on function public.admin_moderate_post(uuid, text, text) to authenticated;
