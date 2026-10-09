/* Street Goose 034 — AdminService: dados do painel do lojista (/admin).
   Toda autorização é do banco (migration 0100: is_admin(), RPCs admin_* e
   policies de RLS). Este serviço só chama — um não-admin que chegasse aqui
   receberia 'forbidden' / zero linhas, não dados. Nunca usa service_role. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { CATALOG_COLUMNS, type CatalogRow } from "./CatalogService";

export type OrderStatus = "pending_payment" | "paid" | "fulfilled" | "cancelled" | "refunded";
export type PostStatus = "pending" | "approved" | "rejected";

export interface AdminOverview {
  orders_pending: number;
  orders_paid_30d: number;
  revenue_30d_cents: number;
  posts_pending: number;
  customers: number;
  newsletter_active: number;
  // financeiro (0106)
  receivable_cents: number;
  in_30d_cents: number;
  out_30d_cents: number;
  balance_cents: number;
  spark: FinancePoint[];
}

export type FinanceKind = "in" | "out";
export type FinanceBucket = "day" | "week" | "month";

export interface FinancePoint {
  d: string;
  in: number;
  out: number;
}

export interface FinanceSummary {
  from: string;
  to: string;
  bucket: FinanceBucket;
  balance_cents: number;
  in_cents: number;
  out_cents: number;
  prev_in_cents: number;
  prev_out_cents: number;
  sales_count: number;
  sales_cents: number;
  avg_ticket_cents: number;
  refunds_cents: number;
  receivable_cents: number;
  receivable_count: number;
  by_category: { kind: FinanceKind; category: string; cents: number; count: number }[];
  series: FinancePoint[];
  top_products: { product_id: string; name: string; qty: number; cents: number }[];
}

export interface FinanceEntry {
  id: string;
  kind: FinanceKind;
  amount_cents: number;
  category: string;
  description: string | null;
  occurred_at: string;
  order_id: string | null;
  order_status: string | null;
  source: "order" | "manual";
  created_at: string;
}

export interface FinanceEntryInput {
  kind: FinanceKind;
  category: string;
  amount_cents: number;
  description: string;
  occurred_at: string;
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
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  coupon_code: string | null;
  shipping_address: Record<string, string> | null;
  payment_method: string | null;
  payment_provider_ref: string | null;
  tracking_code: string | null;
  staff_note: string | null;
  source: "site" | "admin";
  created_at: string;
  updated_at: string;
  /** null = pedido sem conta no site (manual) */
  customer: { id: string; email: string | null; display_name: string | null } | null;
  items: AdminOrderItem[];
}

export type OrderCounts = Record<OrderStatus | "all", number>;

