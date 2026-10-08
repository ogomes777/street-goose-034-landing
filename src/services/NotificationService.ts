/* Street Goose 034 — NotificationService: preferências de notificação.
   Sem provedor de e-mail configurado, nada é "enviado" — só a preferência é
   salva. Envio real (pedido, cupom, nível, postagem aprovada, newsletter)
   precisa de um provedor (Resend, Postmark, SES...) chamado por Edge
   Function no evento correspondente, não incluído aqui por depender da
   escolha do provedor. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface NotificationPrefs {
  orderUpdates: boolean;
  couponUnlocked: boolean;
  rewardUnlocked: boolean;
  levelUp: boolean;
  postApproved: boolean;
  newsletter: boolean;
}

const DEFAULTS: NotificationPrefs = {
  orderUpdates: true,
  couponUnlocked: true,
  rewardUnlocked: true,
  levelUp: true,
  postApproved: true,
  newsletter: false,
};

export const NotificationService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },
  emailProviderConfigured(): boolean {
    return false; // nenhum provedor de e-mail integrado ainda — ver comentário acima
  },
  defaults(): NotificationPrefs {
    return { ...DEFAULTS };
  },
  async getMine(): Promise<NotificationPrefs> {
    if (!supabase) return this.defaults();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return this.defaults();
    const raw = auth.user.user_metadata?.notification_prefs as Partial<NotificationPrefs> | undefined;
    return { ...DEFAULTS, ...raw };
  },
  async updateMine(prefs: Partial<NotificationPrefs>): Promise<boolean> {
    if (!supabase) return false;
    const current = await this.getMine();
    const { error } = await supabase.auth.updateUser({ data: { notification_prefs: { ...current, ...prefs } } });
    return !error;
  },
};
