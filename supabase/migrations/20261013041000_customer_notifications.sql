create table public.customer_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null,
 event_key text not null unique,
 title text not null,
 body text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index customer_notifications_user_date on public.customer_notifications(user_id,created_at desc);
alter table public.customer_notifications enable row level security;
grant select on public.customer_notifications to authenticated;
grant update(read_at) on public.customer_notifications to authenticated;
create policy notifications_read on public.customer_notifications for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy notifications_mark on public.customer_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create table public.notification_controls (
 kind text primary key,
 enabled boolean not null default true,
 email_enabled boolean not null default false,
 push_enabled boolean not null default false
);
insert into public.notification_controls(kind) values ('orderUpdates'),('levelUp'),('rewardUnlocked'),('couponUnlocked'),('postApproved'),('newsletter');
alter table public.notification_controls enable row level security;
grant select,update on public.notification_controls to authenticated;
create policy controls_read on public.notification_controls for select to authenticated using(true);
create policy controls_admin on public.notification_controls for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create function public.record_customer_notification(p_user uuid,p_kind text,p_key text,p_title text,p_body text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_user is null or not exists(select 1 from public.notification_controls where kind=p_kind and enabled) then return; end if;
 if coalesce((select raw_user_meta_data->'notification_prefs'->>p_kind from auth.users where id=p_user),'true')='false' then return; end if;
 insert into public.customer_notifications(user_id,kind,event_key,title,body) values(p_user,p_kind,p_key,p_title,p_body) on conflict(event_key) do nothing;
end; $$;
revoke all on function public.record_customer_notification(uuid,text,text,text,text) from public,anon,authenticated;
create function public.notify_customer_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status then
 perform public.record_customer_notification(new.user_id,'orderUpdates','order:'||new.id||':'||new.status,'Seu pedido foi atualizado',case new.status when 'paid' then 'Pagamento confirmado. Estamos preparando sua Street.' when 'fulfilled' then 'Seu pedido foi enviado. Confira os detalhes na sua conta.' when 'cancelled' then 'Seu pedido foi cancelado. Confira os detalhes na sua conta.' when 'refunded' then 'O reembolso do seu pedido foi registrado.' else 'Confira o novo status na sua conta.' end);
 end if; return new;
end; $$;
revoke all on function public.notify_customer_order() from public,anon,authenticated;
create trigger customer_order_notice after update of status on public.orders for each row execute function public.notify_customer_order();
create function public.notify_customer_reward() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.record_customer_notification(new.user_id,'rewardUnlocked','reward:'||new.id,'Sua recompensa está pronta','Você resgatou uma recompensa. Confira os benefícios na sua conta.');
 return new;
end; $$;
revoke all on function public.notify_customer_reward() from public,anon,authenticated;
create trigger customer_reward_notice after insert on public.reward_redemptions for each row execute function public.notify_customer_reward();
create function public.notify_customer_level() returns trigger language plpgsql security definer set search_path='' as $$
declare total bigint; previous_level integer; next_level integer;
begin
 select coalesce(sum(amount),0) into total from public.xp_ledger where user_id=new.user_id;
 previous_level:=public.level_for_xp(greatest(0,total-new.amount)::integer);
 next_level:=public.level_for_xp(greatest(0,total)::integer);
 if next_level>previous_level then
 perform public.record_customer_notification(new.user_id,'levelUp','level:'||new.id,'Sua evolução ganhou uma nova assinatura','Você chegou ao nível '||next_level||'. Descubra sua pedra e seus benefícios na conta.');
 end if; return new;
end; $$;
revoke all on function public.notify_customer_level() from public,anon,authenticated;
create trigger customer_level_notice after insert on public.xp_ledger for each row execute function public.notify_customer_level();
