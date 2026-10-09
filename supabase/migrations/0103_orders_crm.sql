-- Street Goose 034 — pedidos como CRM (/admin → Pedidos).
-- O lojista cria pedido manual (venda no WhatsApp/balcão), edita tudo
-- (cliente, entrega, itens, quantidades, preços, frete, desconto, pagamento,
-- rastreio, nota), move entre os status e exclui pedido de teste. XP do
-- pedido passa a acompanhar o status: sai de pago → XP volta; volta a pago
-- → XP de novo; total corrigido com o pedido pago → XP ajustado.

-- ============================================================
-- ORDERS — pedido manual pode não ter conta no site
-- ============================================================
alter table public.orders alter column user_id drop not null;

alter table public.orders
  add column if not exists shipping_cents integer not null default 0,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists tracking_code text,
  add column if not exists source text not null default 'site',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.orders
  drop constraint if exists orders_shipping_cents_check,
  add constraint orders_shipping_cents_check check (shipping_cents >= 0),
  drop constraint if exists orders_discount_cents_check,
  add constraint orders_discount_cents_check check (discount_cents >= 0),
  drop constraint if exists orders_tracking_code_check,
  add constraint orders_tracking_code_check check (tracking_code is null or (char_length(tracking_code) <= 60 and tracking_code !~ '[<>"`]')),
  drop constraint if exists orders_source_check,
  add constraint orders_source_check check (source in ('site','admin')),
  drop constraint if exists orders_payment_method_check,
  add constraint orders_payment_method_check check (payment_method is null or payment_method in ('whatsapp','pix','cartao','dinheiro','outro')) not valid;

-- ============================================================
-- XP do pedido sempre igual ao que ele vale agora (livro-razão só cresce:
-- correções entram como 'admin_adjustment', nunca apagam linha)
-- ============================================================
alter table public.xp_ledger add column if not exists note text;
alter table public.xp_ledger
  drop constraint if exists xp_ledger_note_check,
  add constraint xp_ledger_note_check check (note is null or char_length(note) <= 200);

-- ajustes podem se repetir no mesmo pedido; o resto continua único
drop index if exists public.xp_ledger_unique_ref;
create unique index if not exists xp_ledger_unique_ref
  on public.xp_ledger (user_id, reason, ref_id) where ref_id is not null and reason <> 'admin_adjustment';

create or replace function public.sync_order_xp()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_desired integer;
  v_current integer;
begin
  -- pedido passou para outro cliente: o anterior devolve o XP dele
  if tg_op = 'UPDATE' and old.user_id is not null and old.user_id is distinct from new.user_id then
    select coalesce(sum(amount), 0) into v_current
      from public.xp_ledger where user_id = old.user_id and ref_type = 'order' and ref_id = new.id;
    if v_current <> 0 then
      insert into public.xp_ledger (user_id, amount, reason, ref_type, ref_id, note)
      values (old.user_id, -v_current, 'admin_adjustment', 'order', new.id, 'pedido passou para outro cliente');
    end if;
  end if;

  if new.user_id is null then
    return new;
  end if;

  -- 1 XP por R$1, mínimo 50 — mesma regra da migration 0002
  v_desired := case when new.status in ('paid','fulfilled') and new.total_cents > 0
                    then greatest(50, new.total_cents / 100) else 0 end;
  select coalesce(sum(amount), 0) into v_current
    from public.xp_ledger where user_id = new.user_id and ref_type = 'order' and ref_id = new.id;
  if v_desired = v_current then
    return new;
  end if;

  if v_current = 0 and not exists (
    select 1 from public.xp_ledger where user_id = new.user_id and reason = 'order_paid' and ref_id = new.id
  ) then
    insert into public.xp_ledger (user_id, amount, reason, ref_type, ref_id)
    values (new.user_id, v_desired, 'order_paid', 'order', new.id);
  else
    insert into public.xp_ledger (user_id, amount, reason, ref_type, ref_id, note)
    values (new.user_id, v_desired - v_current, 'admin_adjustment', 'order', new.id,
            case when v_desired = 0 then 'pedido saiu de pago' else 'pedido ajustado' end);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_order_xp() from public, anon, authenticated;

drop trigger if exists orders_award_xp on public.orders;
drop trigger if exists orders_sync_xp on public.orders;
create trigger orders_sync_xp
  after insert or update of status, total_cents, user_id on public.orders
  for each row execute function public.sync_order_xp();
drop function if exists public.award_xp_on_paid();

