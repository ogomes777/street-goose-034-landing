-- Exact, aggregate-only CRM answers. No dynamic SQL, no customer personal fields.
create schema if not exists street_private;
grant usage on schema street_private to authenticated;
create or replace function street_private.admin_assistant_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to <= p_from or p_to-p_from > interval '366 days' then raise exception 'invalid_period'; end if;
 return jsonb_build_object(
  'generated_at',now(),'from',p_from,'to',p_to,
  'orders',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.orders where created_at>=p_from and created_at<p_to group by status) t),
  'products',(select jsonb_build_object('registered',count(*),'visible',count(*) filter(where not hidden),'sold_out',count(*) filter(where sold_out),'hidden',count(*) filter(where hidden)) from public.products),
  'customers',(select jsonb_build_object('total',count(*),'new',count(*) filter(where created_at>=p_from and created_at<p_to),'ranking_opt_in',count(*) filter(where ranking_opt_in)) from public.profiles),
  'community',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.community_posts where created_at>=p_from and created_at<p_to group by status) t),
  'coupons',(select jsonb_build_object('valid',count(*) filter(where active and valid_from<=now() and (valid_until is null or valid_until>now()) and (max_uses is null or uses_count<max_uses)),'uses_total',coalesce(sum(uses_count),0)) from public.coupons),
  'rewards',(select jsonb_build_object('active',count(*) filter(where active),'total',count(*)) from public.rewards),
  'newsletter',(select jsonb_build_object('active',count(*) filter(where unsubscribed_at is null),'new',count(*) filter(where subscribed_at>=p_from and subscribed_at<p_to)) from public.newsletter_subscribers),
  'xp',(select jsonb_build_object('earned',coalesce(sum(amount) filter(where amount>0),0),'removed',coalesce(-sum(amount) filter(where amount<0),0),'events',count(*)) from public.xp_ledger where created_at>=p_from and created_at<p_to)
 );
end; $$;
revoke all on function street_private.admin_assistant_report(timestamptz,timestamptz) from public,anon;
grant execute on function street_private.admin_assistant_report(timestamptz,timestamptz) to authenticated;
create or replace function public.admin_assistant_report(p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
 select street_private.admin_assistant_report(p_from,p_to);
$$;
revoke all on function public.admin_assistant_report(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_assistant_report(timestamptz,timestamptz) to authenticated;
