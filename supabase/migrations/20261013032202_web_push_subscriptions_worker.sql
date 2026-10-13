create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048 and endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|([A-Za-z0-9-]+[.])*push[.]apple[.]com|([A-Za-z0-9-]+[.])*notify[.]windows[.]com)/'),
 keys jsonb not null check(jsonb_typeof(keys)='object' and keys ? 'p256dh' and keys ? 'auth' and keys->>'p256dh' ~ '^[A-Za-z0-9_-]{80,100}={0,2}$' and keys->>'auth' ~ '^[A-Za-z0-9_-]{20,30}={0,2}$'),
 created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create policy push_owner on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create table public.push_delivery_jobs(
 notification_id uuid references public.customer_notifications(id) on delete cascade,
 subscription_id uuid references public.push_subscriptions(id) on delete cascade,
 state text not null default 'pending',attempts integer not null default 0,next_attempt_at timestamptz not null default now(),
 primary key(notification_id,subscription_id)
);
alter table public.push_delivery_jobs enable row level security;
revoke all on public.push_delivery_jobs from anon,authenticated;
create function public.push_public_key() returns text language sql stable security definer set search_path='' as $$ select decrypted_secret from vault.decrypted_secrets where name='street_push_public' limit 1; $$;
revoke all on function public.push_public_key() from public,anon;grant execute on function public.push_public_key() to authenticated;
create function public.push_worker_config() returns jsonb language sql stable security definer set search_path='' as $$ select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets where name in('street_push_public','street_push_private','street_push_worker'); $$;
revoke all on function public.push_worker_config() from public,anon,authenticated;grant execute on function public.push_worker_config() to service_role;
create function public.claim_push_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare jobs jsonb;
begin
 insert into public.push_delivery_jobs(notification_id,subscription_id) select n.id,s.id from public.customer_notifications n join public.push_subscriptions s on s.user_id=n.user_id where n.created_at>=s.created_at and n.created_at>now()-interval '1 day' on conflict do nothing;
 update public.push_delivery_jobs j set state='skipped' from public.customer_notifications n,auth.users u,public.notification_controls c where j.notification_id=n.id and u.id=n.user_id and c.kind=n.kind and j.state='pending' and (not c.enabled or not c.push_enabled or coalesce(u.raw_user_meta_data->'notification_prefs'->>'pushEnabled','false')<>'true' or coalesce(u.raw_user_meta_data->'notification_prefs'->>n.kind,'true')='false');
 with claimed as (select j.notification_id,j.subscription_id from public.push_delivery_jobs j where j.state in('pending','sending') and j.next_attempt_at<=now() and j.attempts<5 order by j.next_attempt_at limit 5 for update skip locked), changed as (update public.push_delivery_jobs j set state='sending',attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' from claimed c where j.notification_id=c.notification_id and j.subscription_id=c.subscription_id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('notification_id',j.notification_id,'subscription_id',j.subscription_id,'attempts',j.attempts,'endpoint',s.endpoint,'keys',s.keys,'title',n.title,'body',n.body)),'[]'::jsonb) into jobs from changed j join public.push_subscriptions s on s.id=j.subscription_id join public.customer_notifications n on n.id=j.notification_id;
 return jobs;
end; $$;
revoke all on function public.claim_push_jobs() from public,anon,authenticated;grant execute on function public.claim_push_jobs() to service_role;
create function public.invoke_push_worker() returns void language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 select decrypted_secret into secret from vault.decrypted_secrets where name='street_push_worker' limit 1;
 if secret is null then return; end if;
 perform net.http_post(url:='https://hfmzlieixfkisbyweprv.supabase.co/functions/v1/notification-push',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end; $$;
revoke all on function public.invoke_push_worker() from public,anon,authenticated;

