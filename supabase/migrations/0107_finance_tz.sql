-- Street Goose 034 — financeiro: dias no fuso da loja e valores grandes.
-- * Os dias do gráfico e dos mini-gráficos eram agrupados em UTC: lançamento
--   feito depois das 21h (Brasília) caía no dia seguinte e aparecia um dia a
--   mais no fim do período. Agora tudo agrupa no fuso de quem abre o painel
--   (padrão America/Sao_Paulo) e o dia volta como 'AAAA-MM-DD' local.
-- * Limite por lançamento sobe de R$ 1 mi para R$ 20 mi (cabe em integer) e
--   passar do limite tem mensagem própria, em vez de "valor inválido".

alter table public.finance_entries drop constraint if exists finance_entries_amount_cents_check;
alter table public.finance_entries
  add constraint finance_entries_amount_cents_check check (amount_cents > 0 and amount_cents <= 2000000000);

-- fuso válido ou o da loja (nunca quebra a consulta por um nome errado)
create or replace function public.sg_store_tz(p_tz text)
returns text
language plpgsql stable set search_path = public as $$
begin
  if p_tz is null or p_tz = '' then
    return 'America/Sao_Paulo';
  end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'America/Sao_Paulo';
end;
$$;
revoke all on function public.sg_store_tz(text) from public, anon, authenticated;

-- ============================================================
-- VISÃO GERAL — 30 dias de calendário local
-- ============================================================
drop function if exists public.admin_overview();
create or replace function public.admin_overview(p_tz text default 'America/Sao_Paulo')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text := public.sg_store_tz(p_tz);
  v_today timestamp := date_trunc('day', now() at time zone v_tz);
  v_since timestamptz := (date_trunc('day', now() at time zone v_tz) - interval '29 days') at time zone v_tz;
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'orders_pending', (select count(*) from public.orders where status = 'pending_payment'),
    'receivable_cents', (select coalesce(sum(total_cents), 0) from public.orders where status = 'pending_payment'),
    'orders_paid_30d', (select count(*) from (
                          select order_id from public.finance_entries
                           where source = 'order' and order_id is not null and occurred_at >= v_since
                           group by order_id
                          having sum(case when kind = 'in' then amount_cents else -amount_cents end) > 0) t),
    'revenue_30d_cents', (select coalesce(sum(case when kind = 'in' then amount_cents else -amount_cents end), 0)
                            from public.finance_entries where source = 'order' and occurred_at >= v_since),
    'in_30d_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'in' and occurred_at >= v_since),
    'out_30d_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'out' and occurred_at >= v_since),
    'balance_cents', (select coalesce(sum(case when kind = 'in' then amount_cents else -amount_cents end), 0) from public.finance_entries),
    'posts_pending', (select count(*) from public.community_posts where status = 'pending'),
    'customers', (select count(*) from auth.users),
    'newsletter_active', (select count(*) from public.newsletter_subscribers where unsubscribed_at is null),
    'spark', (
      select coalesce(jsonb_agg(jsonb_build_object('d', to_char(d, 'YYYY-MM-DD'), 'in', coalesce(s.i, 0), 'out', coalesce(s.o, 0)) order by d), '[]'::jsonb)
        from generate_series(v_today - interval '29 days', v_today, interval '1 day') d
        left join (
          select date_trunc('day', occurred_at at time zone v_tz) as day,
                 sum(amount_cents) filter (where kind = 'in') as i,
                 sum(amount_cents) filter (where kind = 'out') as o
            from public.finance_entries where occurred_at >= v_since group by 1
        ) s on s.day = d)
  );
end;
$$;
revoke all on function public.admin_overview(text) from public, anon;
grant execute on function public.admin_overview(text) to authenticated;

