/* Street Goose 034 — RewardsService: XP, níveis, ranking, recompensas e cupons.
   Toda concessão de XP e validação de resgate acontece no backend (trigger/
   Edge Function) — este serviço só LÊ o ledger e a config, nunca escreve XP
   diretamente a partir de um clique de UI. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface Level {
  levelNumber: number;
  name: string;
  xpRequired: number;
  benefits: string[];
}

export interface XpStatus {
  totalXp: number;
  level: Level;
  nextLevel: Level | null;
  xpToNext: number | null;
  progressPct: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  kind: "coupon" | "gift" | "discount";
  requirementLevel: number | null;
  discountPercent: number | null;
  active: boolean;
}

export interface MyRanking {
  optedIn: boolean;
  handle: string | null;
  totalXp: number;
  level: number;
  position: number | null;
  participants: number;
}

export interface XpEntry {
  amount: number;
  reason: string;
  refType: string | null;
  note: string | null;
  createdAt: string;
}

export interface Redemption {
  rewardId: string;
  redeemedAt: string;
  title: string;
  couponCode: string | null;
  kind: string | null;
}

export interface RankingRow {
  userId: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
  totalXp: number;
}

export const RewardsService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getLevels(): Promise<Level[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("levels").select("*").order("level_number", { ascending: true });
    if (error || !data) return [];
    return data.map((r) => ({ levelNumber: r.level_number, name: r.name, xpRequired: r.xp_required, benefits: r.benefits ?? [] }));
  },

  async getMyXpStatus(): Promise<XpStatus | null> {
    if (!supabase) return null;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const [{ data: totals }, levels] = await Promise.all([
      supabase.from("xp_totals").select("total_xp").eq("user_id", auth.user.id).maybeSingle(),
      this.getLevels(),
    ]);
    const totalXp = totals?.total_xp ?? 0;
    if (!levels.length) return null;
    const sorted = [...levels].sort((a, b) => a.xpRequired - b.xpRequired);
    let current = sorted[0];
    let next: Level | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (totalXp >= sorted[i].xpRequired) current = sorted[i];
      else { next = sorted[i]; break; }
    }
    const xpToNext = next ? next.xpRequired - totalXp : null;
    const progressPct = next ? Math.min(100, Math.round(((totalXp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100)) : 100;
    return { totalXp, level: current, nextLevel: next, xpToNext, progressPct };
  },

  async getRewards(): Promise<Reward[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("rewards").select("*").eq("active", true);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id, title: r.title, description: r.description, kind: r.kind,
      requirementLevel: r.requirement_level, discountPercent: r.discount_percent, active: r.active,
    }));
  },

  async getRanking(limit = 7): Promise<RankingRow[]> {
    if (!supabase) return [];
    // RPC get_ranking (migration 0002) só devolve quem deu ranking_opt_in
    const { data, error } = await supabase.rpc("get_ranking", { p_limit: limit });
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      userId: r.user_id,
      handle: r.handle ?? "Membro Street Goose",
      avatarUrl: r.avatar_url ?? null,
      level: r.level ?? 1,
      totalXp: Number(r.total_xp) || 0,
    }));
  },

  /** Entra/sai do ranking com apelido (migration 0104: set_my_ranking). */
  async setMyRanking(optIn: boolean, handle: string | null): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!supabase) return { ok: false, reason: "not_configured" };
    const { data, error } = await supabase.rpc("set_my_ranking", { p_opt_in: optIn, p_handle: handle });
    if (error || !data) return { ok: false, reason: "network_error" };
    const res = data as { ok: boolean; reason?: string };
    return res.ok ? { ok: true } : { ok: false, reason: res.reason ?? "unknown" };
  },

  /** Posição do cliente logado (migration 0104: my_ranking). */
  async getMyRanking(): Promise<MyRanking | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("my_ranking");
    if (error || !data || !(data as { ok: boolean }).ok) return null;
    const r = data as { opted_in: boolean; handle: string | null; total_xp: number; level: number; position: number | null; participants: number };
    return { optedIn: r.opted_in, handle: r.handle, totalXp: r.total_xp, level: r.level, position: r.position, participants: r.participants };
  },

  /** Últimas movimentações de XP do próprio cliente (RLS: só as dele). */
  async getMyXpHistory(limit = 10): Promise<XpEntry[]> {
    if (!supabase) return [];
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase
      .from("xp_ledger")
      .select("amount, reason, ref_type, note, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({ amount: r.amount, reason: r.reason, refType: r.ref_type, note: r.note, createdAt: r.created_at }));
  },

  /** Recompensas que o cliente já resgatou (com o cupom, se houver). */
  async getMyRedemptions(): Promise<Redemption[]> {
    if (!supabase) return [];
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase
      .from("reward_redemptions")
      .select("reward_id, redeemed_at, rewards(title, coupon_code, kind)")
      .eq("user_id", auth.user.id)
      .order("redeemed_at", { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      rewardId: r.reward_id,
      redeemedAt: r.redeemed_at,
      title: r.rewards ? r.rewards.title : "Recompensa",
      couponCode: r.rewards ? r.rewards.coupon_code : null,
      kind: r.rewards ? r.rewards.kind : null,
    }));
  },

  async redeem(rewardId: string): Promise<{ ok: true; couponCode: string | null } | { ok: false; reason: string }> {
    if (!supabase) return { ok: false, reason: "not_configured" };
    const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });
    if (error || !data) return { ok: false, reason: "network_error" };
    const res = data as { ok: boolean; reason?: string; coupon_code?: string | null };
    return res.ok ? { ok: true, couponCode: res.coupon_code ?? null } : { ok: false, reason: res.reason ?? "unknown" };
  },
};
