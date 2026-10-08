-- Street Goose 034 — schema inicial.
-- Rodar com `supabase db push` (ou colar no SQL editor do painel) depois de
-- criar o projeto e preencher VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.
-- Nenhuma linha de dado é inserida aqui além de configuração pública
-- (levels, rewards) — zero usuário/pedido/post fake.

-- ============================================================
-- PROFILES — espelha auth.users, guarda preferências e apelido público
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  public_handle text unique,
  avatar_url text,
  locale text not null default 'pt-BR' check (locale in ('pt-BR','en','es')),
  theme text not null default 'system' check (theme in ('dark','light','system')),
  ranking_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: user reads own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: user updates own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: user inserts own" on public.profiles
  for insert with check (auth.uid() = id);
-- apelido público (ranking, comunidade) fica legível por qualquer autenticado
create policy "profiles: public handle readable when opted in" on public.profiles
  for select using (ranking_opt_in = true);

-- cria profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FAVORITES — espelha o localStorage hoje, mas sincronizado por usuário
-- ============================================================
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.favorites enable row level security;

create policy "favorites: user manages own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- CART_ITEMS
-- ============================================================
create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  qty integer not null default 1 check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "cart_items: user manages own" on public.cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- ORDERS / ORDER_ITEMS — preço e estoque sempre validados no servidor,
-- nunca aceitos crus do cliente (ver checkout Edge Function, não incluída
-- aqui porque depende do PSP escolhido)
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','fulfilled','cancelled','refunded')),
  currency text not null default 'BRL',
  subtotal_cents integer not null,
  total_cents integer not null,
  coupon_code text,
  shipping_address jsonb not null,
  payment_method text,
  payment_provider_ref text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders: user reads own" on public.orders
  for select using (auth.uid() = user_id);
-- inserts/updates de pedido acontecem via Edge Function com service_role,
-- nunca direto do cliente — por isso não há policy de insert/update aqui
-- para usuários comuns.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price_cents integer not null,
  qty integer not null check (qty > 0)
);

alter table public.order_items enable row level security;

create policy "order_items: user reads own via order" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ============================================================
-- XP LEDGER — fonte única de verdade de XP; nunca somar/decrementar um
-- contador direto, sempre inserir uma linha (auditável, evita duplicação)
-- ============================================================
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('order_paid','review_approved','community_post_approved','promo','admin_adjustment')),
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

alter table public.xp_ledger enable row level security;

create policy "xp_ledger: user reads own" on public.xp_ledger
  for select using (auth.uid() = user_id);
-- inserts só via service_role (Edge Function/trigger validado), nunca do
-- cliente — não conceder XP por clicar em botão.

-- view auxiliar: XP total por usuário
create or replace view public.xp_totals as
  select user_id, coalesce(sum(amount), 0) as total_xp
  from public.xp_ledger
  group by user_id;

-- ============================================================
-- LEVELS — configurável pelo backend, não hardcoded no HTML/JS
-- ============================================================
create table if not exists public.levels (
  level_number integer primary key,
  name text not null,
  xp_required integer not null,
  benefits jsonb not null default '[]'::jsonb
);

alter table public.levels enable row level security;
create policy "levels: public read" on public.levels for select using (true);

insert into public.levels (level_number, name, xp_required, benefits) values
  (1, 'Rookie 034', 0, '[]'),
  (2, 'Street 034', 200, '[]'),
  (3, 'Rider 034', 500, '[]'),
  (4, 'Select 034', 1000, '[]'),
  (5, 'Archive 034', 2000, '[]'),
  (6, 'Icon 034', 4000, '[]'),
  (7, 'Legacy 034', 8000, '[]')
on conflict (level_number) do nothing;

-- ============================================================
-- REWARDS / COUPONS / REDEMPTIONS
-- ============================================================
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  kind text not null check (kind in ('coupon','gift','discount')),
  requirement_level integer references public.levels(level_number),
  coupon_code text,
  discount_percent integer check (discount_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;
create policy "rewards: public read active" on public.rewards for select using (active = true);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (user_id, reward_id)
);

alter table public.reward_redemptions enable row level security;
create policy "reward_redemptions: user reads own" on public.reward_redemptions
  for select using (auth.uid() = user_id);
-- insert só via Edge Function que valida elegibilidade (nível, uso único)

create table if not exists public.coupons (
  code text primary key,
  discount_percent integer check (discount_percent between 0 and 100),
  discount_cents integer,
  max_uses integer,
  uses_count integer not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  active boolean not null default true
);

alter table public.coupons enable row level security;
-- cupom não é listado publicamente (evita scraping de códigos) — validado
-- via Edge Function no momento de aplicar no carrinho

-- ============================================================
-- COMMUNITY POSTS — moderação obrigatória antes de aparecer em público
-- ============================================================
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null, -- caminho no bucket 'community', não a URL pública direto
  caption text,
  product_id text,
  rating integer check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);

alter table public.community_posts enable row level security;

create policy "community_posts: public reads approved" on public.community_posts
  for select using (status = 'approved');
create policy "community_posts: user reads own regardless of status" on public.community_posts
  for select using (auth.uid() = user_id);
create policy "community_posts: user inserts own" on public.community_posts
  for insert with check (auth.uid() = user_id);
create policy "community_posts: user deletes own" on public.community_posts
  for delete using (auth.uid() = user_id);
-- aprovar/rejeitar é ação de moderação — via service_role/painel admin,
-- não exposta a usuários comuns aqui.

-- ============================================================
-- STORAGE — bucket de fotos da comunidade (privado até aprovação)
-- Rodar via painel Supabase Storage ou supabase CLI; incluído aqui como
-- referência do que precisa existir.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('community', 'community', false)
on conflict (id) do nothing;

create policy "community bucket: owner uploads" on storage.objects
  for insert with check (bucket_id = 'community' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "community bucket: owner reads own" on storage.objects
  for select using (bucket_id = 'community' and auth.uid()::text = (storage.foldername(name))[1]);
-- leitura pública de fotos aprovadas é servida via URL assinada gerada no
-- backend a partir de community_posts.status = 'approved', não via policy
-- pública direta no bucket (evita vazar fotos pendentes/rejeitadas).

-- ============================================================
-- NEWSLETTER — inscrição simples, sem envio de e-mail automático ainda
-- (isso depende de um provedor de e-mail, ver NotificationService)
-- ============================================================
create table if not exists public.newsletter_subscribers (
  email text primary key,
  locale text not null default 'pt-BR',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;
-- inscrição é uma ação pública (anônimo pode se inscrever), mas ninguém lê a
-- lista pelo cliente — leitura só via service_role (painel admin/export)
create policy "newsletter_subscribers: anyone can subscribe" on public.newsletter_subscribers
  for insert with check (true);
