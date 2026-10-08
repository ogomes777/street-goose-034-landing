-- Street Goose 034 — blusas de frio/moletons (trajes-01..17) a R$220,00,
-- preço informado pelo cliente em 08/10/2026. Sincronizado com
-- CATEGORY_PRICE_CENTS.trajes em js/catalog.js.
insert into public.product_prices (product_id, price_cents)
select 'trajes-' || lpad(n::text, 2, '0'), 22000 from generate_series(1, 17) as n
on conflict (product_id) do update set price_cents = excluded.price_cents, updated_at = now();
