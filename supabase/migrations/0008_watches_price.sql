-- Street Goose 034 — todos os relógios (relogios-01..05) a R$220,00,
-- preço informado pelo cliente em 08/10/2026 (o Minute Machine,
-- relogios-03, já estava; agora os 4 redondos também). Sincronizado com
-- CATEGORY_PRICE_CENTS.relogios em js/catalog.js.
insert into public.product_prices (product_id, price_cents)
select 'relogios-' || lpad(n::text, 2, '0'), 22000 from generate_series(1, 5) as n
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
