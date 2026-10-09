/* Street Goose 034 — OrderService: registra pedido no backend via RPC
   create_whatsapp_order. Preço e desconto nunca vêm do cliente: o servidor
   lê product_prices e aplica o cupom (migration 0104); o pedido gravado é a
   fonte do total que vai na mensagem do WhatsApp. */
import { supabase } from "../lib/supabase";

export interface OrderItemInput {
  productId: string;
  productName: string;
  qty: number;
}

export type CouponCheck =
  | { ok: true; code: string; discountPercent: number | null; discountCents: number | null }
  | { ok: false; reason: string };

export interface OrderSummary {
  id: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
}

export const OrderService = {
  async createWhatsAppOrder(
    items: OrderItemInput[],
    shipping: Record<string, string>,
    idempotencyKey: string,
    couponCode: string | null = null,
  ): Promise<{ ok: true; orderId: string } | { ok: false; reason: "not_configured" | "auth_required" | "error" }> {
    if (!supabase) return { ok: false, reason: "not_configured" };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "auth_required" };
    const { data, error } = await supabase.rpc("create_whatsapp_order", {
      p_items: items.map((i) => ({ product_id: i.productId, product_name: i.productName, qty: i.qty })),
      p_shipping: shipping,
      p_idempotency_key: idempotencyKey,
      p_coupon: couponCode,
    });
    if (error || !data) return { ok: false, reason: "error" };
    return { ok: true, orderId: data as string };
  },

  /** Prévia do cupom (mesma regra do servidor; precisa estar logado). */
  async validateCoupon(code: string): Promise<CouponCheck> {
    if (!supabase) return { ok: false, reason: "not_configured" };
    const { data, error } = await supabase.rpc("validate_coupon", { p_code: code.trim() });
    if (error || !data) return { ok: false, reason: "network_error" };
    const res = data as { ok: boolean; reason?: string; code?: string; discount_percent?: number | null; discount_cents?: number | null };
    if (!res.ok) return { ok: false, reason: res.reason ?? "invalid" };
    return { ok: true, code: res.code as string, discountPercent: res.discount_percent ?? null, discountCents: res.discount_cents ?? null };
  },

  /** Totais do pedido como o servidor gravou (desconto real do cupom). */
  async getSummary(orderId: string): Promise<OrderSummary | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("orders")
      .select("id, subtotal_cents, discount_cents, total_cents, coupon_code")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      subtotalCents: data.subtotal_cents,
      discountCents: data.discount_cents ?? 0,
      totalCents: data.total_cents,
      couponCode: data.coupon_code,
    };
  },
};
