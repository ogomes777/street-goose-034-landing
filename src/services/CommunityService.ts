/* Street Goose 034 — CommunityService: a rede social da marca.
   Upload vai para o bucket privado 'community'; o post nasce 'pending' e só
   fica público quando a equipe aprova (painel). O feed público vem de
   community_feed (0105/0108): autor como @apelido ou primeiro nome, nível,
   peça marcada, curtidas, comentários. Fotos aprovadas são servidas por URL
   assinada (uma chamada para o lote inteiro). Comentários e perfil público
   vêm da 0108 — sem ela no banco, essas chamadas só respondem "indisponível"
   e o resto do feed segue igual. */
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
  commentCount: number;
  liked: boolean;
  mine: boolean;
  author: FeedAuthor;
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
  author: FeedAuthor;
}

export interface CommunityProfile extends FeedAuthor {
  posts: number;
  likes: number;
  since: string | null;
  me: boolean;
}

/** Ajustes do compositor: recorte (proporção + ponto de foco, mesma lógica
 *  do object-position da prévia) e filtro aplicados na foto antes do envio. */
export interface PublishEdit {
  aspect: number | null; // largura/altura; null = original
  focusX: number; // 0..1
  focusY: number; // 0..1
  filter: string | null; // valor CSS de filter (ex.: "grayscale(1) contrast(1.15)")
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
  comment_count?: number; // 0108
  liked: boolean;
  mine: boolean;
  author: AuthorRow;
}

interface AuthorRow { id: string; name: string; avatar_url: string | null; level: number; level_name: string | null }

function mapAuthor(a: AuthorRow): FeedAuthor {
  return { id: a.id, name: a.name, avatarUrl: a.avatar_url, level: a.level, levelName: a.level_name };
}

interface CommentRow { id: string; body: string; created_at: string; mine: boolean; can_delete: boolean; author: AuthorRow }

function mapComment(r: CommentRow): CommentItem {
  return { id: r.id, body: r.body, createdAt: r.created_at, mine: !!r.mine, canDelete: !!r.can_delete, author: mapAuthor(r.author) };
}

const COMMENT_ERRORS: Record<string, string> = {
  auth_required: "Entre na sua conta para comentar.",
  rate_limited: "Muitos comentários seguidos. Respira e tenta já já.",
  empty: "Escreve alguma coisa antes de enviar.",
  too_long: "Comentário com no máximo 400 caracteres.",
  not_found: "Esse visual não está mais no ar.",
  forbidden: "Você não pode apagar esse comentário.",
};

let filterSupport: boolean | null = null;
/** ctx.filter existe e funciona de verdade (Safari antigo ignora calado):
 *  pinta um pixel vermelho em tons de cinza e confere. */
export function canvasFiltersWork(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx || typeof ctx.filter !== "string") return (filterSupport = false);
    ctx.filter = "grayscale(1)";
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    filterSupport = Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
  } catch {
    filterSupport = false;
  }
  return filterSupport;
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

/** Recorta (se pedido), aplica o filtro, reduz para no máximo MAX_EDGE,
 *  reencoda (some EXIF/GPS do celular) e devolve a proporção. Sem conseguir
 *  ler (HEIC fora do Safari), usa o arquivo original se couber no bucket. */
