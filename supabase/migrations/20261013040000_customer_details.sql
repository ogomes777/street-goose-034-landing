-- Private customer information must never share the public ranking profile.
create table public.customer_details (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (length(full_name)<=120),
 phone text not null default '' check (length(phone)<=25),
 birthday date check (birthday <= current_date),
 postal_code text not null default '' check (length(postal_code)<=12),
 street text not null default '' check (length(street)<=160),
 address_number text not null default '' check (length(address_number)<=20),
 complement text not null default '' check (length(complement)<=100),
 neighborhood text not null default '' check (length(neighborhood)<=100),
 city text not null default '' check (length(city)<=100),
 state text not null default '' check (state='' or state ~ '^[A-Z]{2}$'),
 updated_at timestamptz not null default now()
);
alter table public.customer_details enable row level security;
revoke all on public.customer_details from anon;
grant select, insert, update on public.customer_details to authenticated;
create policy customer_details_read on public.customer_details for select to authenticated using (user_id=(select auth.uid()) or (select public.is_admin()));
create policy customer_details_insert on public.customer_details for insert to authenticated with check (user_id=(select auth.uid()));
create policy customer_details_update on public.customer_details for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
