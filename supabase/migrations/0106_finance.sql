-- Street Goose 034 — financeiro do lojista: tudo que entra e sai, com saldo.
-- * finance_entries: livro-caixa só de lançamentos (nunca se apaga venda).
--   Venda entra sozinha quando o pedido vira pago; reembolso/cancelamento e
--   mudança de valor geram o lançamento de diferença (mesma ideia do XP na
--   0103: o pedido sempre "deve" total_cents enquanto pago, 0 fora disso).
-- * Lançamento manual: compra de mercadoria, frete, embalagem, marketing,
--   taxas, retirada, aporte… (só esses podem ser editados/excluídos).
-- * admin_overview ganha saldo, entradas/saídas de 30 dias, a receber e a
--   série diária para os mini-gráficos; admin_finance_summary alimenta a aba
--   Financeiro (período, comparação com o período anterior, categorias,
--   série, ticket médio, peças que mais venderam).
-- Sem grant na tabela: só as funções abaixo, todas com assert_admin().

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('in','out')),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  category text not null check (category in (
    'venda','estorno','ajuste',
    'aporte','outra_entrada',
    'mercadoria','frete','embalagem','marketing','taxas','retirada','outra_saida')),
  description text check (description is null or char_length(description) <= 200),
  occurred_at timestamptz not null default now(),
  order_id uuid references public.orders(id) on delete set null,
  source text not null default 'manual' check (source in ('order','manual')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_entries_when_idx on public.finance_entries (occurred_at desc);
create index if not exists finance_entries_order_idx on public.finance_entries (order_id) where order_id is not null;
alter table public.finance_entries enable row level security;
revoke all on public.finance_entries from anon, authenticated;

-- ============================================================
-- VENDA AUTOMÁTICA a partir do pedido
-- ============================================================
create or replace function public.sync_order_finance()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_target integer;
  v_current integer;
  v_delta integer;
  v_ref text := '#' || upper(left(new.id::text, 8));
begin
  v_target := case when new.status in ('paid','fulfilled') then greatest(new.total_cents, 0) else 0 end;
  select coalesce(sum(case when kind = 'in' then amount_cents else -amount_cents end), 0) into v_current
    from public.finance_entries where order_id = new.id and source = 'order';
  v_delta := v_target - v_current;
  if v_delta = 0 then
    return new;
  end if;
  insert into public.finance_entries (kind, amount_cents, category, description, order_id, source, created_by)
  values (
    case when v_delta > 0 then 'in' else 'out' end,
    abs(v_delta),
    case when v_current = 0 then 'venda'
         when v_target = 0 and new.status in ('refunded','cancelled') then 'estorno'
         else 'ajuste' end,
    case when v_current = 0 then 'Pedido ' || v_ref
         when v_target = 0 and new.status = 'refunded' then 'Pedido ' || v_ref || ' reembolsado'
         when v_target = 0 and new.status = 'cancelled' then 'Pedido ' || v_ref || ' cancelado'
         when v_target = 0 then 'Pedido ' || v_ref || ' voltou para aguardando'
         else 'Pedido ' || v_ref || ' — valor ajustado' end,
    new.id, 'order', auth.uid());
  return new;
end;
$$;
revoke all on function public.sync_order_finance() from public, anon, authenticated;

drop trigger if exists orders_sync_finance on public.orders;
create trigger orders_sync_finance
  after insert or update of status, total_cents on public.orders
  for each row execute function public.sync_order_finance();

-- pedidos que já estavam pagos antes do financeiro existir
insert into public.finance_entries (kind, amount_cents, category, description, occurred_at, order_id, source)
select 'in', o.total_cents, 'venda', 'Pedido #' || upper(left(o.id::text, 8)), o.updated_at, o.id, 'order'
  from public.orders o
 where o.status in ('paid','fulfilled') and o.total_cents > 0
   and not exists (select 1 from public.finance_entries f where f.order_id = o.id and f.source = 'order');

-- ============================================================
-- VISÃO GERAL (topo do painel) — saldo e movimento de 30 dias
-- ============================================================
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_since timestamptz := date_trunc('day', now()) - interval '29 days';
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
      select coalesce(jsonb_agg(jsonb_build_object('d', d::date, 'in', coalesce(s.i, 0), 'out', coalesce(s.o, 0)) order by d), '[]'::jsonb)
        from generate_series(v_since, date_trunc('day', now()), interval '1 day') d
        left join (
          select date_trunc('day', occurred_at) as day,
                 sum(amount_cents) filter (where kind = 'in') as i,
                 sum(amount_cents) filter (where kind = 'out') as o
            from public.finance_entries where occurred_at >= v_since group by 1
        ) s on s.day = d)
  );
