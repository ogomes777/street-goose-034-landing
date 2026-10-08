-- Street Goose 034 — preços editáveis pelo painel (/admin → Preços).
-- public.product_prices (0003) já é a fonte que o create_whatsapp_order usa
-- para gravar o preço do pedido; agora o site também lê dela no boot
-- (js/price-sync.js) e o lojista edita pelo painel. Leitura continua
-- pública; escrita só para admin (is_admin(), migration 0100). Pedido já
-- registrado guarda o próprio order_items.unit_price_cents e não muda.

alter table public.product_prices
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- updated_at/updated_by sempre do servidor, nunca do navegador. Migrations
-- de preço rodam sem usuário, então updated_by fica null nelas.
create or replace function public.touch_product_price()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists product_prices_touch on public.product_prices;
create trigger product_prices_touch
  before insert or update on public.product_prices
  for each row execute function public.touch_product_price();

-- sem GRANT a policy não libera nada (produção não concede acesso
-- automático; a 0010 revoga tudo). Leitura pública é da 0010, repetida
-- para o site/painel não dependerem da ordem de aplicação. updated_at e
-- updated_by ficam de fora: só o trigger escreve neles.
grant select on public.product_prices to anon, authenticated;
grant insert (product_id, price_cents), update (product_id, price_cents), delete
  on public.product_prices to authenticated;

drop policy if exists "product_prices: admin inserts" on public.product_prices;
drop policy if exists "product_prices: admin updates" on public.product_prices;
drop policy if exists "product_prices: admin deletes" on public.product_prices;
create policy "product_prices: admin inserts" on public.product_prices
  for insert with check ((select public.is_admin()));
create policy "product_prices: admin updates" on public.product_prices
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
-- apagar a linha = peça volta para "Consultar" no site
create policy "product_prices: admin deletes" on public.product_prices
  for delete using ((select public.is_admin()));