async function prepareImage(file: File, edit?: PublishEdit | null): Promise<Result<{ blob: Blob; ext: string; width: number | null; height: number | null }>> {
  const decoded = await decode(file);
  if (!decoded) {
    if (file.size <= MAX_UPLOAD_BYTES) {
      const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "jpg").toLowerCase();
      return { ok: true, blob: file, ext, width: null, height: null };
    }
    return { ok: false, reason: "unreadable", message: "Não deu para ler essa foto aqui. Envie em JPG ou PNG." };
  }
  // recorte = mesma conta do object-fit:cover + object-position da prévia
  let sx = 0, sy = 0, sw = decoded.width, sh = decoded.height;
  if (edit && edit.aspect && edit.aspect > 0) {
    const fx = Math.min(1, Math.max(0, edit.focusX));
    const fy = Math.min(1, Math.max(0, edit.focusY));
    if (sw / sh > edit.aspect) {
      sw = Math.round(sh * edit.aspect);
      sx = Math.round((decoded.width - sw) * fx);
    } else {
      sh = Math.round(sw / edit.aspect);
      sy = Math.round((decoded.height - sh) * fy);
    }
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { decoded.release(); return { ok: false, reason: "unreadable", message: "Não deu para preparar a foto neste aparelho." }; }
  ctx.imageSmoothingQuality = "high";
  if (edit && edit.filter && canvasFiltersWork()) ctx.filter = edit.filter;
  ctx.drawImage(decoded.source, sx, sy, sw, sh, 0, 0, width, height);
  ctx.filter = "none";
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

  /** filtros do compositor só aparecem onde o envio consegue aplicá-los */
  canFilter(): boolean {
    return canvasFiltersWork();
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
        commentCount: r.comment_count ?? 0,
        liked: r.liked,
        mine: r.mine,
        author: mapAuthor(r.author),
      })),
    };
  },

  /** null = comentários indisponíveis (rede, ou 0108 ainda não aplicada) */
  async getComments(postId: string, offset = 0, limit = 50): Promise<{ items: CommentItem[]; total: number } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("community_comments", { p_post_id: postId, p_limit: limit, p_offset: offset });
    if (error || !data) return null;
    const res = data as { ok: boolean; items?: CommentRow[]; total?: number };
    if (!res.ok) return { items: [], total: 0 };
    return { items: (res.items ?? []).map(mapComment), total: res.total ?? 0 };
  },

  async addComment(postId: string, body: string): Promise<Result<{ comment: CommentItem; commentCount: number }>> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Comunidade indisponível agora." };
    const { data, error } = await supabase.rpc("community_add_comment", { p_post_id: postId, p_body: body });
    if (error || !data) return { ok: false, reason: "error", message: "Não foi possível comentar agora." };
    const res = data as { ok: boolean; reason?: string; comment?: CommentRow; comment_count?: number };
    if (!res.ok || !res.comment) {
      return { ok: false, reason: res.reason, message: COMMENT_ERRORS[res.reason ?? ""] ?? "Não foi possível comentar agora." };
    }
    return { ok: true, comment: mapComment(res.comment), commentCount: res.comment_count ?? 0 };
  },

  async deleteComment(commentId: string): Promise<Result<{ commentCount: number }>> {
    if (!supabase) return { ok: false, reason: "not_configured", message: "Comunidade indisponível agora." };
    const { data, error } = await supabase.rpc("community_delete_comment", { p_comment_id: commentId });
    if (error || !data) return { ok: false, reason: "error", message: "Não foi possível apagar agora." };
    const res = data as { ok: boolean; reason?: string; comment_count?: number };
    if (!res.ok) return { ok: false, reason: res.reason, message: COMMENT_ERRORS[res.reason ?? ""] ?? "Não foi possível apagar agora." };
    return { ok: true, commentCount: res.comment_count ?? 0 };
  },

  /** perfil público; null = não existe (sem visual no ar) ou indisponível */
  async getProfile(userId: string): Promise<CommunityProfile | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("community_profile", { p_user: userId });
    if (error || !data) return null;
    const res = data as { ok: boolean; profile?: AuthorRow & { posts: number; likes: number; since: string | null; me: boolean } };
    if (!res.ok || !res.profile) return null;
    const p = res.profile;
    return { ...mapAuthor(p), posts: p.posts, likes: p.likes, since: p.since, me: !!p.me };
  },

  /** id de quem está logado (null = visitante) */
  async getMyId(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
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
    edit?: PublishEdit | null,
  ): Promise<Result<{ id?: string; width?: number | null; height?: number | null }>> {
    if (!supabase) return { ok: false, message: "Publicação ainda não configurada — falta backend Supabase." };
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "auth_required", message: "É preciso estar logado para publicar." };

    const valid = this.validateFile(file);
    if (!valid.ok) return valid;

    onStage?.("optimizing");
    const prepared = await prepareImage(file, edit);
    if (!prepared.ok) return prepared;

    onStage?.("uploading");
    const path = auth.user.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + prepared.ext;
    const contentType = prepared.ext === "webp" ? "image/webp" : prepared.ext === "jpg" || prepared.ext === "jpeg" ? "image/jpeg" : prepared.blob.type || "image/jpeg";
    const { error: uploadError } = await supabase.storage.from("community").upload(path, prepared.blob, { upsert: false, contentType });
    if (uploadError) return { ok: false, message: "Falha no envio da foto. Confira a conexão e tente de novo." };

    onStage?.("saving");
    // sem "status": o banco grava 'pending' e a policy da 0010 só aceita isso
    const { data: inserted, error: insertError } = await supabase.from("community_posts").insert({
      user_id: auth.user.id,
      image_path: path,
      caption: caption.trim() || null,
      product_id: productId,
      image_width: prepared.width,
      image_height: prepared.height,
    }).select("id").maybeSingle();
    if (insertError) {
      await supabase.storage.from("community").remove([path]).catch(() => undefined);
      return { ok: false, message: "Falha ao registrar a publicação. Tente de novo." };
    }
    return { ok: true, id: inserted?.id, width: prepared.width, height: prepared.height };
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