end;
$$;

-- ============================================================
-- ABA FINANCEIRO
--   p_from/p_to: período (p_to exclusivo). p_bucket: day | week | month.
-- ============================================================
create or replace function public.admin_finance_summary(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
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
  v_step := case v_bucket when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 day' end;

  -- vendas = saldo líquido de cada pedido no período (pago, reembolsado e
  -- pago de novo conta uma venda só; ticket médio não dobra)
  select count(*) filter (where net > 0), coalesce(sum(net) filter (where net > 0), 0) into v_sales, v_sales_cents
    from (select order_id, sum(case when kind = 'in' then amount_cents else -amount_cents end) as net
            from public.finance_entries
           where source = 'order' and order_id is not null and occurred_at >= v_from and occurred_at < v_to
           group by order_id) t;

  return jsonb_build_object(
    'from', v_from, 'to', v_to, 'bucket', v_bucket,
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
      select coalesce(jsonb_agg(jsonb_build_object('d', b, 'in', coalesce(s.i, 0), 'out', coalesce(s.o, 0)) order by b), '[]'::jsonb)
        from generate_series(date_trunc(v_bucket, v_from), v_to - interval '1 second', v_step) b
        left join (
          select date_trunc(v_bucket, occurred_at) as k,
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

create or replace function public.admin_list_finance(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_kind text default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.finance_entries f
               where (p_from is null or f.occurred_at >= p_from) and (p_to is null or f.occurred_at < p_to)
                 and (p_kind is null or f.kind = p_kind)
                 and (v_q is null or f.description ilike '%' || v_q || '%' or f.category ilike '%' || v_q || '%')),
    'items', (
      select coalesce(jsonb_agg(row_data order by occurred_at desc, created_at desc), '[]'::jsonb)
        from (select f.occurred_at, f.created_at,
                     jsonb_build_object(
                       'id', f.id, 'kind', f.kind, 'amount_cents', f.amount_cents, 'category', f.category,
                       'description', f.description, 'occurred_at', f.occurred_at, 'order_id', f.order_id,
                       'order_status', o.status, 'source', f.source, 'created_at', f.created_at) as row_data
                from public.finance_entries f
                left join public.orders o on o.id = f.order_id
               where (p_from is null or f.occurred_at >= p_from) and (p_to is null or f.occurred_at < p_to)
                 and (p_kind is null or f.kind = p_kind)
                 and (v_q is null or f.description ilike '%' || v_q || '%' or f.category ilike '%' || v_q || '%')
               order by f.occurred_at desc, f.created_at desc
               limit least(greatest(coalesce(p_limit, 100), 1), 500)
              offset greatest(coalesce(p_offset, 0), 0)) s)
  );
end;
$$;

-- lançamento manual (criar/editar). Erros voltam como dado: o painel mostra.
create or replace function public.admin_save_finance_entry(p_id uuid, p_entry jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_kind text := p_entry ->> 'kind';
  v_cat text := p_entry ->> 'category';
  v_amount integer;
  v_when timestamptz;
  v_desc text := public.sg_clean_text(p_entry ->> 'description', 200);
  v_row public.finance_entries%rowtype;
begin
  perform public.assert_admin();
  begin
    v_amount := (p_entry ->> 'amount_cents')::integer;
  exception when others then
    return jsonb_build_object('error', 'invalid_amount');
  end;
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then
    return jsonb_build_object('error', 'invalid_amount');
  end if;
  if v_kind = 'in' and v_cat not in ('aporte','outra_entrada') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  if v_kind = 'out' and v_cat not in ('mercadoria','frete','embalagem','marketing','taxas','retirada','outra_saida') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  if v_kind is null or v_kind not in ('in','out') then
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

create or replace function public.admin_delete_finance_entry(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  delete from public.finance_entries where id = p_id and source = 'manual';
  if not found then
    return jsonb_build_object('error', 'not_editable');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_finance_summary(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_list_finance(timestamptz, timestamptz, text, text, integer, integer) from public, anon;
revoke all on function public.admin_save_finance_entry(uuid, jsonb) from public, anon;
revoke all on function public.admin_delete_finance_entry(uuid) from public, anon;
grant execute on function public.admin_finance_summary(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_list_finance(timestamptz, timestamptz, text, text, integer, integer) to authenticated;
grant execute on function public.admin_save_finance_entry(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_finance_entry(uuid) to authenticated;