-- ============================================================
-- ABA FINANCEIRO — buckets no fuso local
-- ============================================================
drop function if exists public.admin_finance_summary(timestamptz, timestamptz, text);
create or replace function public.admin_finance_summary(
  p_from timestamptz, p_to timestamptz, p_bucket text default 'day', p_tz text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text := public.sg_store_tz(p_tz);
  v_from timestamptz := coalesce(p_from, (select coalesce(min(occurred_at), now()) from public.finance_entries));
  v_to timestamptz := coalesce(p_to, now() + interval '1 second');
  v_len interval;
  v_bucket text := case when p_bucket in ('day','week','month') then p_bucket else 'day' end;
  v_step interval;
  v_sales integer;
  v_sales_cents bigint;
begin
  perform public.assert_admin();
  if v_to <= v_from then
    v_to := v_from + interval '1 day';
  end if;
  v_len := v_to - v_from;
  -- nunca uma série gigante: período longo em dia vira mês
  if v_bucket = 'day' and v_len > interval '370 days' then
    v_bucket := 'month';
  elsif v_bucket = 'week' and v_len > interval '3 years' then
    v_bucket := 'month';
  end if;
  v_step := case v_bucket when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 day' end;

  select count(*) filter (where net > 0), coalesce(sum(net) filter (where net > 0), 0) into v_sales, v_sales_cents
    from (select order_id, sum(case when kind = 'in' then amount_cents else -amount_cents end) as net
            from public.finance_entries
           where source = 'order' and order_id is not null and occurred_at >= v_from and occurred_at < v_to
           group by order_id) t;

  return jsonb_build_object(
    'from', v_from, 'to', v_to, 'bucket', v_bucket, 'tz', v_tz,
    'balance_cents', (select coalesce(sum(case when kind = 'in' then amount_cents else -amount_cents end), 0) from public.finance_entries),
    'in_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'in' and occurred_at >= v_from and occurred_at < v_to),
    'out_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'out' and occurred_at >= v_from and occurred_at < v_to),
    'prev_in_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'in' and occurred_at >= v_from - v_len and occurred_at < v_from),
    'prev_out_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where kind = 'out' and occurred_at >= v_from - v_len and occurred_at < v_from),
    'sales_count', v_sales,
    'sales_cents', v_sales_cents,
    'avg_ticket_cents', case when v_sales > 0 then round(v_sales_cents::numeric / v_sales) else 0 end,
    'refunds_cents', (select coalesce(sum(amount_cents), 0) from public.finance_entries where category = 'estorno' and occurred_at >= v_from and occurred_at < v_to),
    'receivable_cents', (select coalesce(sum(total_cents), 0) from public.orders where status = 'pending_payment'),
    'receivable_count', (select count(*) from public.orders where status = 'pending_payment'),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'category', category, 'cents', cents, 'count', n) order by kind, cents desc), '[]'::jsonb)
        from (select kind, category, sum(amount_cents) as cents, count(*) as n
                from public.finance_entries where occurred_at >= v_from and occurred_at < v_to
               group by kind, category) c),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object('d', to_char(b, 'YYYY-MM-DD'), 'in', coalesce(s.i, 0), 'out', coalesce(s.o, 0)) order by b), '[]'::jsonb)
        from generate_series(date_trunc(v_bucket, v_from at time zone v_tz), (v_to at time zone v_tz) - interval '1 second', v_step) b
        left join (
          select date_trunc(v_bucket, occurred_at at time zone v_tz) as k,
                 sum(amount_cents) filter (where kind = 'in') as i,
                 sum(amount_cents) filter (where kind = 'out') as o
            from public.finance_entries where occurred_at >= v_from and occurred_at < v_to group by 1
        ) s on s.k = b),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'name', name, 'qty', qty, 'cents', cents) order by cents desc), '[]'::jsonb)
        from (select oi.product_id, max(oi.product_name) as name, sum(oi.qty) as qty, sum(oi.unit_price_cents * oi.qty) as cents
                from public.order_items oi
                join public.orders o on o.id = oi.order_id and o.status in ('paid','fulfilled')
               where exists (select 1 from public.finance_entries f
                              where f.order_id = o.id and f.category = 'venda' and f.occurred_at >= v_from and f.occurred_at < v_to)
               group by oi.product_id
               order by cents desc
               limit 5) t)
  );
end;
$$;
revoke all on function public.admin_finance_summary(timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.admin_finance_summary(timestamptz, timestamptz, text, text) to authenticated;

-- ============================================================
-- LANÇAMENTO — limite de R$ 20 mi com mensagem própria
-- ============================================================
create or replace function public.admin_save_finance_entry(p_id uuid, p_entry jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_kind text := p_entry ->> 'kind';
  v_cat text := p_entry ->> 'category';
  v_amount_num numeric;
  v_amount integer;
  v_when timestamptz;
  v_desc text := public.sg_clean_text(p_entry ->> 'description', 200);
  v_row public.finance_entries%rowtype;
begin
  perform public.assert_admin();
  begin
    v_amount_num := (p_entry ->> 'amount_cents')::numeric;
  exception when others then
    return jsonb_build_object('error', 'invalid_amount');
  end;
  if v_amount_num is null or v_amount_num <= 0 or v_amount_num <> trunc(v_amount_num) then
    return jsonb_build_object('error', 'invalid_amount');
  end if;
  if v_amount_num > 2000000000 then
    return jsonb_build_object('error', 'amount_too_large');
  end if;
  v_amount := v_amount_num::integer;
  if v_kind is null or v_kind not in ('in','out') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  if v_kind = 'in' and v_cat not in ('aporte','outra_entrada') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  if v_kind = 'out' and v_cat not in ('mercadoria','frete','embalagem','marketing','taxas','retirada','outra_saida') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  begin
    v_when := coalesce((p_entry ->> 'occurred_at')::timestamptz, now());
  exception when others then
    return jsonb_build_object('error', 'invalid_date');
  end;
  if v_when > now() + interval '1 day' or v_when < now() - interval '10 years' then
    return jsonb_build_object('error', 'invalid_date');
  end if;

  if p_id is null then
    insert into public.finance_entries (kind, amount_cents, category, description, occurred_at, source, created_by)
    values (v_kind, v_amount, v_cat, v_desc, v_when, 'manual', auth.uid())
    returning * into v_row;
  else
    update public.finance_entries
       set kind = v_kind, amount_cents = v_amount, category = v_cat, description = v_desc,
           occurred_at = v_when, updated_at = now()
     where id = p_id and source = 'manual'
    returning * into v_row;
    if not found then
      return jsonb_build_object('error', 'not_editable');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_row.id);
end;
$$;
