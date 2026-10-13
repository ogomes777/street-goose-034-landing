revoke insert,update on public.push_subscriptions from authenticated;
grant insert(user_id,endpoint,keys),update(user_id,endpoint,keys) on public.push_subscriptions to authenticated;
create function public.limit_push_devices() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,340));
 if not exists(select 1 from public.push_subscriptions where endpoint=new.endpoint) and (select count(*) from public.push_subscriptions where user_id=new.user_id)>=10 then raise exception 'device_limit'; end if;
 return new;
end; $$;
revoke all on function public.limit_push_devices() from public,anon,authenticated;
create trigger push_device_limit before insert on public.push_subscriptions for each row execute function public.limit_push_devices();
update public.notification_controls set push_enabled=true where kind in('orderUpdates','levelUp','rewardUnlocked','couponUnlocked','postApproved');
create or replace function public.notification_delivery_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('emailConfigured',exists(select 1 from vault.secrets where name='street_notifications_resend'),'pushConfigured',exists(select 1 from vault.secrets where name='street_push_worker'));
$$;
select cron.schedule('street-web-push','* * * * *','select public.invoke_push_worker();');

