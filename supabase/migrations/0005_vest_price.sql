-- Street Goose 034 — coletes (acessorios-04 e acessorios-06) a R$400,00,
-- preço informado pelo cliente em 08/10/2026. Sincronizado com
-- FILE_PRICE_CENTS em js/catalog.js.
insert into public.product_prices (product_id, price_cents) values
  ('acessorios-04', 40000),
  ('acessorios-06', 40000)
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
