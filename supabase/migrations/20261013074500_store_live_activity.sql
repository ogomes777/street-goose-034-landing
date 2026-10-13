-- Public activity contains only anonymous, minimal facts. Customer data stays private.
create table public.store_activity_preferences(user_id uuid primary key references auth.users(id) on delete cascade, sharing_enabled boolean not null default false);
alter table public.store_activity_preferences enable row level security;
grant select,insert,update on public.store_activity_preferences to authenticated;
create policy activity_preferences_own on public.store_activity_preferences for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table public.store_live_events(id bigint generated always as identity primary key, kind text not null check(kind in ('cart','favorite','community','purchase','contact')), title text not null, body text not null, href text not null, occurred_at timestamptz not null default now());
create index store_live_recent on public.store_live_events(occurred_at desc);
alter table public.store_live_events enable row level security;
grant select on public.store_live_events to anon,authenticated;
create policy recent_public_activity on public.store_live_events for select to anon,authenticated using(occurred_at>now()-interval '24 hours');
create table public.store_activity_audit(user_id uuid references auth.users(id) on delete cascade, kind text not null, product_id text not null, occurred_at timestamptz not null default now());
create index store_activity_throttle on public.store_activity_audit(user_id,occurred_at desc);
alter table public.store_activity_audit enable row level security;
revoke all on public.store_activity_audit from anon,authenticated;
create function public.record_store_activity(p_kind text,p_product text) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); product_name text;
begin
 if actor is null or p_kind not in ('cart','favorite') then return false; end if;
 if not exists(select 1 from public.store_activity_preferences where user_id=actor and sharing_enabled) then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,034));
 if exists(select 1 from public.store_activity_audit where user_id=actor and kind=p_kind and product_id=p_product and occurred_at>now()-interval '30 minutes') or (select count(*) from public.store_activity_audit where user_id=actor and occurred_at>now()-interval '1 hour')>=12 then return false; end if;
 select coalesce(nullif(left(p.name,100),''),'Uma peça da coleção') into product_name from public.product_prices price left join public.products p on p.id=price.product_id where price.product_id=p_product and coalesce(p.hidden,false)=false and coalesce(p.sold_out,false)=false;
 if product_name is null then select left(name,100) into product_name from public.products where id=p_product and hidden=false and sold_out=false; end if;
 if product_name is null then return false; end if;
 insert into public.store_activity_audit(user_id,kind,product_id) values(actor,p_kind,p_product);
 insert into public.store_live_events(kind,title,body,href) values(p_kind,case when p_kind='cart' then 'Uma escolha entrou na sacola' else 'Uma peça ganhou um favorito' end,product_name,'/#colecao');
 return true;
end; $$;
revoke all on function public.record_store_activity(text,text) from public,anon;
grant execute on function public.record_store_activity(text,text) to authenticated;
create function public.publish_store_milestone() returns trigger language plpgsql security definer set search_path='' as $$
declare admin record;
begin
 if tg_table_name='community_posts' then
  if tg_op='INSERT' and new.status='pending' then
   for admin in select user_id from public.admins loop perform public.record_customer_notification(admin.user_id,'adminAlerts','post-review:'||new.id||':'||admin.user_id,'Nova publicação para revisar','Uma foto aguarda aprovação no CRM.'); end loop;
  elsif tg_op='UPDATE' and new.status='approved' and old.status is distinct from 'approved' then
   insert into public.store_live_events(kind,title,body,href) values('community','Um novo look chegou à comunidade','Publicação aprovada pela Street Goose.','/#comunidade');
  end if;
 else
  if tg_op='UPDATE' and new.status='paid' and old.status is distinct from 'paid' then
   insert into public.store_live_events(kind,title,body,href) values('purchase','Uma compra foi confirmada','Mais uma escolha da comunidade Street Goose.','/#colecao');
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.publish_store_milestone() from public,anon,authenticated;
create trigger store_public_post after insert or update of status on public.community_posts for each row execute function public.publish_store_milestone();
create trigger store_public_purchase after update of status on public.orders for each row execute function public.publish_store_milestone();
alter publication supabase_realtime add table public.store_live_events;
select cron.schedule('street-activity-cleanup','10 4 * * *',$q$delete from public.store_live_events where occurred_at<now()-interval '24 hours'; delete from public.store_activity_audit where occurred_at<now()-interval '24 hours';$q$);
