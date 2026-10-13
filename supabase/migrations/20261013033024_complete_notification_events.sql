insert into public.notification_controls(kind,email_enabled,push_enabled) values('rankingUp',true,true),('inactivity',true,true),('adminAlerts',true,true) on conflict do nothing;
create table public.customer_activity(user_id uuid primary key references auth.users(id) on delete cascade,last_seen timestamptz not null default now());
alter table public.customer_activity enable row level security;
revoke all on public.customer_activity from anon,authenticated;
create function public.touch_customer_activity() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 insert into public.customer_activity(user_id) values(auth.uid()) on conflict(user_id) do update set last_seen=now() where public.customer_activity.last_seen<now()-interval '1 hour';
end; $$;
revoke all on function public.touch_customer_activity() from public,anon;grant execute on function public.touch_customer_activity() to authenticated;
create or replace function public.record_customer_notification(p_user uuid,p_kind text,p_key text,p_title text,p_body text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_user is null or not exists(select 1 from public.notification_controls where kind=p_kind and enabled) then return; end if;
 if coalesce((select raw_user_meta_data->'notification_prefs'->>p_kind from auth.users where id=p_user),case when p_kind in('newsletter','inactivity') then 'false' else 'true' end)<>'true' then return; end if;
 insert into public.customer_notifications(user_id,kind,event_key,title,body) values(p_user,p_kind,p_key,p_title,p_body) on conflict(event_key) do nothing;
end; $$;
create function public.notify_customer_community() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status is distinct from new.status then
 perform public.record_customer_notification(new.user_id,'postApproved','post:'||new.id,'Sua foto foi aprovada','Sua publicação já faz parte da comunidade Street Goose.');
 end if;return new;
end; $$;
revoke all on function public.notify_customer_community() from public,anon,authenticated;
create trigger customer_community_notice after update of status on public.community_posts for each row execute function public.notify_customer_community();
create function public.notify_customer_coupon() returns trigger language plpgsql security definer set search_path='' as $$
declare code text;
begin
 select coupon_code into code from public.rewards where id=new.reward_id;
 if code is not null and code<>'' then perform public.record_customer_notification(new.user_id,'couponUnlocked','coupon:'||new.id,'Um cupom é seu','Seu resgate liberou o cupom '||code||'. Confira a validade e os detalhes na conta.'); end if;
 return new;
end; $$;
revoke all on function public.notify_customer_coupon() from public,anon,authenticated;
create trigger customer_coupon_notice after insert on public.reward_redemptions for each row execute function public.notify_customer_coupon();
create function public.notify_customer_ranking() returns trigger language plpgsql security definer set search_path='' as $$
declare total bigint; previous bigint; previous_rank bigint; current_rank bigint; profile public.profiles%rowtype;
begin
 if new.amount<=0 then return new; end if;
 select * into profile from public.profiles where id=new.user_id and ranking_opt_in=true;
 if not found then return new; end if;
 select coalesce(sum(amount),0) into total from public.xp_ledger where user_id=new.user_id;
 previous:=total-new.amount;
 select 1+count(*) filter(where coalesce(t.total_xp,0)>previous or (coalesce(t.total_xp,0)=previous and (p.created_at,p.id)<(profile.created_at,profile.id))),1+count(*) filter(where coalesce(t.total_xp,0)>total or (coalesce(t.total_xp,0)=total and (p.created_at,p.id)<(profile.created_at,profile.id))) into previous_rank,current_rank from public.profiles p left join public.xp_totals t on t.user_id=p.id where p.ranking_opt_in=true and p.id<>new.user_id;
 if current_rank<previous_rank then perform public.record_customer_notification(new.user_id,'rankingUp','ranking:'||new.id,'Você subiu no ranking','Sua nova posição é '||current_rank||'. Confira sua evolução na Street Goose.'); end if;
 return new;
end; $$;
revoke all on function public.notify_customer_ranking() from public,anon,authenticated;
create trigger customer_ranking_notice after insert on public.xp_ledger for each row execute function public.notify_customer_ranking();
create function public.notify_store_new_order() returns trigger language plpgsql security definer set search_path='' as $$
declare admin record;
begin
 for admin in select user_id from public.admins loop perform public.record_customer_notification(admin.user_id,'adminAlerts','admin-order:'||new.id||':'||admin.user_id,'Novo pedido na Street Goose','Um pedido foi registrado. Abra o CRM para conferir e atender o cliente.'); end loop;return new;
end; $$;
revoke all on function public.notify_store_new_order() from public,anon,authenticated;
create trigger store_order_notice after insert on public.orders for each row execute function public.notify_store_new_order();
create function public.notify_store_new_customer() returns trigger language plpgsql security definer set search_path='' as $$
declare admin record;
begin
 for admin in select user_id from public.admins loop perform public.record_customer_notification(admin.user_id,'adminAlerts','admin-customer:'||new.id||':'||admin.user_id,'Novo cliente na Street Goose','Uma conta foi criada. Confira a ficha e acompanhe o relacionamento no CRM.'); end loop;return new;
end; $$;
revoke all on function public.notify_store_new_customer() from public,anon,authenticated;
create trigger store_customer_notice after insert on public.profiles for each row execute function public.notify_store_new_customer();
create function public.notify_inactive_customers() returns void language plpgsql security definer set search_path='' as $$
declare customer record;
begin
 for customer in select u.id,coalesce(a.last_seen,u.last_sign_in_at,u.created_at) as last_seen from auth.users u left join public.customer_activity a on a.user_id=u.id where u.email_confirmed_at is not null and coalesce(a.last_seen,u.last_sign_in_at,u.created_at)<now()-interval '14 days' and u.raw_user_meta_data->'notification_prefs'->>'inactivity'='true' loop
 perform public.record_customer_notification(customer.id,'inactivity','inactive:'||customer.id||':'||customer.last_seen::date,'Sua Street está te esperando','Volte para conferir sua conta, seu nível e as novidades da Street Goose.');
 end loop;
end; $$;
revoke all on function public.notify_inactive_customers() from public,anon,authenticated;
select cron.schedule('street-inactivity','0 15 * * *','select public.notify_inactive_customers();');

