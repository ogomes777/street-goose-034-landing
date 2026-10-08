-- Street Goose 034 — endurecimento de segurança (pentest de 08/10/2026).
--
-- Achados que esta migration fecha:
--  1. Este projeto Supabase NÃO concede acesso automático a tabelas novas:
--     as policies de RLS existiam, mas sem GRANT nem leitura pública
--     (levels/rewards/preços) funcionava. Aqui cada papel recebe só o que
--     a UI usa; a RLS continua filtrando linha a linha.
--  2. Funções nascem executáveis por PUBLIC no Postgres: validate_coupon
--     respondia a visitante anônimo (força bruta de cupom). Tudo revogado
--     de PUBLIC e concedido explicitamente.
--  3. community_posts aceitava insert com status 'approved' (auto-aprovação
--     furando a moderação). Insert agora só nas colunas do usuário e com
--     status obrigatoriamente 'pending'.
--  4. Texto livre que vai para tela (nome de item de pedido, endereço,
--     apelido, legenda) é saneado no servidor — defesa em profundidade além
--     do escape no front (XSS armazenado contra visitante e contra admin).
--  5. Sem limite de taxa: newsletter/cupom/pedido/resgate podiam ser
--     metralhados por robô. Limite por IP (anônimo) ou por usuário.
--  6. Bucket 'community' aceitava qualquer tipo/tamanho de arquivo (HTML/SVG
--     com script). Agora só imagem, até 8MB.

-- ============================================================
-- 1. GRANTS mínimos (RLS continua valendo por cima)
-- ============================================================
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- catálogo público
grant select on public.levels, public.rewards, public.product_prices to anon, authenticated;
-- feed público da comunidade (policy só libera status = 'approved')
grant select on public.community_posts to anon;

-- dados do próprio usuário (policies restringem a auth.uid())
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders, public.order_items, public.xp_ledger, public.reward_redemptions to authenticated;
grant select on public.xp_totals to authenticated;
grant select, delete on public.community_posts to authenticated;
grant insert (user_id, image_path, caption, product_id, rating) on public.community_posts to authenticated;

-- perfil: só colunas de preferência são graváveis pelo dono
grant select on public.profiles to authenticated;
grant insert (id, display_name, public_handle, avatar_url, locale, theme, ranking_opt_in) on public.profiles to authenticated;
grant update (display_name, public_handle, avatar_url, locale, theme, ranking_opt_in, updated_at) on public.profiles to authenticated;

-- tabelas futuras não herdam acesso automático
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ============================================================
-- 2. FUNÇÕES: nada executável por PUBLIC; concessão explícita
-- ============================================================
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
revoke all on all functions in schema public from authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

grant execute on function public.get_ranking(integer) to anon, authenticated;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;
grant execute on function public.create_whatsapp_order(jsonb, jsonb, text) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.validate_coupon(text) to authenticated;

-- ============================================================
-- 3. COMUNIDADE: post sempre nasce pendente
-- ============================================================
drop policy if exists "community_posts: user inserts own" on public.community_posts;
create policy "community_posts: user inserts own" on public.community_posts
  for insert with check (
    auth.uid() = user_id
    and status = 'pending'
    and moderated_at is null
    and rejection_reason is null
  );

alter table public.community_posts
  drop constraint if exists community_posts_caption_len,
  add constraint community_posts_caption_len check (caption is null or char_length(caption) <= 500) not valid;

-- ============================================================
-- 4. SANEAMENTO de texto livre
-- ============================================================
create or replace function public.sg_clean_text(p text, p_max integer)
returns text language sql immutable set search_path = public as $$
  -- remove marcação HTML e caracteres de controle; corta no tamanho máximo
  select nullif(left(btrim(regexp_replace(coalesce(p, ''), '[<>"`[:cntrl:]]', '', 'g')), p_max), '');
$$;
revoke all on function public.sg_clean_text(text, integer) from public, anon, authenticated;