/** Pedido completo para criar/salvar (migration 0103: admin_save_order). */
export interface AdminOrderInput {
  status: OrderStatus;
  customer_email: string;
  shipping: Record<string, string>;
  items: Array<{ product_id: string; product_name: string; qty: number; unit_price_cents: number }>;
  shipping_cents: number;
  discount_cents: number;
  payment_method: "whatsapp" | "pix" | "cartao" | "dinheiro" | "outro";
  tracking_code: string;
  staff_note: string;
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
  featured: boolean;
  like_count: number;
  image_width: number | null;
  image_height: number | null;
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
  /** quantas vezes cada cliente pode usar (null = sem limite) — migration 0104 */
  per_customer_limit: number | null;
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

export interface AdminPrice {
  product_id: string;
  price_cents: number;
  updated_at: string;
}

export type AdminResult<T> = { ok: true; data: T } | { ok: false; reason: string; message: string };

/** fuso de quem abre o painel — dias do financeiro agrupados no calendário local (0107) */
function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

const MESSAGES: Record<string, string> = {
  amount_too_large: "Valor acima do limite de R$ 20 milhões por lançamento.",
  not_configured: "Backend não configurado.",
  forbidden: "Acesso restrito à equipe Street Goose.",
  total_required: "Defina o total do pedido antes de marcar como pago.",
  order_not_found: "Pedido não encontrado.",
  post_not_found: "Publicação não encontrada.",
  post_not_approved: "Só foto aprovada pode ir para os destaques.",
  finance_invalid_amount: "Informe um valor maior que zero.",
  invalid_category: "Escolha uma categoria.",
  invalid_date: "Data inválida.",
  not_editable: "Lançamento de pedido é automático — mexa no pedido, não aqui.",
  reason_required: "Informe o motivo da rejeição.",
  invalid_price: "Preço inválido.",
  invalid_total: "Total inválido.",
  duplicate: "Já existe um cupom com esse código.",
  customer_not_found: "Nenhuma conta do site com esse e-mail. Deixe vazio para pedido sem conta.",
  delete_not_allowed: "Só pedido aguardando ou cancelado pode ser excluído. Cancele antes, se for o caso.",
  items_required: "Adicione pelo menos um item.",
  too_many_items: "No máximo 50 itens por pedido.",
  invalid_qty: "Quantidade de 1 a 99 por item.",
  item_name_required: "Todo item precisa de um nome.",
  invalid_payment: "Forma de pagamento inválida.",
  invalid_amount: "Informe uma quantidade de XP diferente de zero.",
  xp_negative: "O XP do cliente não pode ficar negativo.",
  invalid_order: "Dados do pedido inválidos.",
  upload_failed: "Falha no envio da foto.",
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
    return rpc<AdminOverview>("admin_overview", { p_tz: localTimeZone() });
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

  orderCounts(): Promise<AdminResult<OrderCounts>> {
    return rpc<OrderCounts>("admin_order_counts");
  },

  /** orderId null = pedido novo (manual). Itens substituem os anteriores. */
  async saveOrder(orderId: string | null, order: AdminOrderInput): Promise<AdminResult<{ id: string; short_id: string; total_cents: number; status: OrderStatus }>> {
    const res = await rpc<{ id: string; short_id: string; total_cents: number; status: OrderStatus; error?: string }>("admin_save_order", { p_order_id: orderId, p_order: order });
    if (res.ok && res.data.error) return fail(res.data.error);
    return res;
  },

  deleteOrder(orderId: string): Promise<AdminResult<unknown>> {
    return rpc("admin_delete_order", { p_order_id: orderId });
  },

  adjustXp(userId: string, amount: number, note: string): Promise<AdminResult<{ total_xp: number }>> {
    return rpc("admin_adjust_xp", { p_user_id: userId, p_amount: amount, p_note: note || null });
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
  // status "featured" = só os destaques da home (0105)
  async listPosts(status: PostStatus | "featured" | null): Promise<AdminResult<AdminPost[]>> {
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

  // destaque abre o mural da home; só post aprovado (0105)
  async featurePost(postId: string, featured: boolean): Promise<AdminResult<unknown>> {
    const res = await rpc<{ ok: boolean; reason?: string }>("admin_feature_post", { p_post_id: postId, p_featured: featured });
    if (res.ok && res.data && res.data.ok === false) return fail(res.data.reason === "not_approved" ? "post_not_approved" : "post_not_found");
    return res;
  },

  // ---------- financeiro (0106) ----------
  // venda/estorno entram sozinhos pelo pedido; aqui só o resumo, a lista e
  // os lançamentos manuais (erros de validação voltam como dado)
  financeSummary(from: string | null, to: string | null, bucket: FinanceBucket): Promise<AdminResult<FinanceSummary>> {
    return rpc<FinanceSummary>("admin_finance_summary", { p_from: from, p_to: to, p_bucket: bucket, p_tz: localTimeZone() });
  },

  async listFinance(opts: { from: string | null; to: string | null; kind: FinanceKind | null; search: string; limit?: number }): Promise<AdminResult<{ total: number; items: FinanceEntry[] }>> {
    return rpc<{ total: number; items: FinanceEntry[] }>("admin_list_finance", {
      p_from: opts.from, p_to: opts.to, p_kind: opts.kind, p_search: opts.search.trim() || null, p_limit: opts.limit ?? 200, p_offset: 0,
    });
  },

  async saveFinanceEntry(id: string | null, entry: FinanceEntryInput): Promise<AdminResult<{ id: string }>> {
    const res = await rpc<{ ok?: boolean; id?: string; error?: string }>("admin_save_finance_entry", { p_id: id, p_entry: entry });
    if (!res.ok) return res as AdminResult<{ id: string }>;
    // invalid_amount já é a mensagem do XP; aqui é valor em dinheiro
    if (res.data.error) return fail(res.data.error === "invalid_amount" ? "finance_invalid_amount" : res.data.error);
    return { ok: true, data: { id: res.data.id as string } };
  },

  async deleteFinanceEntry(id: string): Promise<AdminResult<unknown>> {
    const res = await rpc<{ ok?: boolean; error?: string }>("admin_delete_finance_entry", { p_id: id });
    if (!res.ok) return res;
    if (res.data.error) return fail(res.data.error);
    return { ok: true, data: null };
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
      per_customer_limit: coupon.per_customer_limit,
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

  // ---------- produtos (migration 0102: camada sobre o catálogo de fábrica) ----------
  async listProducts(): Promise<AdminResult<Record<string, CatalogRow>>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase.from("products").select(CATALOG_COLUMNS).range(0, 4999);
    if (error) return fromError(error);
    const byId: Record<string, CatalogRow> = {};
    for (const row of (data ?? []) as CatalogRow[]) byId[row.id] = row;
    return { ok: true, data: byId };
  },

  /** Cria/atualiza linhas (só as colunas enviadas mudam). category é obrigatório
   *  para linha nova; is_custom só vale na criação (createProduct). */
  async saveProducts(rows: Array<Partial<CatalogRow> & { id: string; category: string }>): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const clean = rows.map((r) => {
      const { is_custom: _ignored, ...rest } = r;
      return rest;
    });
    const { data, error } = await supabase.from("products").upsert(clean, { onConflict: "id" }).select("id");
    if (error) return fromError(error);
    if ((data ?? []).length !== rows.length) return fail("forbidden");
    return { ok: true, data: null };
  },

  async createProduct(row: Omit<CatalogRow, "is_custom" | "hidden" | "sold_out"> & { hidden?: boolean; sold_out?: boolean }): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase.from("products").insert({ ...row, is_custom: true }).select("id");
    if (error) return fromError(error);
    if ((data ?? []).length !== 1) return fail("forbidden");
    return { ok: true, data: null };
  },

  /** Apaga a linha: peça de fábrica volta ao original; criada no painel some. */
  async deleteProduct(id: string): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return fromError(error);
    return { ok: true, data: null };
  },

