-- Street Goose 034 — lógica de servidor (RPCs security definer).
-- Tudo que mexe em pedido, XP e resgate passa por aqui: o cliente só chama
-- a função, nunca escreve direto nessas tabelas. Não precisa de Edge
-- Function nem de service_role no navegador.

-- ============================================================
-- PEDIDO VIA WHATSAPP — registra o pedido (preço a confirmar no atendimento)
-- e devolve o id para entrar na mensagem do WhatsApp.
-- ============================================================
create or replace function public.create_whatsapp_order(
  p_items jsonb,
  p_shipping jsonb,
  p_idempotency_key text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_qty integer;
begin
  if v_user is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;

  -- idempotência: mesmo clique duplicado devolve o mesmo pedido
  select id into v_order from public.orders
   where idempotency_key = p_idempotency_key and user_id = v_user;
  if v_order is not null then
    return v_order;
  end if;

  insert into public.orders (user_id, status, subtotal_cents, total_cents, shipping_address, payment_method, idempotency_key)
  values (v_user, 'pending_payment', 0, 0, coalesce(p_shipping, '{}'::jsonb), 'whatsapp', p_idempotency_key)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(20, coalesce((v_item ->> 'qty')::integer, 1)));
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, qty)
    values (
      v_order,
      left(coalesce(v_item ->> 'product_id', 'unknown'), 120),
      left(coalesce(v_item ->> 'product_name', 'Produto'), 200),
      0, -- preço confirmado pelo atendimento; nunca aceito do cliente
      v_qty
    );
  end loop;

  return v_order;
end;
$$;

revoke all on function public.create_whatsapp_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.create_whatsapp_order(jsonb, jsonb, text) to authenticated;

-- ============================================================
-- XP AUTOMÁTICO — pedido virou 'paid' (marcado no painel/admin) => XP
-- 1 XP por R$1, mínimo 50. Unique evita conceder duas vezes.
-- ============================================================
create unique index if not exists xp_ledger_unique_ref
  on public.xp_ledger (user_id, reason, ref_id) where ref_id is not null;

create or replace function public.award_xp_on_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    insert into public.xp_ledger (user_id, amount, reason, ref_type, ref_id)
    values (new.user_id, greatest(50, new.total_cents / 100), 'order_paid', 'order', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_award_xp on public.orders;
create trigger orders_award_xp
  after update of status on public.orders
  for each row execute function public.award_xp_on_paid();

-- XP por post aprovado na comunidade
create or replace function public.award_xp_on_post_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    insert into public.xp_ledger (user_id, amount, reason, ref_type, ref_id)
    values (new.user_id, 30, 'community_post_approved', 'community_post', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists community_posts_award_xp on public.community_posts;
create trigger community_posts_award_xp
  after update of status on public.community_posts
  for each row execute function public.award_xp_on_post_approved();

-- ============================================================
-- NÍVEL ATUAL (helper)
-- ============================================================
create or replace function public.level_for_xp(p_xp integer)
returns integer language sql stable set search_path = public as $$
  select coalesce(max(level_number), 1) from public.levels where xp_required <= p_xp;
$$;

-- ============================================================
-- RANKING — a view xp_totals não tem FK para profiles, então o embed do
-- PostgREST não funciona. Função devolve só quem deu opt-in.
-- ============================================================
create or replace function public.get_ranking(p_limit integer default 7)
returns table (user_id uuid, handle text, avatar_url text, level integer, total_xp bigint)
language sql stable security definer set search_path = public as $$
  select t.user_id,
         coalesce(p.public_handle, p.display_name, 'Membro Street Goose') as handle,
         p.avatar_url,
         public.level_for_xp(t.total_xp::integer) as level,
         t.total_xp
    from public.xp_totals t
    join public.profiles p on p.id = t.user_id
   where p.ranking_opt_in = true
   order by t.total_xp desc
   limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.get_ranking(integer) to anon, authenticated;

-- xp_totals é view comum (roda com permissão de quem consulta) — garante
-- que o usuário só vê o próprio total pela RLS do ledger.
alter view public.xp_totals set (security_invoker = true);

-- ============================================================
-- RESGATE DE RECOMPENSA — valida nível e uso único no servidor
-- ============================================================
create or replace function public.redeem_reward(p_reward_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_reward public.rewards%rowtype;
  v_xp integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  select * into v_reward from public.rewards where id = p_reward_id and active = true;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select coalesce(sum(amount), 0) into v_xp from public.xp_ledger where user_id = v_user;
  if v_reward.requirement_level is not null and public.level_for_xp(v_xp) < v_reward.requirement_level then
    return jsonb_build_object('ok', false, 'reason', 'level_too_low');
  end if;
  begin
    insert into public.reward_redemptions (user_id, reward_id) values (v_user, p_reward_id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  end;
  return jsonb_build_object('ok', true, 'coupon_code', v_reward.coupon_code);
end;
$$;

revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- ============================================================
-- CUPOM — valida sem expor a lista de códigos
-- ============================================================
create or replace function public.validate_coupon(p_code text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('ok', true, 'code', code, 'discount_percent', discount_percent, 'discount_cents', discount_cents)
       from public.coupons
      where upper(code) = upper(trim(p_code))
        and active
        and valid_from <= now()
        and (valid_until is null or valid_until > now())
        and (max_uses is null or uses_count < max_uses)),
    jsonb_build_object('ok', false, 'reason', 'invalid'));
$$;

grant execute on function public.validate_coupon(text) to authenticated;

-- ============================================================
-- NEWSLETTER — RPC idempotente (reinscrição limpa unsubscribed_at)
-- ============================================================
create or replace function public.newsletter_subscribe(p_email text, p_locale text default 'pt-BR')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_email) > 254 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;
  insert into public.newsletter_subscribers (email, locale)
  values (v_email, case when p_locale in ('pt-BR','en','es') then p_locale else 'pt-BR' end)
  on conflict (email) do update set unsubscribed_at = null;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;
