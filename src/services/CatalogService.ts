/* Street Goose 034 — CatalogService: camada de produtos do banco
   (public.products, leitura pública). Peça de fábrica com ajuste (nome,
   fotos, oculta, esgotada, posição) e produtos criados no painel. Escrita só
   pelo painel (AdminService + RLS de admin, migration 0102). */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface CatalogRow {
  id: string;
  category: string;
  name: string | null;
  description: string | null;
  images: string[];
  hidden: boolean;
  sold_out: boolean;
  sort_order: number | null;
  is_custom: boolean;
}

export const CATALOG_COLUMNS = "id, category, name, description, images, hidden, sold_out, sort_order, is_custom";

const STORAGE_BASE = isSupabaseConfigured
  ? String(import.meta.env.VITE_SUPABASE_URL).replace(/\/$/, "") + "/storage/v1/object/public/products/"
  : "";

export const CatalogService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  /** URL pública de uma foto no bucket 'products' ('<id>/<arquivo>'). */
  storageUrl(path: string): string | null {
    if (!STORAGE_BASE || !/^[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(path)) return null;
    return STORAGE_BASE + path;
  },

  /** Linhas da camada, ou null se não deu para ler — quem chama mantém o que tinha. */
  async fetchRows(): Promise<CatalogRow[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from("products").select(CATALOG_COLUMNS).range(0, 4999);
    if (error || !data) return null;
    return data as CatalogRow[];
  },
};
