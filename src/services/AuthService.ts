/* Street Goose 034 — AuthService.
   Abstrai o provedor real (hoje: Supabase Auth) — a UI nunca chama
   supabase.auth diretamente. Sem credenciais configuradas, todo método
   resolve para { ok:false, reason:"not_configured" } em vez de simular
   sucesso ou travar silenciosamente. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; confirmationRequired?: boolean }
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

  async signInWithEmail(email: string, password: string, captchaToken?: string | null): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Login ainda não configurado — falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY." };
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
    if (error) return { ok: false, reason: "invalid_credentials", message:
      error.code === "email_not_confirmed" ? "Confirme seu e-mail pelo link recebido antes de entrar. Se necessário, reenvie a confirmação."
      : error.code === "captcha_failed" ? "Confirme novamente a segurança antes de entrar."
      : "E-mail ou senha não conferem. Confira os dados, confirme seu e-mail ou use o acesso por código." };
    return { ok: true };
  },

  async signUpWithEmail(name: string, email: string, password: string, captchaToken?: string | null): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Cadastro ainda não configurado — falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY." };
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/", data: { name }, ...(captchaToken ? { captchaToken } : {}) } });
    if (error) {
      const reason = /already registered|already exists/i.test(error.message) ? "email_taken" : "unknown";
      return { ok: false, reason, message: error.message };
    }
    return { ok: true, confirmationRequired: !data.session };
  },

  async sendEmailCode(email: string, captchaToken?: string | null): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Login por e-mail indisponível." };
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + "/", ...(captchaToken ? { captchaToken } : {}) } });
    if (error) {
      const message = error.code === "signup_disabled" || /signups not allowed for otp/i.test(error.message)
        ? "O acesso por código é para contas já cadastradas. Se este é seu primeiro acesso, escolha Criar conta."
        : error.code === "captcha_failed"
          ? "A confirmação de segurança expirou. Confirme novamente e tente enviar o código."
          : error.status === 429
            ? "Muitas tentativas de envio. Aguarde alguns minutos e tente novamente."
            : "Não foi possível enviar o código agora. Tente novamente em alguns instantes.";
      return { ok: false, reason: "unknown", message };
    }
    return { ok: true };
  },

  async resendConfirmation(email: string, captchaToken?: string | null): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Confirmação indisponível." };
    const { error } = await supabase.auth.resend({ type: "signup", email, options: {
      emailRedirectTo: window.location.origin + "/", ...(captchaToken ? { captchaToken } : {}),
    } });
    if (error) return { ok: false, reason: "unknown", message: error.status === 429 || /after .*seconds/i.test(error.message)
      ? "Aguarde um minuto antes de solicitar outra confirmação."
      : "Não foi possível reenviar agora. Confirme novamente a segurança e tente mais tarde." };
    return { ok: true };
  },

  async verifyEmailCode(email: string, token: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Login por e-mail indisponível." };
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error || !data.session) return { ok: false, reason: "invalid_credentials", message: "Código inválido ou expirado. Solicite outro código." };
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

  async resetPassword(email: string, captchaToken?: string | null): Promise<AuthResult> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Recuperação de senha ainda não configurada." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/conta",
      ...(captchaToken ? { captchaToken } : {}),
    });
    if (error) return { ok: false, reason: "unknown", message: error.message };
    return { ok: true };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },
};
