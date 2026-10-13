create or replace function public.publish_store_milestone() returns trigger language plpgsql security definer set search_path='' as $$
declare admin record;
begin
 if tg_table_name='community_posts' then
  if tg_op='INSERT' and new.status='pending' then
   for admin in select user_id from public.admins loop perform public.record_customer_notification(admin.user_id,'adminAlerts','post-review:'||new.id||':'||admin.user_id,'Nova publicação para revisar','Uma foto aguarda aprovação no CRM.'); end loop;
  elsif tg_op='UPDATE' and new.status='approved' and old.status is distinct from 'approved' then
   insert into public.store_live_events(kind,title,body,href) values('community','Um novo look chegou à comunidade','Publicação aprovada pela Street Goose.','/#comunidade');
  end if;
 else
  if tg_op='INSERT' and new.payment_method='whatsapp' and exists(select 1 from public.store_activity_preferences where user_id=new.user_id and sharing_enabled) then
   insert into public.store_live_events(kind,title,body,href) values('contact','Uma conversa sobre a próxima escolha','Um pedido de atendimento foi registrado. A compra ainda não está confirmada.','/#colecao');
  elsif tg_op='UPDATE' and new.status='paid' and old.status is distinct from 'paid' then
   insert into public.store_live_events(kind,title,body,href) values('purchase','Uma compra foi confirmada','Mais uma escolha da comunidade Street Goose.','/#colecao');
  end if;
 end if;
 return new;
end; $$;
drop trigger store_public_purchase on public.orders;
create trigger store_public_purchase after insert or update of status on public.orders for each row execute function public.publish_store_milestone();
