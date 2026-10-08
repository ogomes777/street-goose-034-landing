-- Street Goose 034 — mochila a R$400,00 (preço do cliente, 08/10/2026).
-- As 3 fotos da mochila viraram um produto só (PRODUCT_GROUPS em
-- js/catalog.js); o produto mantém o id da foto de frente, acessorios-02.
insert into public.product_prices (product_id, price_cents) values
  ('acessorios-02', 40000)
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
