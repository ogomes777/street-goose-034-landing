-- Street Goose 034 — correção: mochila (acessorios-02) é R$800,00, não
-- R$400,00 (cliente corrigiu em 08/10/2026). Sincronizado com
-- FILE_PRICE_CENTS em js/catalog.js.
insert into public.product_prices (product_id, price_cents) values
  ('acessorios-02', 80000)
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
