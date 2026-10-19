create or replace function street_private.crm_assistant_details(p_area text,p_from timestamptz,p_to timestamptz,p_search text default '',p_status text default null,p_offset integer default 0,p_sort text default 'recent',p_only_new boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_search text:=left(coalesce(p_search,''),100); v_offset integer:=least(5000,greatest(0,coalesce(p_offset,0))); v_data jsonb;
begin
 if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_to<=p_from or p_to-p_from>interval '366 days' or p_from is null or p_to is null then raise exception 'invalid_period'; end if;
 if p_area='customers' then
  with c as (
   select p.id,p.display_name,p.public_handle,p.created_at,count(o.id) as orders_period,
    count(o.id) filter(where o.status in ('paid','fulfilled')) as paid_orders_period,
    coalesce(sum(o.total_cents) filter(where o.status in ('paid','fulfilled')),0) as spent_period_cents
   from public.profiles p left join public.orders o on o.user_id=p.id and o.created_at>=p_from and o.created_at<p_to
   where (v_search='' or coalesce(p.display_name,'') ilike '%'||v_search||'%' or coalesce(p.public_handle,'') ilike '%'||v_search||'%')
    and (not p_only_new or (p.created_at>=p_from and p.created_at<p_to))
   group by p.id
  ),page as(select * from c order by case when p_sort='spent' then spent_period_cents end desc nulls last,created_at desc,id limit 25 offset v_offset)
  select jsonb_build_object('total',(select count(*) from c),'items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into v_data;
 elsif p_area='orders' then
  with base as (
   select o.id,o.status,o.created_at,o.total_cents,o.subtotal_cents,o.shipping_cents,o.discount_cents,o.tracking_code,o.source,p.display_name
   from public.orders o left join public.profiles p on p.id=o.user_id
   where o.created_at>=p_from and o.created_at<p_to and (p_status is null or o.status=p_status)
    and (v_search='' or o.id::text ilike '%'||v_search||'%' or coalesce(p.display_name,'') ilike '%'||v_search||'%')
  ),page as(select * from base order by created_at desc,id limit 25 offset v_offset)
  select jsonb_build_object('total',(select count(*) from base),'items',coalesce((select jsonb_agg(to_jsonb(page)||jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name,'qty',i.qty,'unit_price_cents',i.unit_price_cents)) from public.order_items i where i.order_id=page.id),'[]'::jsonb))) from page),'[]'::jsonb)) into v_data;
 else raise exception 'invalid_area'; end if;
 return v_data;
end; $$;
revoke all on function street_private.crm_assistant_details(text,timestamptz,timestamptz,text,text,integer,text,boolean) from public,anon;
grant execute on function street_private.crm_assistant_details(text,timestamptz,timestamptz,text,text,integer,text,boolean) to authenticated;
create or replace function public.crm_assistant_details(p_area text,p_from timestamptz,p_to timestamptz,p_search text default '',p_status text default null,p_offset integer default 0,p_sort text default 'recent',p_only_new boolean default false)
returns jsonb language sql stable security invoker set search_path='' as $$ select street_private.crm_assistant_details(p_area,p_from,p_to,p_search,p_status,p_offset,p_sort,p_only_new); $$;
revoke all on function public.crm_assistant_details(text,timestamptz,timestamptz,text,text,integer,text,boolean) from public,anon;
grant execute on function public.crm_assistant_details(text,timestamptz,timestamptz,text,text,integer,text,boolean) to authenticated;
