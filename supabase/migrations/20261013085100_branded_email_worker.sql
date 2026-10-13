CREATE OR REPLACE FUNCTION public.deliver_customer_emails()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare api_key text; item record; response record; request bigint; day_count integer; month_count integer;
begin
 if not pg_try_advisory_xact_lock(34034500) then return; end if;
 select decrypted_secret into api_key from vault.decrypted_secrets where name='street_notifications_resend' limit 1;
 if api_key is null then return; end if;
 for response in select q.notification_id,q.attempts,r.status_code,r.error_msg from public.notification_email_queue q join net._http_response r on r.id=q.request_id where q.state='sending' loop
  update public.notification_email_queue set state=case when response.status_code between 200 and 299 then 'accepted' when response.status_code=429 or response.status_code>=500 or response.error_msg is not null then case when attempts<5 then 'pending' else 'failed' end else 'failed' end,
  accepted_at=case when response.status_code between 200 and 299 then now() else null end,
  next_attempt_at=now()+interval '15 minutes',error_code=case when response.status_code between 200 and 299 then null else coalesce(response.status_code::text,'network_error') end where notification_id=response.notification_id;
 end loop;
 update public.notification_email_queue set state=case when attempts<5 then 'pending' else 'failed' end,next_attempt_at=now()+interval '15 minutes',error_code='response_timeout' where state='sending' and attempted_at<now()-interval '10 minutes';
 select count(*) into day_count from public.notification_email_queue where attempted_at >= date_trunc('day',now()) and state in('sending','accepted');
 select count(*) into month_count from public.notification_email_queue where attempted_at >= date_trunc('month',now()) and state in('sending','accepted');
 -- Keep a conservative reserve for authentication and other account sends.
 if day_count>=25 or month_count>=750 then return; end if;
 for item in select q.*,n.user_id,n.kind,n.title,n.body,u.email,u.raw_user_meta_data,u.email_confirmed_at,c.enabled,c.email_enabled from public.notification_email_queue q join public.customer_notifications n on n.id=q.notification_id join auth.users u on u.id=n.user_id join public.notification_controls c on c.kind=n.kind where q.state='pending' and q.next_attempt_at<=now() order by n.created_at limit least(2,25-day_count,750-month_count) for update of q skip locked loop
  if not item.enabled or not item.email_enabled or item.email_confirmed_at is null or coalesce(item.raw_user_meta_data->'notification_prefs'->>'emailEnabled','false')<>'true' or coalesce(item.raw_user_meta_data->'notification_prefs'->>item.kind,'true')='false' then
   update public.notification_email_queue set state='skipped' where notification_id=item.notification_id; continue;
  end if;
  request:=net.http_post(url:='https://api.resend.com/emails',headers:=jsonb_build_object('Authorization','Bearer '||api_key,'Content-Type','application/json','Idempotency-Key','street-notification-'||item.notification_id),body:=jsonb_build_object('from','Street Goose 034 <avisos@streetgoose034.com.br>','to',jsonb_build_array(item.email),'subject',item.title,'text',item.body||chr(10)||chr(10)||'Confira sua conta: https://www.streetgoose034.com.br/conta'||chr(10)||chr(10)||'Altere os canais e tipos de aviso em Conta > Preferências.','html',public.render_street_notification_email(item.title,item.body,item.kind)),timeout_milliseconds:=5000);
  update public.notification_email_queue set state='sending',request_id=request,attempts=attempts+1,attempted_at=now() where notification_id=item.notification_id;
 end loop;
end; $function$
