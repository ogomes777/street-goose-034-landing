/* Street Goose 034 — cliente Supabase centralizado.
   Sem VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY configuradas, `client` é null
   e `isConfigured` é false — todo serviço que depende de backend checa isso
   e retorna um estado "não configurado" explícito em vez de falhar
   silenciosamente ou fingir sucesso. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Street Goose] Supabase não configurado — VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes. " +
      "Login, favoritos sincronizados, pedidos, XP, ranking, recompensas e comunidade ficam indisponíveis " +
      "até essas variáveis serem definidas (ver .env.example).",
  );
}
