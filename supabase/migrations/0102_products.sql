-- Street Goose 034 — produtos editáveis pelo painel (/admin → Produtos).
-- O catálogo de fábrica continua vindo das fotos do repositório
-- (js/catalog.js); esta tabela é a camada por cima, lida pelo site no boot
-- (js/catalog-sync.js):
--   * linha com o id de uma peça de fábrica = ajuste dela (nome, descrição,
--     fotos, oculta, esgotada, posição). Apagar a linha restaura o original.
--   * linha com is_custom = true = produto novo criado no painel, com fotos
--     no bucket público 'products'.
-- Preço continua em public.product_prices (fonte do create_whatsapp_order).
-- Leitura pública; escrita só admin (is_admin(), migration 0100).

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  category text not null check (category in ('lupa','acessorios','relogios','perfumes','trajes')),
  -- sem < > " ` : o nome entra em HTML/atributos no site (defesa além do escape)
  name text check (name is null or (char_length(btrim(name)) between 1 and 120 and name !~ '[<>"`]')),
  description text check (description is null or (char_length(description) <= 600 and description !~ '[<>"`]')),
  -- 'base:<n>' = n-ésima foto de fábrica da peça; '<id>/<arquivo>' = objeto no bucket 'products'
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 8),
  hidden boolean not null default false,
  sold_out boolean not null default false,
  sort_order integer,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
drop policy if exists "products: admin inserts" on public.products;
drop policy if exists "products: admin updates" on public.products;
drop policy if exists "products: admin deletes" on public.products;
-- oculta/esgotada não é segredo: o site precisa saber o que esconder
create policy "products: public read" on public.products for select using (true);
create policy "products: admin inserts" on public.products
  for insert with check ((select public.is_admin()));
create policy "products: admin updates" on public.products
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin deletes" on public.products
  for delete using ((select public.is_admin()));

-- produção não concede acesso automático (0010): GRANT explícito, RLS filtra.
-- is_custom só no insert (quem cria decide); auditoria só pelo trigger.
grant select on public.products to anon, authenticated;
grant insert (id, category, name, description, images, hidden, sold_out, sort_order, is_custom)
  on public.products to authenticated;
grant update (id, category, name, description, images, hidden, sold_out, sort_order)
  on public.products to authenticated;
grant delete on public.products to authenticated;

-- mesmo carimbo da 0101 (updated_at/updated_by do servidor)
drop trigger if exists products_touch on public.products;
create trigger products_touch
  before insert or update on public.products
  for each row execute function public.touch_product_price();

-- ============================================================
-- STORAGE — fotos dos produtos novos: público para ler (site), só admin grava
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 8 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "products bucket: admin reads" on storage.objects;
drop policy if exists "products bucket: admin uploads" on storage.objects;
drop policy if exists "products bucket: admin updates" on storage.objects;
drop policy if exists "products bucket: admin deletes" on storage.objects;
-- leitura pública vem da URL pública do bucket; select aqui é o que a API de
-- storage exige para listar/remover objetos pelo painel
create policy "products bucket: admin reads" on storage.objects
  for select using (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin uploads" on storage.objects
  for insert with check (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin updates" on storage.objects
  for update using (bucket_id = 'products' and (select public.is_admin()));
create policy "products bucket: admin deletes" on storage.objects
  for delete using (bucket_id = 'products' and (select public.is_admin()));
