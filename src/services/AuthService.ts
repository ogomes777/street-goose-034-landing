/* Street Goose 034 — AuthService.
   Abstrai o provedor real (hoje: Supabase Auth) — a UI nunca chama
   supabase.auth diretamente. Sem credenciais configuradas, todo método
   resolve para { ok:false, reason:"not_configured" } em vez de simular
   sucesso ou travar silenciosamente. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_credentials" | "email_taken" | "network_error" | "unknown"; message: string };

export const AuthService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  },

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Login ainda não configurado — falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: "invalid_credentials", message: error.message };
    return { ok: true };
  },

  async signUpWithEmail(name: string, email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Cadastro ainda não configurado — falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY." };
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      const reason = /already registered|already exists/i.test(error.message) ? "email_taken" : "unknown";
      return { ok: false, reason, message: error.message };
    }
    return { ok: true };
  },

  async signInWithOAuth(provider: "google" | "apple"): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Login com " + provider + " ainda não configurado — falta credencial do provedor no painel Supabase." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) return { ok: false, reason: "unknown", message: error.message };
    return { ok: true }; // navegador redireciona — callback tratado em AuthCallback
  },

  async resetPassword(email: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Recuperação de senha ainda não configurada." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) return { ok: false, reason: "unknown", message: error.message };
    return { ok: true };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
};
