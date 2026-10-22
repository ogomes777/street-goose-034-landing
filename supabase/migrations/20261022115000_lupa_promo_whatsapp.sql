-- SG034: explicit eligibility for the public 2-lupa offer.
-- Default OFF: only the owner can mark real selected models in /admin.
alter table public.product_prices
 add column if not exists promo_lupa_eligible boolean not null default false;
alter table public.orders
 add column if not exists promo_discount_cents integer not null default 0,
 add column if not exists promotion_code text;
alter table public.product_prices
 add constraint sg_promo_only_lupas check (not promo_lupa_eligible or product_id like 'lupa-%');

CREATE OR REPLACE FUNCTION public.create_whatsapp_order(p_items jsonb, p_shipping jsonb, p_idempotency_key text, p_coupon text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_qty integer;
  v_pid text;
  v_price integer;
  v_total integer := 0;
  v_ship jsonb := '{}'::jsonb;
  v_field text;
  v_check jsonb;
  v_code text;
  v_discount integer;
  v_promo integer := 0;
begin
  if v_user is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) > 100 then
    raise exception 'bad_idempotency_key' using errcode = '22023';
  end if;

  select id into v_order from public.orders
   where idempotency_key = p_idempotency_key and user_id = v_user;
  if v_order is not null then
    return v_order;
  end if;

  if not public.sg_rate_ok('order', v_user::text, 10, interval '1 hour') then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  if jsonb_typeof(p_shipping) = 'object' then
    foreach v_field in array array['name','email','phone','cep','street','number','complement','neighborhood','city','state'] loop
      v_ship := v_ship || jsonb_build_object(v_field, coalesce(public.sg_clean_text(p_shipping ->> v_field, 160), ''));
    end loop;
  end if;

  insert into public.orders (user_id, status, subtotal_cents, total_cents, shipping_address, payment_method, idempotency_key)
  values (v_user, 'pending_payment', 0, 0, v_ship, 'whatsapp', p_idempotency_key)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(20, coalesce((v_item ->> 'qty')::integer, 1)));
    v_pid := coalesce(public.sg_clean_text(v_item ->> 'product_id', 120), 'unknown');
    select price_cents into v_price from public.product_prices where product_id = v_pid;
    v_price := coalesce(v_price, 0);
    v_total := v_total + v_price * v_qty;
    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, qty)
    values (v_order, v_pid, coalesce(public.sg_clean_text(v_item ->> 'product_name', 200), 'Produto'), v_price, v_qty);
  end loop;

  update public.orders set subtotal_cents = v_total, total_cents = v_total where id = v_order;

  -- Promoção de duas lupas: SÓ modelos ativados em product_prices pelo admin.
  -- Calcula desconto sobre preço REAL gravado em order_items, nunca no JS.
  with eligible as (
    select oi.unit_price_cents,
      row_number() over(order by oi.unit_price_cents desc, oi.product_id) as seq
    from public.order_items oi
    join public.product_prices pp on pp.product_id=oi.product_id
    cross join lateral generate_series(1,least(oi.qty,20)) units
    where oi.order_id=v_order and pp.promo_lupa_eligible=true
      and oi.product_id like 'lupa-%' and oi.unit_price_cents > 0
  )
  select coalesce(sum(greatest(0, a.unit_price_cents+b.unit_price_cents-29000)),0)
  into v_promo from eligible a join eligible b on b.seq=a.seq+1
  where mod(a.seq,2)=1;
  if v_promo > 0 then
    update public.orders
      set promo_discount_cents=v_promo,
          promotion_code='LUPAS2X290',
          discount_cents=v_promo,
          total_cents=greatest(0,v_total-v_promo)
    where id=v_order;
  end if;


  -- cupom: desconto só sobre o que tem preço; uso contado só se ainda couber
  if nullif(btrim(coalesce(p_coupon, '')), '') is not null and v_total > 0 then
    v_check := public.coupon_check(p_coupon, v_user);
    if (v_check ->> 'ok')::boolean then
      update public.coupons set uses_count = uses_count + 1
       where code = v_check ->> 'code' and (max_uses is null or uses_count < max_uses)
      returning code into v_code;
      if v_code is not null then
        v_discount := case
          when v_check ->> 'discount_percent' is not null then round((v_total-v_promo) * (v_check ->> 'discount_percent')::numeric / 100)::integer
          else least(greatest(0,v_total-v_promo), coalesce((v_check ->> 'discount_cents')::integer, 0))
        end;
        update public.orders
           set coupon_code = v_code, discount_cents = v_promo + v_discount, total_cents = greatest(0, v_total - v_promo - v_discount)
         where id = v_order;
      end if;
    end if;
  end if;

  return v_order;
end;
$function$

