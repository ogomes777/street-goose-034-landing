create table public.notification_campaigns(
 id uuid primary key,created_by uuid not null references auth.users(id),title text not null,body text not null,
 recipients integer not null default 0,created_at timestamptz not null default now()
);
alter table public.notification_campaigns enable row level security;
revoke all on public.notification_campaigns from anon,authenticated;
grant select on public.notification_campaigns to authenticated;
create policy notification_campaigns_admin on public.notification_campaigns for select to authenticated using((select public.is_admin()));
create function public.admin_send_notification_campaign(p_id uuid,p_title text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare customer record; recipient_count integer:=0;
begin
 perform public.assert_admin();
 if p_id is null or length(btrim(coalesce(p_title,''))) not between 2 and 80 or length(btrim(coalesce(p_body,''))) not between 2 and 1500 then raise exception 'invalid_message'; end if;
 if not exists(select 1 from public.notification_controls where kind='newsletter' and enabled) then raise exception 'campaigns_disabled'; end if;
 insert into public.notification_campaigns(id,created_by,title,body) values(p_id,auth.uid(),btrim(p_title),btrim(p_body)) on conflict do nothing;
 if not found then return (select jsonb_build_object('recipients',recipients,'duplicate',true) from public.notification_campaigns where id=p_id); end if;
 for customer in select id from auth.users where email_confirmed_at is not null and raw_user_meta_data->'notification_prefs'->>'newsletter'='true' loop
  perform public.record_customer_notification(customer.id,'newsletter','campaign:'||p_id||':'||customer.id,btrim(p_title),btrim(p_body));
  recipient_count:=recipient_count+1;
 end loop;
 update public.notification_campaigns set recipients=recipient_count where id=p_id;
 return jsonb_build_object('recipients',recipient_count,'duplicate',false);
end; $$;
revoke all on function public.admin_send_notification_campaign(uuid,text,text) from public,anon;
grant execute on function public.admin_send_notification_campaign(uuid,text,text) to authenticated;
update public.notification_controls set email_enabled=true,push_enabled=true where kind='newsletter';
create or replace function public.notify_customer_level() returns trigger language plpgsql security definer set search_path='' as $$
declare total bigint; previous_level integer; next_level integer; reward record;
begin
 select coalesce(sum(amount),0) into total from public.xp_ledger where user_id=new.user_id;
 previous_level:=public.level_for_xp(greatest(0,total-new.amount)::integer);
 next_level:=public.level_for_xp(greatest(0,total)::integer);
 if next_level>previous_level then
 perform public.record_customer_notification(new.user_id,'levelUp','level:'||new.id,'Sua evolução ganhou uma nova assinatura','Você chegou ao nível '||next_level||'. Descubra sua pedra e seus benefícios na conta.');
 for reward in select id,title,kind from public.rewards where active and requirement_level>previous_level and requirement_level<=next_level loop
  perform public.record_customer_notification(new.user_id,case when reward.kind='coupon' then 'couponUnlocked' else 'rewardUnlocked' end,'unlock:'||new.id||':'||reward.id,'Seu nível liberou um benefício',reward.title||'. Abra sua conta para conferir e resgatar.');
 end loop;
 end if;
 return new;
end; $$;
