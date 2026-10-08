/* Street Goose 034 — CommunityService: publicação de fotos com moderação.
   Upload vai para o bucket privado 'community'; o post nasce 'pending' e só
   fica público quando aprovado (ação de moderação fora deste serviço). */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface CommunityPost {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  productId: string | null;
  rating: number | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export const CommunityService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  validateFile(file: File): { ok: true } | { ok: false; message: string } {
    if (!ACCEPTED_TYPES.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      return { ok: false, message: "Formato não aceito. Envie JPG, PNG, WEBP ou HEIC." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, message: "Imagem maior que 8MB — comprima antes de enviar." };
    }
    return { ok: true };
  },

  async publish(file: File, caption: string, productId: string | null, rating: number | null): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!supabase) return { ok: false, message: "Publicação ainda não configurada — falta backend Supabase." };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "É preciso estar logado para publicar." };

    const valid = this.validateFile(file);
    if (!valid.ok) return valid;

    const path = auth.user.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const { error: uploadError } = await supabase.storage.from("community").upload(path, file, { upsert: false });
    if (uploadError) return { ok: false, message: "Falha no upload: " + uploadError.message };

    // sem "status": o banco grava 'pending' por padrão e a 0010 só concede
    // insert nas colunas do usuário — mandar status dava 42501 e ninguém
    // conseguia publicar
    const { error: insertError } = await supabase.from("community_posts").insert({
      user_id: auth.user.id,
      image_path: path,
      caption: caption || null,
      product_id: productId,
      rating,
    });
    if (insertError) return { ok: false, message: "Falha ao registrar publicação: " + insertError.message };
    return { ok: true };
  },

  async getApprovedFeed(limit = 24): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const client = supabase;
    return Promise.all(
      data.map(async (row) => {
        const { data: signed } = await client.storage.from("community").createSignedUrl(row.image_path, 3600);
        return {
          id: row.id, userId: row.user_id, imageUrl: signed?.signedUrl ?? "",
          caption: row.caption, productId: row.product_id, rating: row.rating,
          status: row.status, createdAt: row.created_at,
        };
      }),
    );
  },

  async getMine(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase.from("community_posts").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
    if (error || !data) return [];
    const client = supabase;
    return Promise.all(
      data.map(async (row) => {
        const { data: signed } = await client.storage.from("community").createSignedUrl(row.image_path, 3600);
        return {
          id: row.id, userId: row.user_id, imageUrl: signed?.signedUrl ?? "",
          caption: row.caption, productId: row.product_id, rating: row.rating,
          status: row.status, createdAt: row.created_at,
        };
      }),
    );
  },

  async deleteMine(postId: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from("community_posts").delete().eq("id", postId);
    return !error;
  },
};
