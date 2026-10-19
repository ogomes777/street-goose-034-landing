create or replace function public.record_store_activity(p_kind text,p_product text) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); product_name text;
begin
 if actor is null or p_kind not in ('cart','favorite') then return false; end if;
 if not exists(select 1 from public.store_activity_preferences where user_id=actor and sharing_enabled) then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,034));
 if exists(select 1 from public.store_activity_audit where user_id=actor and kind=p_kind and product_id=p_product and occurred_at>now()-interval '30 minutes') or (select count(*) from public.store_activity_audit where user_id=actor and occurred_at>now()-interval '1 hour')>=12 then return false; end if;
 select coalesce(nullif(left(p.name,100),''),'Uma peça da coleção') into product_name from public.product_prices price left join public.products p on p.id=price.product_id where price.product_id=p_product and coalesce(p.hidden,false)=false and coalesce(p.sold_out,false)=false;
 if product_name is null then select left(name,100) into product_name from public.products where id=p_product and hidden=false and sold_out=false; end if;
 if product_name is null then return false; end if;
 insert into public.store_activity_audit(user_id,kind,product_id) values(actor,p_kind,p_product);
 insert into public.store_live_events(kind,title,body,href) values(p_kind,case when p_kind='cart' then 'Uma escolha entrou na sacola' else 'Uma peça ganhou um favorito' end,product_name,'/#colecao');
 return true;
end; $$;

