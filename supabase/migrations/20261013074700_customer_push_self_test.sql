create function public.request_my_notification_test() returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); last_test timestamptz;
begin
 if actor is null then return false; end if;
 if not exists(select 1 from public.notification_controls where kind='orderUpdates' and enabled and push_enabled) or not exists(select 1 from auth.users where id=actor and raw_user_meta_data->'notification_prefs'->>'pushEnabled'='true' and coalesce(raw_user_meta_data->'notification_prefs'->>'orderUpdates','true')='true') then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,35));
 select max(created_at) into last_test from public.customer_notifications where user_id=actor and event_key like 'device-test:%';
 if last_test>now()-interval '5 minutes' then return false; end if;
 if not exists(select 1 from public.push_subscriptions where user_id=actor) then return false; end if;
 perform public.record_customer_notification(actor,'orderUpdates','device-test:'||actor||':'||extract(epoch from now())::bigint,'Teste de notificações Street Goose','Seu teste foi processado. Se este aviso chegou com o site fechado, o push da sua conta está funcionando.');
 return exists(select 1 from public.customer_notifications where user_id=actor and event_key like 'device-test:%' and created_at>=now()-interval '1 second');
end; $$;
revoke all on function public.request_my_notification_test() from public,anon;
grant execute on function public.request_my_notification_test() to authenticated;
