-- Bounded provider usage with an existing private rate limiter.
create or replace function street_private.crm_assistant_quota()
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if not public.sg_rate_ok('crm-ai-minute',auth.uid()::text,8,interval '1 minute') then return false; end if;
 return public.sg_rate_ok('crm-ai-day',auth.uid()::text,150,interval '1 day');
end; $$;
revoke all on function street_private.crm_assistant_quota() from public,anon;
grant execute on function street_private.crm_assistant_quota() to authenticated;
create or replace function public.crm_assistant_quota()
returns boolean language sql security invoker set search_path='' as $$ select street_private.crm_assistant_quota(); $$;
revoke all on function public.crm_assistant_quota() from public,anon;
grant execute on function public.crm_assistant_quota() to authenticated;
