create or replace function public.publish_store_profile_activity() returns trigger language plpgsql security definer set search_path='' as $$
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
exception when others then
 raise log 'Street profile activity failure: %',SQLSTATE;
 return new;
end; $$;
