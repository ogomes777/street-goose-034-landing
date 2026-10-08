/* Street Goose 034 — PaymentService: adapter de métodos de pagamento.
   Nenhum PSP (processador) está integrado ainda — só o handoff via WhatsApp
   é real (window.SG.waLink, já existente). Os demais métodos aparecem na UI
   como indisponíveis até um provedor (Stripe, Mercado Pago, Pagar.me...) ser
   escolhido e configurado — nunca aprovamos pagamento no cliente. */
export type PaymentMethodId = "whatsapp" | "pix" | "card" | "debit" | "boleto" | "applePay" | "googlePay";

export interface PaymentMethod {
  id: PaymentMethodId;
  labelKey: string;
  available: boolean;
}

const provider = import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined;

export const PaymentService = {
  isProviderConfigured(): boolean {
    return Boolean(provider);
  },

  listMethods(): PaymentMethod[] {
    // whatsapp é o único "provider" real hoje (handoff manual, sem cobrança
    // automática) — os demais dependem de PSP configurado via VITE_PAYMENT_PROVIDER
    return [
      { id: "whatsapp", labelKey: "checkout.payment.whatsapp", available: true },
      { id: "pix", labelKey: "checkout.payment.pix", available: this.isProviderConfigured() },
      { id: "card", labelKey: "checkout.payment.card", available: this.isProviderConfigured() },
      { id: "debit", labelKey: "checkout.payment.debit", available: this.isProviderConfigured() },
      { id: "boleto", labelKey: "checkout.payment.boleto", available: this.isProviderConfigured() },
      {
        id: "applePay",
        labelKey: "checkout.payment.applePay",
        available: this.isProviderConfigured() && typeof window !== "undefined" && "ApplePaySession" in window,
      },
      {
        id: "googlePay",
        labelKey: "checkout.payment.googlePay",
        available: this.isProviderConfigured(),
      },
    ];
  },

  // Ponto de extensão único para plugar um PSP real depois: criar a sessão
  // de pagamento numa Edge Function (nunca no cliente), confirmar via
  // webhook, então marcar o pedido como 'paid'. Sem provider configurado,
  // recusa explicitamente em vez de fingir que criou uma cobrança.
  async createPayment(_method: PaymentMethodId, _orderId: string): Promise<{ ok: true; redirectUrl?: string } | { ok: false; message: string }> {
    if (!this.isProviderConfigured()) {
      return { ok: false, message: "Nenhum provedor de pagamento configurado (VITE_PAYMENT_PROVIDER)." };
    }
    return { ok: false, message: "Integração com o provedor ainda não implementada." };
  },
};
