/* Street Goose 034 — CAPTCHA (Cloudflare Turnstile) para login, cadastro e
   recuperação de senha. O Supabase Auth valida o token no servidor quando
   "Bot and Abuse Protection" está ligado no painel com a chave secreta do
   Turnstile. Sem VITE_TURNSTILE_SITE_KEY, nada é carregado e os fluxos
   seguem como antes — ligar o CAPTCHA é só configuração, sem deploy de código.
   Ordem para ativar: (1) VITE_TURNSTILE_SITE_KEY na Vercel + redeploy;
   (2) só então ligar o CAPTCHA no Supabase (senão o login para de aceitar). */
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export const captchaEnabled = Boolean(siteKey);

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
type TurnstileWindow = Window & { turnstile?: TurnstileApi };

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as TurnstileWindow;
  if (w.turnstile) return Promise.resolve(w.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error("turnstile_missing")));
      s.onerror = () => { scriptPromise = null; reject(new Error("turnstile_load_failed")); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

function siteTheme(): "light" | "dark" {
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export interface CaptchaHandle {
  getToken(): string | null;
  reset(): void;
  destroy(): void;
}

/* Monta o widget dentro de `container`. Retorna null quando o CAPTCHA não
   está configurado (fluxo segue sem token). */
export async function mountCaptcha(container: HTMLElement): Promise<CaptchaHandle | null> {
  if (!siteKey) return null;
  let token: string | null = null;
  const api = await loadTurnstile();
  const id = api.render(container, {
    sitekey: siteKey,
    // acompanha o tema efetivo do site (data-theme ou preferência do sistema)
    theme: siteTheme(),
    language: document.documentElement.lang || "pt-BR",
    callback: (t: string) => { token = t; },
    "expired-callback": () => { token = null; },
    "error-callback": () => { token = null; },
  });
  return {
    getToken: () => token,
    // token do Turnstile é de uso único: renova depois de cada tentativa
    reset: () => { token = null; api.reset(id); },
    destroy: () => { try { api.remove(id); } catch { /* já removido */ } },
  };
}
