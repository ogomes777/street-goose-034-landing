alter table public.store_activity_preferences add column scope_enabled boolean not null default false;
alter table public.store_live_events drop constraint store_live_events_kind_check;
alter table public.store_live_events add constraint store_live_events_kind_check check(kind in ('cart','favorite','community','purchase','contact','profile','login'));
insert into public.notification_controls(kind,enabled,email_enabled,push_enabled) values('communityActivity',true,false,true);
create function public.publish_store_profile_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; action text; admin record; permitted boolean; new_public_profile boolean:=false;
begin
 if tg_table_name='users' then
  actor:=new.id;action:='login';
  if new.last_sign_in_at is not distinct from old.last_sign_in_at then return new; end if;
 else
  actor:=new.id;action:='profile';
  if (new.public_handle,new.bio,new.avatar_url,new.display_name) is not distinct from (old.public_handle,old.bio,old.avatar_url,old.display_name) then return new; end if;
  new_public_profile:=old.public_handle is null and new.public_handle is not null;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,36));
 if exists(select 1 from public.store_activity_audit where user_id=actor and kind=action and occurred_at>now()-interval '30 minutes') then return new; end if;
 select coalesce(scope_enabled,false) into permitted from public.store_activity_preferences where user_id=actor;
 if coalesce(permitted,false) or new_public_profile then
  insert into public.store_activity_audit(user_id,kind,product_id) values(actor,action,'profile');
  insert into public.store_live_events(kind,title,body,href) values(action,case when action='login' then 'Uma presença voltou à Street' when new_public_profile then 'Um novo perfil entrou na comunidade' else 'Uma assinatura ganhou novos detalhes' end,'Atividade pública da comunidade, sem dados pessoais.','/comunidade');
 end if;
 if action='profile' then
  for admin in select user_id from public.admins loop perform public.record_customer_notification(admin.user_id,'adminAlerts','profile-change:'||actor||':'||extract(epoch from now())::bigint||':'||admin.user_id,'Um perfil público foi atualizado','Confira o perfil na comunidade ou no CRM.');end loop;
 end if;
 return new;
end; $$;
revoke all on function public.publish_store_profile_activity() from public,anon,authenticated;
create trigger store_public_profile after update of public_handle,bio,avatar_url,display_name on public.profiles for each row execute function public.publish_store_profile_activity();
create trigger store_public_login after update of last_sign_in_at on auth.users for each row execute function public.publish_store_profile_activity();
create function public.notify_store_activity_followers() returns trigger language plpgsql security definer set search_path='' as $$
declare follower record;
begin
 for follower in select id from auth.users where raw_user_meta_data->'notification_prefs'->>'communityActivity'='true' and email_confirmed_at is not null loop
  if not exists(select 1 from public.customer_notifications where user_id=follower.id and kind='communityActivity' and created_at>now()-interval '15 minutes') then
   perform public.record_customer_notification(follower.id,'communityActivity','community-live:'||new.id||':'||follower.id,'A comunidade Street está em movimento','Há uma nova atividade: '||new.title||'. Abra a loja para acompanhar.');
  end if;
 end loop;
 return new;
end; $$;
revoke all on function public.notify_store_activity_followers() from public,anon,authenticated;
create trigger store_activity_followers after insert on public.store_live_events for each row execute function public.notify_store_activity_followers();