-- perfil: apelido público com formato fechado; nome sem marcação
alter table public.profiles
  drop constraint if exists profiles_public_handle_format,
  add constraint profiles_public_handle_format check (public_handle is null or public_handle ~ '^[A-Za-z0-9_.]{3,24}$') not valid,
  drop constraint if exists profiles_display_name_safe,
  add constraint profiles_display_name_safe check (display_name is null or (char_length(display_name) <= 80 and display_name !~ '[<>]')) not valid,
  drop constraint if exists profiles_avatar_url_safe,
  add constraint profiles_avatar_url_safe check (avatar_url is null or avatar_url ~ '^https://') not valid;

-- signup: nome vindo do provedor (Google/e-mail) é saneado antes de gravar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, public.sg_clean_text(new.raw_user_meta_data ->> 'name', 80));
  return new;
end;
$$ language plpgsql security definer set search_path = public;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- 5. LIMITE DE TAXA
-- ============================================================
create table if not exists public.rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- IP real do cliente repassado pelo gateway do Supabase
create or replace function public.sg_client_ip()
returns text language sql stable set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown');
$$;
revoke all on function public.sg_client_ip() from public, anon, authenticated;

-- true = dentro do limite (e conta o hit); false = estourou
create or replace function public.sg_rate_ok(p_bucket text, p_key text, p_max integer, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  v_hits integer;
begin
  insert into public.rate_limits (bucket, key, window_start, hits)
  values (p_bucket, coalesce(p_key, 'unknown'), v_start, 1)
  on conflict (bucket, key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  -- faxina ocasional de janelas antigas
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end;
$$;
revoke all on function public.sg_rate_ok(text, text, integer, interval) from public, anon, authenticated;

-- newsletter: 5 por IP a cada 10 min, 300 no total por hora
create or replace function public.newsletter_subscribe(p_email text, p_locale text default 'pt-BR')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not public.sg_rate_ok('newsletter_ip', public.sg_client_ip(), 5, interval '10 minutes')
     or not public.sg_rate_ok('newsletter_all', 'all', 300, interval '1 hour') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;
  if v_email !~ '^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$' or length(v_email) > 254 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;
  insert into public.newsletter_subscribers (email, locale)
  values (v_email, case when p_locale in ('pt-BR','en','es') then p_locale else 'pt-BR' end)
  on conflict (email) do update set unsubscribed_at = null;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.newsletter_subscribe(text, text) from public;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;
-- inscrição só pela função (que valida e limita); insert direto fechado
drop policy if exists "newsletter_subscribers: anyone can subscribe" on public.newsletter_subscribers;

-- cupom: 10 tentativas por usuário a cada 10 min (contra força bruta)
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
  return coalesce(
    (select jsonb_build_object('ok', true, 'code', code, 'discount_percent', discount_percent, 'discount_cents', discount_cents)
       from public.coupons
      where upper(code) = upper(trim(p_code))
        and active
        and valid_from <= now()
        and (valid_until is null or valid_until > now())
        and (max_uses is null or uses_count < max_uses)),
    jsonb_build_object('ok', false, 'reason', 'invalid'));
end;
$$;
revoke all on function public.validate_coupon(text) from public, anon;
grant execute on function public.validate_coupon(text) to authenticated;

-- resgate: 20 por usuário por hora
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
  if not public.sg_rate_ok('redeem', v_user::text, 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
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

-- pedido: 10 por usuário por hora; texto saneado; endereço só com campos
-- conhecidos (nada de chave/valor arbitrário chegando ao painel do admin)
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
  v_pid text;
  v_price integer;
  v_total integer := 0;
  v_ship jsonb := '{}'::jsonb;
  v_field text;
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
  return v_order;
end;
$$;
revoke all on function public.create_whatsapp_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.create_whatsapp_order(jsonb, jsonb, text) to authenticated;

-- ============================================================
-- 6. STORAGE: bucket da comunidade só aceita imagem, até 8MB
-- ============================================================
update storage.buckets
   set file_size_limit = 8 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
 where id = 'community';
