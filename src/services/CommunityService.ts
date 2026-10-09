/* Street Goose 034 — CommunityService: a rede social da marca.
   Upload vai para o bucket privado 'community'; o post nasce 'pending' e só
   fica público quando a equipe aprova (painel). O feed público vem de
   community_feed (0105): autor como @apelido ou primeiro nome, nível, peça
   marcada, curtidas. Fotos aprovadas são servidas por URL assinada (uma
   chamada para o lote inteiro). */
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type PostStatus = "pending" | "approved" | "rejected";
export type FeedSort = "recent" | "top" | "home";

export interface FeedAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  level: number;
  levelName: string | null;
}

export interface FeedPost {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  productId: string | null;
  createdAt: string;
  featured: boolean;
  likeCount: number;
  liked: boolean;
  mine: boolean;
  author: FeedAuthor;
}

export interface FeedStats {
  posts: number;
  members: number;
  likes: number;
}

export interface MyPost {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  productId: string | null;
  status: PostStatus;
  rejectionReason: string | null;
  featured: boolean;
  likeCount: number;
  createdAt: string;
}

/** compatibilidade com quem ainda importa o tipo antigo */
export type CommunityPost = MyPost;

export type PublishStage = "optimizing" | "uploading" | "saving";
type Result<T = object> = ({ ok: true } & T) | { ok: false; reason?: string; message: string };

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // limite do bucket (0010)
const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024; // foto de celular grande: a gente reduz antes
const MAX_EDGE = 1800; // nítido no visualizador em tela cheia, leve no feed
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface FeedRow {
  id: string;
  image_path: string;
  image_width: number | null;
  image_height: number | null;
  caption: string | null;
  product_id: string | null;
  created_at: string;
  featured: boolean;
  like_count: number;
  liked: boolean;
  mine: boolean;
  author: { id: string; name: string; avatar_url: string | null; level: number; level_name: string | null };
}

async function signUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!supabase || !paths.length) return urls;
  const { data } = await supabase.storage.from("community").createSignedUrls(paths, 3600);
  (data ?? []).forEach((s) => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
  return urls;
}

function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void } | null> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    }
  } catch {
    // HEIC no Chrome/Android, arquivo corrompido… tenta pelo <img> abaixo
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Reduz para no máximo MAX_EDGE, reencoda (some EXIF/GPS do celular) e
 *  devolve a proporção. Sem conseguir ler (HEIC fora do Safari), usa o
 *  arquivo original se couber no bucket. */
async function prepareImage(file: File): Promise<Result<{ blob: Blob; ext: string; width: number | null; height: number | null }>> {
  const decoded = await decode(file);
  if (!decoded) {
    if (file.size <= MAX_UPLOAD_BYTES) {
      const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "jpg").toLowerCase();
      return { ok: true, blob: file, ext, width: null, height: null };
    }
    return { ok: false, reason: "unreadable", message: "Não deu para ler essa foto aqui. Envie em JPG ou PNG." };
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { decoded.release(); return { ok: false, reason: "unreadable", message: "Não deu para preparar a foto neste aparelho." }; }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded.source, 0, 0, width, height);
  decoded.release();
  let blob = await toBlob(canvas, "image/webp", 0.86);
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") { blob = await toBlob(canvas, "image/jpeg", 0.88); ext = "jpg"; }
  canvas.width = canvas.height = 0;
  if (!blob) return { ok: false, reason: "unreadable", message: "Não deu para preparar a foto neste aparelho." };
  if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_big", message: "Foto pesada demais mesmo depois de otimizar. Tente outra." };
  return { ok: true, blob, ext, width, height };
}