-- ============================================================
-- LISTA — agora com frete, desconto, rastreio, origem e cliente opcional
-- ============================================================
create or replace function public.admin_list_orders(
  p_status text default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_like text;
  v_result jsonb;
begin
  perform public.assert_admin();
  if v_search is not null then
    v_like := '%' || replace(replace(replace(lower(v_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select o.created_at,
           jsonb_build_object(
             'id', o.id,
             'short_id', upper(left(o.id::text, 8)),
             'status', o.status,
             'currency', o.currency,
             'subtotal_cents', o.subtotal_cents,
             'shipping_cents', o.shipping_cents,
             'discount_cents', o.discount_cents,
             'total_cents', o.total_cents,
             'coupon_code', o.coupon_code,
             'shipping_address', o.shipping_address,
             'payment_method', o.payment_method,
             'payment_provider_ref', o.payment_provider_ref,
             'tracking_code', o.tracking_code,
             'staff_note', o.staff_note,
             'source', o.source,
             'created_at', o.created_at,
             'updated_at', o.updated_at,
             'customer', case when u.id is null then null
                              else jsonb_build_object('id', u.id, 'email', u.email, 'display_name', p.display_name) end,
             'items', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
                        'unit_price_cents', oi.unit_price_cents, 'qty', oi.qty) order by oi.product_name)
                 from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
           ) as row_data
      from public.orders o
      left join auth.users u on u.id = o.user_id
      left join public.profiles p on p.id = o.user_id
     where (p_status is null or o.status = p_status)
       and (v_like is null
            or lower(o.id::text) like v_like
            or lower(coalesce(u.email, '')) like v_like
            or lower(coalesce(p.display_name, '')) like v_like
            or lower(coalesce(o.shipping_address ->> 'name', '')) like v_like
            or lower(coalesce(o.shipping_address ->> 'email', '')) like v_like
            or lower(coalesce(o.shipping_address ->> 'phone', '')) like v_like
            or lower(coalesce(o.tracking_code, '')) like v_like)
     order by o.created_at desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500)
     offset greatest(coalesce(p_offset, 0), 0)
  ) s;

  return v_result;
end;
$$;

create or replace function public.admin_order_counts()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return (
    select jsonb_build_object(
      'pending_payment', count(*) filter (where status = 'pending_payment'),
      'paid', count(*) filter (where status = 'paid'),
      'fulfilled', count(*) filter (where status = 'fulfilled'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'refunded', count(*) filter (where status = 'refunded'),
      'all', count(*))
    from public.orders);
end;
$$;

-- ============================================================
-- SALVAR / CRIAR — p_order_id null = pedido novo (manual).
-- p_order: { status, customer_email, shipping{...}, items[{product_id,
--   product_name, qty, unit_price_cents}], shipping_cents, discount_cents,
--   payment_method, tracking_code, staff_note }. Chave ausente = mantém.
-- ============================================================
create or replace function public.admin_save_order(p_order_id uuid, p_order jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_order_id;
  v_old public.orders%rowtype;
  v_status text;
  v_user uuid;
  v_email text := nullif(lower(btrim(coalesce(p_order ->> 'customer_email', ''))), '');
  v_ship jsonb;
  v_field text;
  v_item jsonb;
  v_qty integer;
  v_price integer;
  v_name text;
  v_subtotal integer := 0;
  v_shipping integer;
  v_discount integer;
  v_total integer;
  v_payment text;
  v_tracking text;
  v_note text;
begin
  perform public.assert_admin();
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'invalid_order' using errcode = '22023';
  end if;

  if v_id is not null then
    select * into v_old from public.orders where id = v_id for update;
    if not found then
      raise exception 'order_not_found' using errcode = 'P0002';
    end if;
  elsif not (p_order ? 'items') then
    raise exception 'items_required' using errcode = '22023';
  end if;

  v_status := coalesce(nullif(p_order ->> 'status', ''), v_old.status, 'pending_payment');
  if v_status not in ('pending_payment','paid','fulfilled','cancelled','refunded') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  v_payment := coalesce(nullif(p_order ->> 'payment_method', ''), v_old.payment_method, 'whatsapp');
  if v_payment not in ('whatsapp','pix','cartao','dinheiro','outro') then
    raise exception 'invalid_payment' using errcode = '22023';
  end if;

  -- conta do site vinculada (opcional): e-mail vazio = pedido sem conta
  if p_order ? 'customer_email' then
    if v_email is null then
      v_user := null;
    else
      select id into v_user from auth.users where lower(email) = v_email;
      if v_user is null then
        -- resposta normal (não exceção): nada foi gravado ainda e o painel mostra a mensagem
        return jsonb_build_object('error', 'customer_not_found');
      end if;
    end if;
  else
    v_user := v_old.user_id;
  end if;

  if p_order ? 'shipping' then
    v_ship := '{}'::jsonb;
    foreach v_field in array array['name','email','phone','cep','street','number','complement','neighborhood','city','state'] loop
      v_ship := v_ship || jsonb_build_object(v_field, coalesce(public.sg_clean_text(p_order -> 'shipping' ->> v_field, 160), ''));
    end loop;
  else
    v_ship := coalesce(v_old.shipping_address, '{}'::jsonb);
  end if;

  v_shipping := greatest(0, coalesce((p_order ->> 'shipping_cents')::integer, v_old.shipping_cents, 0));
  v_discount := greatest(0, coalesce((p_order ->> 'discount_cents')::integer, v_old.discount_cents, 0));
  v_tracking := case when p_order ? 'tracking_code' then public.sg_clean_text(p_order ->> 'tracking_code', 60) else v_old.tracking_code end;
  v_note := case when p_order ? 'staff_note' then nullif(left(btrim(coalesce(p_order ->> 'staff_note', '')), 1000), '') else v_old.staff_note end;

  if v_id is null then
    insert into public.orders (user_id, status, subtotal_cents, total_cents, shipping_cents, discount_cents,
                               shipping_address, payment_method, tracking_code, staff_note, source, created_by)
    values (v_user, 'pending_payment', 0, 0, v_shipping, v_discount, v_ship, v_payment, v_tracking, v_note, 'admin', auth.uid())
    returning id into v_id;
  end if;

  if p_order ? 'items' then
    if jsonb_typeof(p_order -> 'items') <> 'array' or jsonb_array_length(p_order -> 'items') = 0 then
      raise exception 'items_required' using errcode = '22023';
    end if;
    if jsonb_array_length(p_order -> 'items') > 50 then
      raise exception 'too_many_items' using errcode = '22023';
    end if;
    delete from public.order_items where order_id = v_id;
    for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
      v_qty := (v_item ->> 'qty')::integer;
      v_price := (v_item ->> 'unit_price_cents')::integer;
      v_name := public.sg_clean_text(v_item ->> 'product_name', 200);
      if v_qty is null or v_qty < 1 or v_qty > 99 then
        raise exception 'invalid_qty' using errcode = '22023';
      end if;
      if v_price is null or v_price < 0 then
        raise exception 'invalid_price' using errcode = '22023';
      end if;
      if v_name is null then
        raise exception 'item_name_required' using errcode = '22023';
      end if;
      insert into public.order_items (order_id, product_id, product_name, unit_price_cents, qty)
      values (v_id, coalesce(public.sg_clean_text(v_item ->> 'product_id', 120), 'manual'), v_name, v_price, v_qty);
    end loop;
  end if;

  select coalesce(sum(unit_price_cents * qty), 0) into v_subtotal from public.order_items where order_id = v_id;
  v_total := greatest(0, v_subtotal + v_shipping - v_discount);
  if v_status in ('paid','fulfilled') and v_total <= 0 then
    raise exception 'total_required' using errcode = '22023';
  end if;

  -- valores primeiro, status depois: o XP já sai do total confirmado
  update public.orders
     set user_id = v_user,
         shipping_address = v_ship,
         payment_method = v_payment,
         tracking_code = v_tracking,
         staff_note = v_note,
         shipping_cents = v_shipping,
         discount_cents = v_discount,
         subtotal_cents = v_subtotal,
         total_cents = v_total,
         updated_at = now()
   where id = v_id;
  update public.orders set status = v_status, updated_at = now() where id = v_id and status is distinct from v_status;

  return jsonb_build_object('id', v_id, 'short_id', upper(left(v_id::text, 8)), 'total_cents', v_total, 'status', v_status);
end;
$$;

-- só pedido que nunca foi concluído (aguardando/cancelado) pode sumir
create or replace function public.admin_delete_order(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  perform public.assert_admin();
  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_status not in ('pending_payment','cancelled') then
    raise exception 'delete_not_allowed' using errcode = '22023';
  end if;
  delete from public.orders where id = p_order_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ajuste manual de XP do cliente (brinde, correção, campanha)
create or replace function public.admin_adjust_xp(p_user_id uuid, p_amount integer, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  perform public.assert_admin();
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;
  select coalesce(sum(amount), 0) into v_total from public.xp_ledger where user_id = p_user_id;
  if v_total + p_amount < 0 then
    raise exception 'xp_negative' using errcode = '22023';
  end if;
  insert into public.xp_ledger (user_id, amount, reason, ref_type, note)
  values (p_user_id, p_amount, 'admin_adjustment', 'manual', nullif(left(btrim(coalesce(p_note, '')), 200), ''));
  return jsonb_build_object('total_xp', v_total + p_amount);
end;
$$;

-- produção não concede execute automático (0010): explícito, só para logado,
-- e mesmo assim barrado por assert_admin()
revoke all on function public.admin_order_counts() from public, anon;
revoke all on function public.admin_save_order(uuid, jsonb) from public, anon;
revoke all on function public.admin_delete_order(uuid) from public, anon;
revoke all on function public.admin_adjust_xp(uuid, integer, text) from public, anon;
grant execute on function public.admin_order_counts() to authenticated;
grant execute on function public.admin_save_order(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_order(uuid) to authenticated;
grant execute on function public.admin_adjust_xp(uuid, integer, text) to authenticated;
