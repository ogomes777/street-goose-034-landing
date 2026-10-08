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
    // ranking respeita ranking_opt_in via RLS na policy de profiles — a
    // query só enxerga quem optou por aparecer
    const { data, error } = await supabase
      .from("xp_totals")
      .select("user_id, total_xp, profiles!inner(public_handle, avatar_url, ranking_opt_in)")
      .eq("profiles.ranking_opt_in", true)
      .order("total_xp", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => ({
      userId: r.user_id,
      handle: r.profiles?.public_handle ?? "Membro Street Goose",
      avatarUrl: r.profiles?.avatar_url ?? null,
      level: 1,
      totalXp: r.total_xp,
    }));
  },
};
