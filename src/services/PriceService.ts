/* Street Goose 034 — PriceService: preços da loja vindos de
   public.product_prices (leitura pública). É a mesma tabela que o
   create_whatsapp_order usa para gravar o preço do pedido, então o que o
   site mostra e o que o pedido registra saem da mesma fonte. Escrita só
   pelo painel (/admin → Preços), via AdminService + RLS de admin. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const PriceService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  /** { product_id: price_cents } da tabela inteira, ou null se não deu para ler
   *  (sem backend, rede, erro) — quem chama mantém o preço que já tinha. */
  async fetchAll(): Promise<Record<string, number> | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from("product_prices").select("product_id, price_cents").range(0, 4999);
    if (error || !data) return null;
    const prices: Record<string, number> = {};
    for (const row of data) prices[row.product_id] = row.price_cents;
    return prices;
  },
};
