-- Street Goose 034 — cupom de verdade no checkout + ranking com opt-in.
-- * Uma regra só de cupom (coupon_check), usada pela prévia do checkout
--   (validate_coupon) e pela criação do pedido (create_whatsapp_order):
--   ativo, dentro da validade, limite total, limite por cliente e — se o
--   código é entregue por uma recompensa — só para quem resgatou ela (o
--   código de recompensa é visível na leitura pública de rewards).
-- * create_whatsapp_order ganha p_coupon: desconto calculado e gravado no
--   servidor, uso contado de forma atômica. Cupom que deixou de valer entre
--   a prévia e o pedido simplesmente não é aplicado (o pedido sai sem ele).
-- * Ranking: quem entra sem apelido aparece só com o primeiro nome (e
--   aparece já com 0 XP);
--   my_ranking() devolve a posição do cliente logado.

alter table public.coupons add column if not exists per_customer_limit integer;
alter table public.coupons
  drop constraint if exists coupons_per_customer_limit_check,
  add constraint coupons_per_customer_limit_check check (per_customer_limit is null or per_customer_limit >= 1);
-- painel do lojista (RLS de admin da 0100 continua filtrando)
grant insert (per_customer_limit), update (per_customer_limit) on public.coupons to authenticated;

create or replace function public.coupon_check(p_code text, p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  v_used integer;
begin
  select * into c from public.coupons where upper(code) = upper(btrim(coalesce(p_code, '')));
  if not found or not c.active then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if c.valid_from > now() then
    return jsonb_build_object('ok', false, 'reason', 'not_started');
  end if;
  if c.valid_until is not null and c.valid_until <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if c.max_uses is not null and c.uses_count >= c.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;
  if exists (select 1 from public.rewards r where upper(r.coupon_code) = upper(c.code))
     and not exists (
       select 1 from public.reward_redemptions rr
         join public.rewards r on r.id = rr.reward_id
        where rr.user_id = p_user and upper(r.coupon_code) = upper(c.code)) then
    return jsonb_build_object('ok', false, 'reason', 'reward_only');
  end if;
  if c.per_customer_limit is not null then
    select count(*) into v_used from public.orders
     where user_id = p_user and upper(coupon_code) = upper(c.code) and status not in ('cancelled','refunded');
    if v_used >= c.per_customer_limit then
      return jsonb_build_object('ok', false, 'reason', 'already_used');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'discount_percent', c.discount_percent, 'discount_cents', c.discount_cents);
end;
$$;

revoke all on function public.coupon_check(text, uuid) from public, anon, authenticated;

