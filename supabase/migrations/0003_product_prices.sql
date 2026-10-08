-- Street Goose 034 — preços no servidor. Fonte usada pelo
-- create_whatsapp_order (e futuramente pelo checkout PagBank) — o preço
-- nunca vem do navegador. Manter em sincronia com CATEGORY_PRICE_CENTS /
-- FILE_PRICE_CENTS em js/catalog.js.
-- Referência (08/10/2026): lupas = Trance Lupas linha padrão R$197,00;
-- chapéus = Bucket/Chapéu Trance R$194,00. Sem linha = preço a confirmar.

create table if not exists public.product_prices (
  product_id text primary key,
  price_cents integer not null check (price_cents > 0),
  updated_at timestamptz not null default now()
);

alter table public.product_prices enable row level security;
create policy "product_prices: public read" on public.product_prices for select using (true);

insert into public.product_prices (product_id, price_cents)
select 'lupa-' || lpad(n::text, 2, '0'), 19700 from generate_series(1, 51) as n
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();

insert into public.product_prices (product_id, price_cents) values
  ('acessorios-03', 19400), -- chapéu bege
  ('acessorios-07', 19400)  -- chapéu preto
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();

-- pedido via WhatsApp agora grava preço e total do servidor; item sem preço
-- cadastrado entra com 0 (confirmado no atendimento)
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
    v_pid := left(coalesce(v_item ->> 'product_id', 'unknown'), 120);
    select price_cents into v_price from public.product_prices where product_id = v_pid;
    v_price := coalesce(v_price, 0);
    v_total := v_total + v_price * v_qty;
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, qty)
    values (v_order, v_pid, left(coalesce(v_item ->> 'product_name', 'Produto'), 200), v_price, v_qty);
  end loop;

  update public.orders set subtotal_cents = v_total, total_cents = v_total where id = v_order;
  return v_order;
end;
$$;
