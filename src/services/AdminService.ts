/* Street Goose 034 — AdminService: dados do painel do lojista (/admin).
   Toda autorização é do banco (migration 0010: is_admin(), RPCs admin_* e
   policies de RLS). Este serviço só chama — um não-admin que chegasse aqui
   receberia 'forbidden' / zero linhas, não dados. Nunca usa service_role. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type OrderStatus = "pending_payment" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type PostStatus = "pending" | "approved" | "rejected";

export interface AdminOverview {
  orders_pending: number;
  orders_paid_30d: number;
  revenue_30d_cents: number;
  posts_pending: number;
  customers: number;
  newsletter_active: number;
}

export interface AdminOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  qty: number;
}

export interface AdminOrder {
  id: string;
  short_id: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  coupon_code: string | null;
  shipping_address: Record<string, string> | null;
  payment_method: string | null;
  payment_provider_ref: string | null;
  staff_note: string | null;
  created_at: string;
  updated_at: string;
  customer: { id: string | null; email: string | null; display_name: string | null };
  items: AdminOrderItem[];
}

export interface AdminOrderUpdate {
  status?: OrderStatus;
  itemPrices?: Array<{ id: string; unitPriceCents: number }>;
  totalCents?: number;
  staffNote?: string;
}

export interface AdminCustomer {
  id: string;
  email: string | null;
  display_name: string | null;
  public_handle: string | null;
  ranking_opt_in: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  order_count: number;
  paid_order_count: number;
  total_spent_cents: number;
  total_xp: number;
  level: number;
  is_admin: boolean;
  newsletter: boolean;
}

export interface AdminPost {
  id: string;
  image_path: string;
  image_url: string;
  caption: string | null;
  product_id: string | null;
  rating: number | null;
  status: PostStatus;
  rejection_reason: string | null;
  created_at: string;
  moderated_at: string | null;
  author: { id: string | null; email: string | null; display_name: string | null; public_handle: string | null };
}

export interface AdminCoupon {
  code: string;
  discount_percent: number | null;
  discount_cents: number | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
}

export interface AdminReward {
  id: string;
  title: string;
  description: string;
  kind: "coupon" | "gift" | "discount";
  requirement_level: number | null;
  coupon_code: string | null;
  discount_percent: number | null;
  active: boolean;
  created_at: string;
  redemptions: number;
}

export interface AdminLevel {
  level_number: number;
  name: string;
  xp_required: number;
}

export interface NewsletterSubscriber {
  email: string;
  locale: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export type AdminResult<T> = { ok: true; data: T } | { ok: false; reason: string; message: string };

const MESSAGES: Record<string, string> = {
  not_configured: "Backend não configurado.",
  forbidden: "Acesso restrito à equipe Street Goose.",
  total_required: "Defina o total do pedido antes de marcar como pago.",
  order_not_found: "Pedido não encontrado.",
  post_not_found: "Publicação não encontrada.",
  reason_required: "Informe o motivo da rejeição.",
  invalid_price: "Preço inválido.",
  invalid_total: "Total inválido.",
  duplicate: "Já existe um cupom com esse código.",
};

function fail<T>(reason: string, detail?: string): AdminResult<T> {
  return { ok: false, reason, message: MESSAGES[reason] ?? detail ?? "Não foi possível concluir agora." };
}

function fromError<T>(error: { message?: string; code?: string } | null): AdminResult<T> {
  const raw = error?.message ?? "";
  if (error?.code === "23505") return fail("duplicate");
  if (error?.code === "42501" || /forbidden|row-level security/i.test(raw)) return fail("forbidden");
  const known = Object.keys(MESSAGES).find((key) => raw === key);
  return fail(known ?? "unknown", raw || undefined);
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<AdminResult<T>> {
  if (!supabase) return fail("not_configured");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return fromError(error);
  return { ok: true, data: data as T };
}

export const AdminService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  /** false para visitante, cliente comum e qualquer erro — o gate da UI. */
  async isAdmin(): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  },

  overview(): Promise<AdminResult<AdminOverview>> {
    return rpc<AdminOverview>("admin_overview");
  },

  // ---------- pedidos ----------
  listOrders(filter: { status?: OrderStatus | null; search?: string } = {}): Promise<AdminResult<AdminOrder[]>> {
    return rpc<AdminOrder[]>("admin_list_orders", {
      p_status: filter.status ?? null,
      p_search: filter.search?.trim() || null,
      p_limit: 200,
      p_offset: 0,
    });
  },

  updateOrder(orderId: string, patch: AdminOrderUpdate): Promise<AdminResult<AdminOrder>> {
    return rpc<AdminOrder>("admin_update_order", {
      p_order_id: orderId,
      p_status: patch.status ?? null,
      p_item_prices: patch.itemPrices ? patch.itemPrices.map((i) => ({ id: i.id, unit_price_cents: i.unitPriceCents })) : null,
      p_total_cents: patch.totalCents ?? null,
      p_staff_note: patch.staffNote ?? null,
    });
  },

  // ---------- clientes ----------
  listCustomers(search = ""): Promise<AdminResult<AdminCustomer[]>> {
    return rpc<AdminCustomer[]>("admin_list_customers", { p_search: search.trim() || null, p_limit: 1000, p_offset: 0 });
  },

  // ---------- comunidade ----------
  async listPosts(status: PostStatus | null): Promise<AdminResult<AdminPost[]>> {
    const res = await rpc<Omit<AdminPost, "image_url">[]>("admin_list_community_posts", { p_status: status, p_limit: 120, p_offset: 0 });
    if (!res.ok || !supabase) return res as AdminResult<AdminPost[]>;
    const paths = res.data.map((p) => p.image_path);
    const urls = new Map<string, string>();
    if (paths.length) {
      // uma chamada para todas — policy "community bucket: admin reads all"
      const { data } = await supabase.storage.from("community").createSignedUrls(paths, 3600);
      (data ?? []).forEach((s) => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
    }
    return { ok: true, data: res.data.map((p) => ({ ...p, image_url: urls.get(p.image_path) ?? "" })) };
  },

  moderatePost(postId: string, status: PostStatus, reason?: string): Promise<AdminResult<unknown>> {
    return rpc("admin_moderate_post", { p_post_id: postId, p_status: status, p_reason: reason?.trim() || null });
  },

  // ---------- cupons ----------
  async listCoupons(): Promise<AdminResult<AdminCoupon[]>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase.from("coupons").select("*").order("active", { ascending: false }).order("code");
    if (error) return fromError(error);
    return { ok: true, data: (data ?? []) as AdminCoupon[] };
  },

  async saveCoupon(coupon: Omit<AdminCoupon, "uses_count">, isNew: boolean): Promise<AdminResult<AdminCoupon>> {
    if (!supabase) return fail("not_configured");
    const row = {
      code: coupon.code.trim().toUpperCase(),
      discount_percent: coupon.discount_percent,
      discount_cents: coupon.discount_cents,
      max_uses: coupon.max_uses,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      active: coupon.active,
    };
    const query = isNew
      ? supabase.from("coupons").insert(row).select().single()
      : supabase.from("coupons").update(row).eq("code", row.code).select().single();
    const { data, error } = await query;
    if (error) return fromError(error);
    return { ok: true, data: data as AdminCoupon };
  },

  async setCouponActive(code: string, active: boolean): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { error } = await supabase.from("coupons").update({ active }).eq("code", code);
    if (error) return fromError(error);
    return { ok: true, data: null };
  },

  // ---------- recompensas ----------
  async listRewards(): Promise<AdminResult<AdminReward[]>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase
      .from("rewards")
      .select("*, reward_redemptions(count)")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return fromError(error);
    return {
      ok: true,
      data: (data ?? []).map((r: Record<string, any>) => {
        const { reward_redemptions: counts, ...rest } = r;
        return { ...(rest as Omit<AdminReward, "redemptions">), redemptions: Number(counts?.[0]?.count ?? 0) };
      }),
    };
  },

  async saveReward(reward: Omit<AdminReward, "id" | "created_at" | "redemptions"> & { id?: string }): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const row = {
      title: reward.title.trim(),
      description: reward.description.trim(),
      kind: reward.kind,
      requirement_level: reward.requirement_level,
      coupon_code: reward.coupon_code?.trim().toUpperCase() || null,
      discount_percent: reward.discount_percent,
      active: reward.active,
    };
    const { error } = reward.id
      ? await supabase.from("rewards").update(row).eq("id", reward.id)
      : await supabase.from("rewards").insert(row);
    if (error) return fromError(error);
    return { ok: true, data: null };
  },

  async setRewardActive(id: string, active: boolean): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { error } = await supabase.from("rewards").update({ active }).eq("id", id);
    if (error) return fromError(error);
    return { ok: true, data: null };
  },

  async listLevels(): Promise<AdminLevel[]> {
    if (!supabase) return [];
    const { data } = await supabase.from("levels").select("level_number, name, xp_required").order("level_number");
    return (data ?? []) as AdminLevel[];
  },

  // ---------- newsletter ----------
  async listNewsletter(): Promise<AdminResult<NewsletterSubscriber[]>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false })
      .limit(10000);
    if (error) return fromError(error);
    return { ok: true, data: (data ?? []) as NewsletterSubscriber[] };
  },

  async setNewsletterSubscribed(email: string, subscribed: boolean): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: subscribed ? null : new Date().toISOString() })
      .eq("email", email);
    if (error) return fromError(error);
    return { ok: true, data: null };
  },
};
