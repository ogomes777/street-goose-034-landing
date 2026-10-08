/* Street Goose 034 — OrderService: registra pedido no backend via RPC
   create_whatsapp_order (migration 0002). Preço nunca vem do cliente —
   fica 0 até o atendimento confirmar e marcar no painel. */
import { supabase } from "../lib/supabase";

export interface OrderItemInput {
  productId: string;
  productName: string;
  qty: number;
}

export const OrderService = {
  async createWhatsAppOrder(
    items: OrderItemInput[],
    shipping: Record<string, string>,
    idempotencyKey: string,
  ): Promise<{ ok: true; orderId: string } | { ok: false; reason: "not_configured" | "auth_required" | "error" }> {
    if (!supabase) return { ok: false, reason: "not_configured" };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "auth_required" };
    const { data, error } = await supabase.rpc("create_whatsapp_order", {
      p_items: items.map((i) => ({ product_id: i.productId, product_name: i.productName, qty: i.qty })),
      p_shipping: shipping,
      p_idempotency_key: idempotencyKey,
    });
    if (error || !data) return { ok: false, reason: "error" };
    return { ok: true, orderId: data as string };
  },
};
