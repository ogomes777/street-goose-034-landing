create table public.store_activity_delivery_queue(event_id bigint primary key references public.store_live_events(id) on delete cascade,created_at timestamptz not null default now());
alter table public.store_activity_delivery_queue enable row level security;
revoke all on public.store_activity_delivery_queue from anon,authenticated;
create or replace function public.notify_store_activity_followers() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.store_activity_delivery_queue(event_id) values(new.id) on conflict do nothing;
 return new;
exception when others then
 raise log 'Street activity queue failure: %',SQLSTATE;
 return new;
end; $$;
create function public.dispatch_store_activity_followers() returns void language plpgsql security definer set search_path='' as $$
declare event record;
begin
 if not pg_try_advisory_xact_lock(340034034) then return; end if;
 for event in select e.* from public.store_activity_delivery_queue q join public.store_live_events e on e.id=q.event_id order by e.occurred_at limit 20 for update of q skip locked loop
  if exists(select 1 from public.notification_controls where kind='communityActivity' and enabled) then
   insert into public.customer_notifications(user_id,kind,event_key,title,body)
   select u.id,'communityActivity','community-live:'||event.id||':'||u.id,'A comunidade Street está em movimento','Há uma nova atividade: '||event.title||'. Abra a loja para acompanhar.'
   from auth.users u where u.email_confirmed_at is not null and u.raw_user_meta_data->'notification_prefs'->>'communityActivity'='true' and not exists(select 1 from public.customer_notifications n where n.user_id=u.id and n.kind='communityActivity' and n.created_at>now()-interval '15 minutes')
   on conflict(event_key) do nothing;
  end if;
  delete from public.store_activity_delivery_queue where event_id=event.id;
 end loop;
end; $$;
revoke all on function public.dispatch_store_activity_followers() from public,anon,authenticated;
select cron.schedule('street-community-activity','* * * * *','select public.dispatch_store_activity_followers();');