-- prévia no checkout: mesma regra, logado e com limite de tentativas (0010)
create or replace function public.validate_coupon(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if not public.sg_rate_ok('coupon', auth.uid()::text, 10, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  return public.coupon_check(p_code, auth.uid());
end;
$$;

revoke all on function public.validate_coupon(text) from public, anon;
grant execute on function public.validate_coupon(text) to authenticated;

-- ============================================================
-- PEDIDO PELO SITE — mesma lógica da 0010 + cupom. A assinatura muda (4º
-- parâmetro opcional), então a de 3 parâmetros sai para o PostgREST não
-- ficar em dúvida entre as duas.
-- ============================================================
drop function if exists public.create_whatsapp_order(jsonb, jsonb, text);

create or replace function public.create_whatsapp_order(
  p_items jsonb,
  p_shipping jsonb,
  p_idempotency_key text,
  p_coupon text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_qty integer;
  v_pid text;
  v_price integer;
  v_total integer := 0;
  v_ship jsonb := '{}'::jsonb;
  v_field text;
  v_check jsonb;
  v_code text;
  v_discount integer;
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
  if p_idempotency_key is null or length(p_idempotency_key) > 100 then
    raise exception 'bad_idempotency_key' using errcode = '22023';
  end if;

  select id into v_order from public.orders
   where idempotency_key = p_idempotency_key and user_id = v_user;
  if v_order is not null then
    return v_order;
  end if;

  if not public.sg_rate_ok('order', v_user::text, 10, interval '1 hour') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  if jsonb_typeof(p_shipping) = 'object' then
    foreach v_field in array array['name','email','phone','cep','street','number','complement','neighborhood','city','state'] loop
      v_ship := v_ship || jsonb_build_object(v_field, coalesce(public.sg_clean_text(p_shipping ->> v_field, 160), ''));
    end loop;
  end if;

  insert into public.orders (user_id, status, subtotal_cents, total_cents, shipping_address, payment_method, idempotency_key)
  values (v_user, 'pending_payment', 0, 0, v_ship, 'whatsapp', p_idempotency_key)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(20, coalesce((v_item ->> 'qty')::integer, 1)));
    v_pid := coalesce(public.sg_clean_text(v_item ->> 'product_id', 120), 'unknown');
    select price_cents into v_price from public.product_prices where product_id = v_pid;
    v_price := coalesce(v_price, 0);
    v_total := v_total + v_price * v_qty;
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, qty)
    values (v_order, v_pid, coalesce(public.sg_clean_text(v_item ->> 'product_name', 200), 'Produto'), v_price, v_qty);
  end loop;

  update public.orders set subtotal_cents = v_total, total_cents = v_total where id = v_order;

  -- cupom: desconto só sobre o que tem preço; uso contado só se ainda couber
  if nullif(btrim(coalesce(p_coupon, '')), '') is not null and v_total > 0 then
    v_check := public.coupon_check(p_coupon, v_user);
    if (v_check ->> 'ok')::boolean then
      update public.coupons set uses_count = uses_count + 1
       where code = v_check ->> 'code' and (max_uses is null or uses_count < max_uses)
      returning code into v_code;
      if v_code is not null then
        v_discount := case
          when v_check ->> 'discount_percent' is not null then round(v_total * (v_check ->> 'discount_percent')::numeric / 100)::integer
          else least(v_total, coalesce((v_check ->> 'discount_cents')::integer, 0))
        end;
        update public.orders
           set coupon_code = v_code, discount_cents = v_discount, total_cents = greatest(0, v_total - v_discount)
         where id = v_order;
      end if;
    end if;
  end if;

  return v_order;
end;
$$;

revoke all on function public.create_whatsapp_order(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.create_whatsapp_order(jsonb, jsonb, text, text) to authenticated;

-- ============================================================
-- RANKING — sem apelido, só o primeiro nome (não o nome completo do Google)
-- ============================================================
create or replace function public.get_ranking(p_limit integer default 7)
returns table (user_id uuid, handle text, avatar_url text, level integer, total_xp bigint)
language sql stable security definer set search_path = public as $$
  -- quem ativou aparece mesmo antes do primeiro XP (com 0, no fim)
  select p.id as user_id,
         coalesce(p.public_handle, nullif(split_part(btrim(coalesce(p.display_name, '')), ' ', 1), ''), 'Membro Street Goose') as handle,
         p.avatar_url,
         public.level_for_xp(coalesce(t.total_xp, 0)::integer) as level,
         coalesce(t.total_xp, 0)::bigint as total_xp
    from public.profiles p
    left join public.xp_totals t on t.user_id = p.id
   where p.ranking_opt_in = true
   order by coalesce(t.total_xp, 0) desc, p.created_at asc
   limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.my_ranking()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_xp integer;
  v_opt boolean;
  v_handle text;
  v_pos integer;
  v_total integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  select coalesce(sum(amount), 0) into v_xp from public.xp_ledger where user_id = v_user;
  select ranking_opt_in, public_handle into v_opt, v_handle from public.profiles where id = v_user;
  select count(*) into v_total from public.profiles where ranking_opt_in;
  if coalesce(v_opt, false) then
    select 1 + count(*) into v_pos
      from (select p.id, coalesce((select sum(l.amount) from public.xp_ledger l where l.user_id = p.id), 0) as xp
              from public.profiles p where p.ranking_opt_in and p.id <> v_user) s
     where s.xp > v_xp;
  end if;
  return jsonb_build_object('ok', true, 'opted_in', coalesce(v_opt, false), 'handle', v_handle,
                            'total_xp', v_xp, 'level', public.level_for_xp(v_xp), 'position', v_pos, 'participants', v_total);
end;
$$;

revoke all on function public.my_ranking() from public, anon;
grant execute on function public.my_ranking() to authenticated;

-- entrar/sair do ranking com apelido: formato da 0010 e apelido único sem
-- diferenciar maiúsculas; resposta como dado (o site mostra a mensagem)
create or replace function public.set_my_ranking(p_opt_in boolean, p_handle text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_handle text := nullif(btrim(coalesce(p_handle, '')), '');
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;
  if v_handle is not null and v_handle !~ '^[A-Za-z0-9_.]{3,24}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_handle');
  end if;
  if v_handle is not null and exists (
    select 1 from public.profiles where lower(public_handle) = lower(v_handle) and id <> v_user
  ) then
    return jsonb_build_object('ok', false, 'reason', 'handle_taken');
  end if;
  update public.profiles
     set ranking_opt_in = coalesce(p_opt_in, false), public_handle = v_handle, updated_at = now()
   where id = v_user;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_my_ranking(boolean, text) from public, anon;
grant execute on function public.set_my_ranking(boolean, text) to authenticated;
