-- Street Goose 034 — relógio Minute Machine (relogios-03) a R$220,00,
-- preço informado pelo cliente em 08/10/2026. Sincronizado com
-- FILE_PRICE_CENTS em js/catalog.js.
insert into public.product_prices (product_id, price_cents) values
  ('relogios-03', 22000)
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
