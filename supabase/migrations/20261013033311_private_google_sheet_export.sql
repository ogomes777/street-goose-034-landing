create table public.sheet_export_authorizations(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.sheet_export_authorizations enable row level security;
revoke all on public.sheet_export_authorizations from anon,authenticated;
create function public.export_customer_sheet(p_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare output jsonb;
begin
 if not exists(select 1 from public.sheet_export_authorizations a join auth.users u on u.id=a.user_id where lower(u.email)=lower(p_email)) then raise exception 'forbidden'; end if;
 select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) into output from (
 select u.id,u.email,coalesce(d.full_name,p.display_name,'') as full_name,coalesce(d.cpf,'') as cpf,coalesce(d.phone,'') as phone,d.birthday,coalesce(d.postal_code,'') as postal_code,coalesce(d.street,'') as street,coalesce(d.address_number,'') as address_number,coalesce(d.complement,'') as complement,coalesce(d.neighborhood,'') as neighborhood,coalesce(d.city,'') as city,coalesce(d.state,'') as state,u.created_at,u.email_confirmed_at,coalesce(x.total_xp,0) as xp,public.level_for_xp(coalesce(x.total_xp,0)::integer) as level,coalesce(u.raw_user_meta_data->'notification_prefs','{}') as prefs,d.updated_at,coalesce(a.last_seen,u.last_sign_in_at) as last_seen,coalesce(o.order_count,0) as order_count,coalesce(o.total_paid,0) as total_paid,o.last_order
 from auth.users u left join public.profiles p on p.id=u.id left join public.customer_details d on d.user_id=u.id left join public.xp_totals x on x.user_id=u.id left join public.customer_activity a on a.user_id=u.id left join lateral (select count(*) as order_count,sum(total_cents) filter(where status in('paid','fulfilled')) as total_paid,max(created_at) filter(where status in('paid','fulfilled')) as last_order from public.orders where user_id=u.id) o on true order by u.created_at
 ) c;
 return jsonb_build_object('customers',output,'updated_at',now());
end; $$;
revoke all on function public.export_customer_sheet(text) from public,anon,authenticated;grant execute on function public.export_customer_sheet(text) to service_role;