export const CommunityService = {
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  validateFile(file: File): { ok: true } | { ok: false; message: string } {
    if (!isAccepted(file)) return { ok: false, message: "Formato não aceito. Envie JPG, PNG, WEBP ou HEIC." };
    if (file.size > MAX_ORIGINAL_BYTES) return { ok: false, message: "Foto maior que 30MB. Escolha outra." };
    return { ok: true };
  },

  async getFeed(opts: { sort?: FeedSort; limit?: number; offset?: number; postId?: string | null; author?: string | null } = {}): Promise<{ items: FeedPost[]; stats: FeedStats } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("community_feed", {
      p_sort: opts.sort ?? "recent",
      p_limit: opts.limit ?? 24,
      p_offset: opts.offset ?? 0,
      p_post_id: opts.postId ?? null,
      p_author: opts.author ?? null,
    });
    if (error || !data) return null;
    const payload = data as { items: FeedRow[]; stats: FeedStats };
    const urls = await signUrls(payload.items.map((r) => r.image_path));
    return {
      stats: payload.stats,
      items: payload.items.map((r) => ({
        id: r.id,
        imageUrl: urls.get(r.image_path) ?? "",
        width: r.image_width,
        height: r.image_height,
        caption: r.caption,
        productId: r.product_id,
        createdAt: r.created_at,
        featured: r.featured,
        likeCount: r.like_count,
        liked: r.liked,
        mine: r.mine,
        author: {
          id: r.author.id,
          name: r.author.name,
          avatarUrl: r.author.avatar_url,
          level: r.author.level,
          levelName: r.author.level_name,
        },
      })),
    };
  },

  async toggleLike(postId: string): Promise<Result<{ liked: boolean; likeCount: number }>> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Comunidade indisponível agora." };
    const { data, error } = await supabase.rpc("community_toggle_like", { p_post_id: postId });
    if (error || !data) return { ok: false, reason: "error", message: "Não foi possível curtir agora." };
    const res = data as { ok: boolean; reason?: string; liked?: boolean; like_count?: number };
    if (!res.ok) {
      const message = res.reason === "auth_required" ? "Entre na sua conta para curtir."
        : res.reason === "rate_limited" ? "Calma aí — muitas curtidas seguidas. Tenta já já."
        : "Esse post não está mais no ar.";
      return { ok: false, reason: res.reason, message };
    }
    return { ok: true, liked: !!res.liked, likeCount: res.like_count ?? 0 };
  },

  /** Como o autor aparece no feed (mesma regra do servidor). */
  async getMyPublicName(): Promise<string | null> {
    if (!supabase) return null;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("profiles").select("public_handle, display_name").eq("id", auth.user.id).maybeSingle();
    if (data?.public_handle) return "@" + data.public_handle;
    const first = (data?.display_name ?? "").trim().split(/\s+/)[0];
    return first || "Membro Street Goose";
  },

  async publish(
    file: File,
    caption: string,
    productId: string | null,
    onStage?: (stage: PublishStage) => void,
  ): Promise<Result> {
    if (!supabase) return { ok: false, message: "Publicação ainda não configurada — falta backend Supabase." };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "auth_required", message: "É preciso estar logado para publicar." };

    const valid = this.validateFile(file);
    if (!valid.ok) return valid;

    onStage?.("optimizing");
    const prepared = await prepareImage(file);
    if (!prepared.ok) return prepared;

    onStage?.("uploading");
    const path = auth.user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + prepared.ext;
    const contentType = prepared.ext === "webp" ? "image/webp" : prepared.ext === "jpg" || prepared.ext === "jpeg" ? "image/jpeg" : prepared.blob.type || "image/jpeg";
    const { error: uploadError } = await supabase.storage.from("community").upload(path, prepared.blob, { upsert: false, contentType });
    if (uploadError) return { ok: false, message: "Falha no envio da foto. Confira a conexão e tente de novo." };

    onStage?.("saving");
    // sem "status": o banco grava 'pending' e a policy da 0010 só aceita isso
    const { error: insertError } = await supabase.from("community_posts").insert({
      user_id: auth.user.id,
      image_path: path,
      caption: caption.trim() || null,
      product_id: productId,
      image_width: prepared.width,
      image_height: prepared.height,
    });
    if (insertError) {
      await supabase.storage.from("community").remove([path]).catch(() => undefined);
      return { ok: false, message: "Falha ao registrar a publicação. Tente de novo." };
    }
    return { ok: true };
  },

  async getMine(): Promise<MyPost[]> {
    if (!supabase) return [];
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase
      .from("community_posts")
      .select("id, image_path, image_width, image_height, caption, product_id, status, rejection_reason, featured, like_count, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    const urls = await signUrls(data.map((r) => r.image_path));
    return data.map((r) => ({
      id: r.id,
      imageUrl: urls.get(r.image_path) ?? "",
      width: r.image_width,
      height: r.image_height,
      caption: r.caption,
      productId: r.product_id,
      status: r.status as PostStatus,
      rejectionReason: r.rejection_reason,
      featured: !!r.featured,
      likeCount: r.like_count ?? 0,
      createdAt: r.created_at,
    }));
  },

  async deleteMine(postId: string): Promise<boolean> {
    if (!supabase) return false;
    const { error, count } = await supabase.from("community_posts").delete({ count: "exact" }).eq("id", postId);
    return !error && (count ?? 0) > 0;
  },
};
