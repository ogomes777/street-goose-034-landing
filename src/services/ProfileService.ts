/* Street Goose 034 — ProfileService: preferências e apelido público do usuário logado. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface Profile {
  id: string;
  displayName: string | null;
  publicHandle: string | null;
  avatarUrl: string | null;
  locale: "pt-BR" | "en" | "es";
  theme: "dark" | "light" | "system";
  rankingOptIn: boolean;
}

export const ProfileService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getMine(): Promise<Profile | null> {
    if (!supabase) return null;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
    if (error || !data) return null;
    return {
      id: data.id,
      displayName: data.display_name,
      publicHandle: data.public_handle,
      avatarUrl: data.avatar_url,
      locale: data.locale,
      theme: data.theme,
      rankingOptIn: data.ranking_opt_in,
    };
  },

  async updatePreferences(patch: Partial<Pick<Profile, "locale" | "theme" | "rankingOptIn" | "displayName" | "publicHandle">>): Promise<boolean> {
    if (!supabase) return false;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.locale !== undefined) row.locale = patch.locale;
    if (patch.theme !== undefined) row.theme = patch.theme;
    if (patch.rankingOptIn !== undefined) row.ranking_opt_in = patch.rankingOptIn;
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.publicHandle !== undefined) row.public_handle = patch.publicHandle;
    const { error } = await supabase.from("profiles").update(row).eq("id", auth.user.id);
    return !error;
  },
};