  /** Sobe uma foto já otimizada para products/<id>/... e devolve o caminho. */
  async uploadProductImage(productId: string, blob: Blob): Promise<AdminResult<string>> {
    if (!supabase) return fail("not_configured");
    const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    const path = productId + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + "." + ext;
    const { error } = await supabase.storage.from("products").upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) return fail("upload_failed", "Falha ao enviar a foto: " + error.message);
    return { ok: true, data: path };
  },

  async removeProductImages(paths: string[]): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    if (!paths.length) return { ok: true, data: null };
    const { error } = await supabase.storage.from("products").remove(paths);
    if (error) return fail("upload_failed", "Falha ao apagar fotos: " + error.message);
    return { ok: true, data: null };
  },

  // ---------- preços (migration 0101: escrita só admin) ----------
  async listPrices(): Promise<AdminResult<Record<string, AdminPrice>>> {
    if (!supabase) return fail("not_configured");
    const { data, error } = await supabase.from("product_prices").select("product_id, price_cents, updated_at").range(0, 4999);
    if (error) return fromError(error);
    const byId: Record<string, AdminPrice> = {};
    for (const row of (data ?? []) as AdminPrice[]) byId[row.product_id] = row;
    return { ok: true, data: byId };
  },

  async setPrices(rows: Array<{ productId: string; priceCents: number }>): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    if (rows.some((r) => !Number.isInteger(r.priceCents) || r.priceCents <= 0)) return fail("invalid_price");
    // .select() devolve as linhas gravadas: RLS que barrasse em silêncio
    // apareceria como "0 linhas" em vez de sucesso falso
    const { data, error } = await supabase
      .from("product_prices")
      .upsert(rows.map((r) => ({ product_id: r.productId, price_cents: r.priceCents })), { onConflict: "product_id" })
      .select("product_id");
    if (error) return fromError(error);
    if ((data ?? []).length !== rows.length) return fail("forbidden");
    return { ok: true, data: null };
  },

  async clearPrices(productIds: string[]): Promise<AdminResult<null>> {
    if (!supabase) return fail("not_configured");
    const { error } = await supabase.from("product_prices").delete().in("product_id", productIds);
    if (error) return fromError(error);
    return { ok: true, data: null };
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
