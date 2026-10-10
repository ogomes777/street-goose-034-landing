/* Street Goose 034 — SG Community: peças compartilhadas entre o mural da
   home (community-home.js) e o app de /comunidade (community-page.js):
   card do post, lightbox com comentários, curtir, compartilhar e o
   compositor de publicação (foto → ajuste → detalhes → envio → pronto).
   Todo texto vindo do banco passa por SG.esc. */

var svcPromise = null;
export function service() {
  if (!svcPromise) svcPromise = import("../src/services/CommunityService.ts").then(function (m) { return m.CommunityService; });
  return svcPromise;
}

function esc(v) { return window.SG.esc(v == null ? "" : String(v)); }
function toast(msg) { if (window.SG.toast) window.SG.toast(msg); }

export var ICONS = {
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4s-7.4-4.5-9.2-9.1C1.5 8 3.5 4.6 7 4.6c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.5 3.4 4.2 6.7-1.8 4.6-9.2 9.1-9.2 9.1z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 13.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-5.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>',
  comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.2 0-2.3-.2-3.3-.6L4 20.2l1.3-3.7c-1.1-1.4-1.8-3.1-1.8-4.9 0-4.4 3.8-7.9 8.5-7.9s8.5 3.5 8.5 7.9z"/></svg>',
  dots: '<svg viewBox="0 0 24 24" aria-hidden="true" class="is-fill"><circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12l1 12.5H5L6 7.5Z"/><path d="M9 7.5a3 3 0 0 1 6 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-3.6 2.6-5.4 3.8-8.8.3-.9 1.5-1 2-.2 1 1.6 1.2 3 1 4.4 1.2-.6 2-1.8 2.2-3 .1-.6.9-.9 1.3-.4 1.6 1.9 2.7 4.3 2.7 7 0 4.2-2.6 7.2-6.5 7.2z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.4"/><rect x="13" y="4" width="7" height="7" rx="1.4"/><rect x="4" y="13" width="7" height="7" rx="1.4"/><rect x="13" y="13" width="7" height="7" rx="1.4"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5l5-4.5 4 3.5 3-2.5 4 3.5"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12 20 4.5 14.5 20l-3-6.5z"/><path d="M11.5 13.5 20 4.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true" class="is-fill"><path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z"/></svg>',
};

// fotos de campanha da marca (convite do mural vazio). new URL(): o Vite
// empacota e versiona — caminho em string pura quebrava no build. As fotos
// são horizontais; pos enquadra cada uma no seu quadro (a 1ª é o quadro
// alto: o corte vertical fica no rosto + óculos da menina da direita).
var CAMPAIGN_PHOTOS = [
  { src: new URL("../assets/lifestyle/web/community-01.webp", import.meta.url).href, pos: "70% 30%" },
  { src: new URL("../assets/lifestyle/web/community-02.webp", import.meta.url).href, pos: "50% 40%" },
  { src: new URL("../assets/lifestyle/web/community-03.webp", import.meta.url).href, pos: "50% 45%" },
];

/** convite "seja o primeiro visual" — ctaHtml é o botão/link de postar */
export function emptyStateHtml(ctaHtml, extraClass) {
  return '<div class="sgc-empty' + (extraClass ? " " + extraClass : "") + '">' +
    '<div class="sgc-empty-art" aria-hidden="true">' +
      CAMPAIGN_PHOTOS.map(function (p) { return '<img src="' + p.src + '" alt="" loading="lazy" decoding="async" style="object-position:' + p.pos + '">'; }).join("") +
      '<span class="sgc-empty-tag">SG / 034 — campanha</span>' +
    "</div>" +
    '<div class="sgc-empty-copy"><p class="kicker">O MURAL COMEÇA COM VOCÊ</p>' +
      "<h3>Seja o primeiro visual da SG Community.</h3>" +
      '<ol class="sgc-steps"><li><b>01</b>Poste seu visual usando a peça</li><li><b>02</b>A equipe aprova</li><li><b>03</b>+30 XP e você entra no mural</li></ol>' +
      ctaHtml +
    "</div></div>";
}

// ---------- dados auxiliares ----------
export function productFor(id) {
  if (!id) return null;
  var list = window.SG_PRODUCTS || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id && !list[i].gone) return list[i];
  }
  return null;
}

export function timeAgo(iso) {
  var then = new Date(iso).getTime();
  var s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return "há " + Math.floor(s / 60) + " min";
  if (s < 86400) return "há " + Math.floor(s / 3600) + " h";
  var d = Math.floor(s / 86400);
  if (d === 1) return "ontem";
  if (d < 7) return "há " + d + " dias";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

/** largura/altura do card no feed: entre 3:4 e 16:10, 4:5 se não souber */
export function ratio(post) {
  var r = post.width && post.height ? post.width / post.height : 0.8;
  return Math.min(1.6, Math.max(0.75, r));
}

export function avatarHtml(author) {
  var initial = String(author.name || "S").replace(/^@/, "").charAt(0).toUpperCase() || "S";
  if (author.avatarUrl && /^https:\/\//.test(author.avatarUrl)) {
    return '<span class="sgc-avatar"><img src="' + esc(author.avatarUrl) + '" alt="" referrerpolicy="no-referrer" loading="lazy" decoding="async"></span>';
  }
  return '<span class="sgc-avatar" aria-hidden="true">' + esc(initial) + "</span>";
}

/** avatar com o anel metálico da marca (laranja quando é destaque) */
export function ringHtml(author, hot) {
  return '<span class="sgc-ring' + (hot ? " is-hot" : "") + '">' + avatarHtml(author) + "</span>";
}

export function levelChipHtml(author) {
  return '<span class="sgc-lv" title="' + esc("Nível " + (author.level || 1) + (author.levelName ? " — " + author.levelName : "")) + '">NV ' + (author.level || 1) + "</span>";
}

export function altFor(post) {
  return post.caption
    ? "Visual de " + post.author.name + ": " + post.caption.slice(0, 140)
    : "Visual de " + post.author.name + " na SG Community";
}

export function countLabel(n) {
  if (n >= 10000) return Math.round(n / 1000) + " mil";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + " mil";
  return String(n);
}

function likesText(n) { return n === 0 ? "Seja o primeiro a curtir" : countLabel(n) + (n === 1 ? " curtida" : " curtidas"); }
function commentsLinkText(n) { return n === 1 ? "Ver 1 comentário" : "Ver os " + countLabel(n) + " comentários"; }

export function likeButtonHtml(post, extraClass) {
  return '<button class="sgc-act sgc-act--like' + (extraClass ? " " + extraClass : "") + '" type="button" data-like="' + esc(post.id) + '" aria-pressed="' + (post.liked ? "true" : "false") + '" aria-label="' + (post.liked ? "Descurtir" : "Curtir") + '">' +
    ICONS.heart + "</button>";
}

export function productTagHtml(post) {
  var p = productFor(post.productId);
  if (!p) return "";
  return '<button class="sgc-tag" type="button" data-product="' + esc(p.id) + '" aria-label="' + esc("Ver peça: " + p.name) + '">' +
    ICONS.bag + "<span>" + esc(p.name) + "</span></button>";
}

function captionHtml(post, cls) {
  if (!post.caption) return "";
  return '<p class="' + cls + '"><button class="sgc-name" type="button" data-profile="' + esc(post.author.id) + '">' + esc(post.author.name) + "</button> " + esc(post.caption) + "</p>";
}

/** card do feed — cabeçalho, foto (toque duplo curte), ações, legenda */
export function postCardHtml(post, i) {
  var longCaption = post.caption && (post.caption.length > 120 || post.caption.split("\n").length > 2);
  return '<article class="sgc-card" data-post="' + esc(post.id) + '" style="--i:' + (i || 0) + '">' +
    '<header class="sgc-card-head">' +
      '<button class="sgc-author" type="button" data-profile="' + esc(post.author.id) + '">' + ringHtml(post.author, post.featured) +
        '<span class="sgc-author-text"><b>' + esc(post.author.name) + "</b>" + levelChipHtml(post.author) +
        "<small>" + esc(timeAgo(post.createdAt)) + (post.author.levelName ? " · " + esc(post.author.levelName) : "") + "</small></span>" +
      "</button>" +
      (post.featured ? '<span class="sgc-badge">' + ICONS.star + "Destaque</span>" : "") +
      '<button class="sgc-icon sgc-card-more" type="button" data-post-menu="' + esc(post.id) + '" aria-label="Mais opções" aria-haspopup="menu">' + ICONS.dots + "</button>" +
    "</header>" +
    '<div class="sgc-card-media" style="aspect-ratio:' + ratio(post).toFixed(4) + '">' +
      (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="' + esc(altFor(post)) + '" loading="lazy" decoding="async" draggable="false">' : '<span class="sgc-media-missing">Foto indisponível</span>') +
      '<button class="sgc-card-open" type="button" data-open-post="' + esc(post.id) + '" aria-label="' + esc("Abrir visual de " + post.author.name) + '"></button>' +
      '<span class="sgc-burst" data-burst aria-hidden="true">' + ICONS.heart + "</span>" +
      productTagHtml(post) +
    "</div>" +
    '<div class="sgc-card-actions">' + likeButtonHtml(post) +
      '<button class="sgc-act" type="button" data-comments="' + esc(post.id) + '" aria-label="Comentar">' + ICONS.comment + "</button>" +
      '<button class="sgc-act" type="button" data-share="' + esc(post.id) + '" aria-label="Compartilhar">' + ICONS.share + "</button>" +
    "</div>" +
    '<p class="sgc-card-likes" data-like-label="' + esc(post.id) + '">' + likesText(post.likeCount) + "</p>" +
    (post.caption ? '<div class="sgc-card-caption' + (longCaption ? " is-clamped" : "") + '" data-caption>' + captionHtml(post, "sgc-caption-text") +
      (longCaption ? '<button class="sgc-expand" type="button" data-expand>mais</button>' : "") + "</div>" : "") +
    '<button class="sgc-card-comments" type="button" data-comments="' + esc(post.id) + '" data-comment-link="' + esc(post.id) + '"' + (post.commentCount ? "" : " hidden") + ">" + commentsLinkText(post.commentCount || 0) + "</button>" +
  "</article>";
}

/** quadrado do grid (Em alta / perfil): foto + curtidas e comentários no hover */
export function gridTileHtml(post, extra) {
  return '<button class="sgc-gridtile" type="button" data-open-post="' + esc(post.id) + '" aria-label="' + esc(altFor(post)) + '">' +
    (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="" loading="lazy" decoding="async">' : '<span class="sgc-media-missing">Foto indisponível</span>') +
    (post.featured ? '<span class="sgc-gridtile-star" aria-hidden="true">' + ICONS.star + "</span>" : "") +
    '<span class="sgc-gridtile-over" aria-hidden="true"><span>' + ICONS.heart + countLabel(post.likeCount) + "</span><span>" + ICONS.comment + countLabel(post.commentCount || 0) + "</span></span>" +
    (extra || "") +
  "</button>";
}

// ---------- curtir / compartilhar ----------
export function syncLike(post) {
  document.querySelectorAll('[data-like="' + CSS.escape(post.id) + '"]').forEach(function (btn) {
    btn.setAttribute("aria-pressed", post.liked ? "true" : "false");
    btn.setAttribute("aria-label", post.liked ? "Descurtir" : "Curtir");
    var c = btn.querySelector("[data-like-count]");
    if (c) c.textContent = countLabel(post.likeCount);
  });
  document.querySelectorAll('[data-like-label="' + CSS.escape(post.id) + '"]').forEach(function (el) { el.textContent = likesText(post.likeCount); });
}

export function syncComments(post) {
  document.querySelectorAll('[data-comment-link="' + CSS.escape(post.id) + '"]').forEach(function (el) {
    el.hidden = !post.commentCount;
    el.textContent = commentsLinkText(post.commentCount || 0);
  });
}

/** like otimista; onlyLike = toque duplo na foto (nunca descurte) */
export async function toggleLike(post, onlyLike) {
  if (onlyLike && post.liked) return true;
  var session = window.SG.auth ? await window.SG.auth.getSession() : null;
  if (!session) {
    toast("ENTRE NA SUA CONTA PARA CURTIR");
    if (window.SG.auth) window.SG.auth.open();
    return false;
  }
  if (post._busy) return post.liked;
  post._busy = true;
  var prev = { liked: post.liked, count: post.likeCount };
  post.liked = !post.liked;
  post.likeCount = Math.max(0, post.likeCount + (post.liked ? 1 : -1));
  syncLike(post);
  var svc = await service();
  var res = await svc.toggleLike(post.id);
  post._busy = false;
  if (!res.ok) {
    post.liked = prev.liked;
    post.likeCount = prev.count;
    syncLike(post);
    toast(res.message.toUpperCase());
    return false;
  }
  post.liked = res.liked;
  post.likeCount = res.likeCount;
  syncLike(post);
  return true;
}

export function postUrl(post) {
  return location.origin + "/comunidade?post=" + encodeURIComponent(post.id);
}

export function profileUrl(authorId) {
  return location.origin + "/comunidade?u=" + encodeURIComponent(authorId);
}

export async function shareLink(url, title, text, copiedMsg) {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: title, text: text, url: url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast(copiedMsg || "LINK COPIADO"); }
  catch (e) { toast("NÃO FOI POSSÍVEL COPIAR O LINK"); }
}

export function sharePost(post) {
  return shareLink(postUrl(post), "SG Community — Street Goose 034", "Visual de " + post.author.name + " na Street Goose 034", "LINK DO VISUAL COPIADO");
}

export function openProduct(id) {
  var p = productFor(id);
  if (p && window.SG.openQuickView) window.SG.openQuickView(p);
}

export function burst(el) {
  if (!el) return;
  el.classList.remove("is-on");
  void el.offsetWidth;
  el.classList.add("is-on");
}

function anyModalOnTop() {
  return !!document.querySelector(".quickview.is-open, .zoom-viewer.is-open, .auth-modal:not([hidden]), [data-sgc-publisher]");
}

// ---------- menu "⋯" do post ----------
/* items: [{ label, icon, danger, onSelect }] — fecha com ESC, clique fora ou
   escolha; foco volta ao botão que abriu */
export function openMenu(anchor, items) {
  var old = document.querySelector("[data-sgc-menu]");
  if (old) old.remove();
  var menu = document.createElement("div");
  menu.className = "sgc-menu";
  menu.setAttribute("data-sgc-menu", "");
  menu.setAttribute("role", "menu");
  menu.innerHTML = items.map(function (it, i) {
    return '<button type="button" role="menuitem" data-i="' + i + '"' + (it.danger ? ' class="is-danger"' : "") + ">" + (it.icon || "") + "<span>" + esc(it.label) + "</span></button>";
  }).join("");
  document.body.appendChild(menu);
  var r = anchor.getBoundingClientRect();
  var w = menu.offsetWidth, h = menu.offsetHeight;
  var left = Math.min(window.innerWidth - w - 10, Math.max(10, r.right - w));
  var top = r.bottom + 6 + h > window.innerHeight ? Math.max(10, r.top - h - 6) : r.bottom + 6;
  menu.style.left = left + "px";
  menu.style.top = top + "px";
  var btns = menu.querySelectorAll("button");
  if (btns[0]) btns[0].focus({ preventScroll: true });

  function close(refocus) {
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onScroll);
    document.removeEventListener("scroll", onScroll, true);
    menu.remove();
    if (refocus && anchor.isConnected) anchor.focus({ preventScroll: true });
  }
  function onOutside(e) { if (!menu.contains(e.target)) close(false); }
  function onScroll() { close(false); }
  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(true); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var list = Array.prototype.slice.call(btns), k = list.indexOf(document.activeElement);
      list[(k + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus();
    } else if (e.key === "Tab") close(false);
  }
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]");
    if (!b) return;
    var it = items[Number(b.getAttribute("data-i"))];
    close(false);
    if (it && it.onSelect) it.onSelect();
  });
  setTimeout(function () {
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("scroll", onScroll, true);
  }, 0);
  document.addEventListener("keydown", onKey, true);
  return { close: close };
}

// ---------- comentários ----------
function commentHtml(c, myId) {
  return '<div class="sgc-comment" data-comment="' + esc(c.id) + '">' +
    '<button class="sgc-comment-avatar" type="button" data-profile="' + esc(c.author.id) + '" tabindex="-1" aria-hidden="true">' + avatarHtml(c.author) + "</button>" +
    '<div class="sgc-comment-body">' +
      '<p><button class="sgc-name" type="button" data-profile="' + esc(c.author.id) + '">' + esc(c.author.name) + "</button> " + esc(c.body) + "</p>" +
      '<small><time datetime="' + esc(c.createdAt) + '">' + esc(timeAgo(c.createdAt)) + "</time>" +
        (c.canDelete ? '<span data-comment-actions><button class="sgc-comment-del" type="button" data-comment-delete="' + esc(c.id) + '">Apagar</button></span>' : "") +
      "</small>" +
    "</div>" +
  "</div>";
}

// ---------- lightbox (post aberto) ----------
/* opts: posts (array, pode crescer), index, onIndex(i), onClose(fromHistory),
   loadMore() → Promise<boolean>, hasMore(), onProfile(authorId),
   focusComment (abre com o campo de comentário em foco), onDeleted(post) */
export function openViewer(opts) {
  var posts = opts.posts;
  var index = opts.index;
  var opener = document.activeElement;
  var coarse = matchMedia("(pointer: coarse)").matches;
  var el = document.createElement("div");
  el.className = "sgc-lightbox";
  el.setAttribute("data-sgc-viewer", "");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Visual da SG Community");
  el.innerHTML =
    '<div class="sgc-lightbox-backdrop" data-viewer-close></div>' +
    '<div class="sgc-lightbox-frame" data-viewer-frame></div>' +
    '<button class="sgc-lb-btn sgc-lb-close" type="button" data-viewer-close aria-label="Fechar">' + ICONS.close + "</button>" +
    '<button class="sgc-lb-btn sgc-lb-prev" type="button" data-viewer-prev aria-label="Visual anterior">' + ICONS.prev + "</button>" +
    '<button class="sgc-lb-btn sgc-lb-next" type="button" data-viewer-next aria-label="Próximo visual">' + ICONS.next + "</button>";
  document.body.appendChild(el);
  document.documentElement.classList.add("sgc-lightbox-open");
  var frame = el.querySelector("[data-viewer-frame]");
  var closed = false;
  var loadingMore = false;
  var commentsSeq = 0;
  var session = null;
  var sending = false;

  function sideHtml(post) {
    var p = productFor(post.productId);
    return '<aside class="sgc-lb-side">' +
      '<header class="sgc-lb-head">' +
        '<button class="sgc-author" type="button" data-profile="' + esc(post.author.id) + '">' + ringHtml(post.author, post.featured) +
          '<span class="sgc-author-text"><b>' + esc(post.author.name) + "</b>" + levelChipHtml(post.author) +
          "<small>" + esc(post.author.levelName || "SG Community") + "</small></span>" +
        "</button>" +
        (post.featured ? '<span class="sgc-badge">' + ICONS.star + "Destaque</span>" : "") +
      "</header>" +
      '<div class="sgc-lb-scroll" data-viewer-scroll>' +
        (post.caption ? '<div class="sgc-comment sgc-comment--caption">' +
          '<span class="sgc-comment-avatar" aria-hidden="true">' + avatarHtml(post.author) + "</span>" +
          '<div class="sgc-comment-body">' + captionHtml(post, "") + "<small>" + esc(timeAgo(post.createdAt)) + "</small></div></div>" : "") +
        (p ? '<div class="sgc-lb-product">' +
          (p.images && p.images[0] ? '<img src="' + esc(thumbOf(p)) + '" alt="" loading="lazy" decoding="async">' : "") +
          "<div><small>Peça no visual</small><b>" + esc(p.name) + '</b><span data-price-for="' + esc(p.id) + '">' + esc(p.priceLabel || "") + "</span></div>" +
          '<button class="btn btn-ghost" type="button" data-product="' + esc(p.id) + '">Ver peça</button>' +
        "</div>" : "") +
        '<div class="sgc-comments" data-comments-list aria-live="polite">' +
          '<div class="sgc-comments-loading" aria-hidden="true"><span></span><span></span><span></span></div>' +
        "</div>" +
      "</div>" +
      '<div class="sgc-lb-actions">' +
        '<div class="sgc-lb-actrow">' + likeButtonHtml(post) +
          '<button class="sgc-act" type="button" data-focus-comment aria-label="Comentar">' + ICONS.comment + "</button>" +
          '<button class="sgc-act" type="button" data-share="' + esc(post.id) + '" aria-label="Compartilhar">' + ICONS.share + "</button>" +
          '<span class="sgc-lb-count">' + (index + 1) + " / " + posts.length + (opts.hasMore && opts.hasMore() ? "+" : "") + "</span>" +
        "</div>" +
        '<p class="sgc-card-likes" data-like-label="' + esc(post.id) + '">' + likesText(post.likeCount) + "</p>" +
        '<p class="sgc-lb-time">' + esc(timeAgo(post.createdAt)) + "</p>" +
      "</div>" +
      '<div class="sgc-lb-compose" data-compose></div>' +
    "</aside>";
  }

  function composeHtml() {
    if (!session) {
      return '<button class="sgc-lb-login" type="button" data-login-comment>' + ICONS.user + "Entre para curtir e comentar</button>";
    }
    return '<form class="sgc-comment-form" data-comment-form>' +
      '<label class="sgc-visually-hidden" for="sgc-comment-input">Escreva um comentário</label>' +
      '<textarea id="sgc-comment-input" name="body" rows="1" maxlength="400" placeholder="Adicione um comentário…" data-comment-input></textarea>' +
      '<button class="sgc-comment-send" type="submit" data-comment-send disabled>Publicar</button>' +
    "</form>";
  }

  function render() {
    var post = posts[index];
    if (!post) return;
    frame.innerHTML =
      '<div class="sgc-lb-media" data-viewer-media>' +
        (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="' + esc(altFor(post)) + '" draggable="false">' : '<span class="sgc-media-missing">Foto indisponível</span>') +
        '<span class="sgc-burst" data-burst aria-hidden="true">' + ICONS.heart + "</span>" +
        productTagHtml(post) +
      "</div>" + sideHtml(post);
    el.querySelector("[data-viewer-prev]").hidden = index === 0;
    el.querySelector("[data-viewer-next]").hidden = index >= posts.length - 1 && !(opts.hasMore && opts.hasMore());
    // pré-carrega a próxima foto: navegação sem tela vazia
    var nextPost = posts[index + 1];
    if (nextPost && nextPost.imageUrl) { var pre = new Image(); pre.src = nextPost.imageUrl; }
    renderCompose();
    loadComments(post);
  }

  function renderCompose() {
    var box = frame.querySelector("[data-compose]");
    if (!box) return;
    box.innerHTML = composeHtml();
    var input = box.querySelector("[data-comment-input]");
    if (!input) return;
    var send = box.querySelector("[data-comment-send]");
    input.addEventListener("input", function () {
      send.disabled = !input.value.trim() || sending;
      input.style.height = "auto";
      input.style.height = Math.min(120, input.scrollHeight) + "px";
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!send.disabled) box.querySelector("form").requestSubmit(); }
    });
  }

  async function loadComments(post) {
    var n = ++commentsSeq;
    var list = frame.querySelector("[data-comments-list]");
    var svc = await service();
    var res = await svc.getComments(post.id);
    if (closed || n !== commentsSeq) return;
    list = frame.querySelector("[data-comments-list]");
    if (!list) return;
    if (!res) { list.innerHTML = '<p class="sgc-comments-empty">Comentários indisponíveis agora.</p>'; return; }
    if (post.commentCount !== res.total) { post.commentCount = res.total; syncComments(post); }
    list.innerHTML = res.items.length
      ? res.items.map(function (c) { return commentHtml(c); }).join("")
      : '<p class="sgc-comments-empty">' + ICONS.comment + "<b>Ainda sem comentários.</b><span>Comece a conversa.</span></p>";
  }

  async function submitComment(form) {
    if (sending) return;
    var post = posts[index];
    var input = form.querySelector("[data-comment-input]");
    var send = form.querySelector("[data-comment-send]");
    var body = input.value.trim();
    if (!body) return;
    sending = true;
    send.disabled = true;
    send.textContent = "…";
    var svc = await service();
    var res = await svc.addComment(post.id, body);
    sending = false;
    if (closed) return;
    send.textContent = "Publicar";
    if (!res.ok) { send.disabled = !input.value.trim(); toast(res.message.toUpperCase()); return; }
    input.value = "";
    input.style.height = "";
    send.disabled = true;
    post.commentCount = res.commentCount;
    syncComments(post);
    var list = frame.querySelector("[data-comments-list]");
    if (posts[index] !== post || !list) return;
    var empty = list.querySelector(".sgc-comments-empty");
    if (empty) list.innerHTML = "";
    list.insertAdjacentHTML("beforeend", commentHtml(res.comment));
    var added = list.lastElementChild;
    if (added) { added.classList.add("is-new"); added.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  async function deleteComment(id) {
    var post = posts[index];
    var svc = await service();
    var res = await svc.deleteComment(id);
    if (closed) return;
    if (!res.ok) { toast(res.message.toUpperCase()); return; }
    post.commentCount = res.commentCount;
    syncComments(post);
    var row = frame.querySelector('[data-comment="' + CSS.escape(id) + '"]');
    if (row) {
      row.classList.add("is-leaving");
      setTimeout(function () {
        row.remove();
        var list = frame.querySelector("[data-comments-list]");
        if (list && !list.querySelector(".sgc-comment")) list.innerHTML = '<p class="sgc-comments-empty">' + ICONS.comment + "<b>Ainda sem comentários.</b><span>Comece a conversa.</span></p>";
      }, 220);
    }
  }

  async function go(delta) {
    var target = index + delta;
    if (target < 0) return;
    if (target >= posts.length) {
      if (!opts.loadMore || loadingMore) return;
      loadingMore = true;
      var more = await opts.loadMore();
      loadingMore = false;
      if (closed || !more || target >= posts.length) { render(); return; }
    }
    index = target;
    render();
    if (opts.onIndex) opts.onIndex(index);
  }

  function close(fromHistory) {
    if (closed) return;
    closed = true;
    if (unsubscribe) unsubscribe();
    document.removeEventListener("keydown", onKeydown, true);
    el.remove();
    document.documentElement.classList.remove("sgc-lightbox-open");
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    if (opts.onClose) opts.onClose(!!fromHistory);
  }

  function onKeydown(e) {
    if (anyModalOnTop() || document.querySelector("[data-sgc-menu]")) return;
    var typing = e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT");
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); }
    else if (e.key === "ArrowLeft" && !typing) { e.preventDefault(); go(-1); }
    else if (e.key === "ArrowRight" && !typing) { e.preventDefault(); go(1); }
    else if (e.key === "Tab") {
      var f = Array.prototype.filter.call(el.querySelectorAll("button:not([hidden]):not([disabled]), a[href], textarea, input"), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKeydown, true);

  el.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-comment-form]");
    if (form) { e.preventDefault(); submitComment(form); }
  });
  el.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-viewer-close]")) { close(); return; }
    if (t.closest("[data-viewer-prev]")) { go(-1); return; }
    if (t.closest("[data-viewer-next]")) { go(1); return; }
    if (t.closest("[data-like]")) { toggleLike(posts[index]); return; }
    if (t.closest("[data-share]")) { sharePost(posts[index]); return; }
    if (t.closest("[data-focus-comment]")) { var inp = frame.querySelector("[data-comment-input]"); if (inp) inp.focus(); else if (window.SG.auth) window.SG.auth.open(); return; }
    if (t.closest("[data-login-comment]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var prof = t.closest("[data-profile]");
    if (prof && opts.onProfile) { opts.onProfile(prof.getAttribute("data-profile")); close(); return; }
    var prod = t.closest("[data-product]");
    if (prod) { openProduct(prod.getAttribute("data-product")); return; }
    var del = t.closest("[data-comment-delete]");
    if (del) {
      var wrap = del.closest("[data-comment-actions]");
      wrap.innerHTML = '<span class="sgc-comment-confirm">Apagar?</span><button class="sgc-comment-del is-danger" type="button" data-comment-delete-yes="' + esc(del.getAttribute("data-comment-delete")) + '">Sim</button><button class="sgc-comment-del" type="button" data-comment-delete-no>Não</button>';
      return;
    }
    var yes = t.closest("[data-comment-delete-yes]");
    if (yes) { yes.disabled = true; deleteComment(yes.getAttribute("data-comment-delete-yes")); return; }
    var no = t.closest("[data-comment-delete-no]");
    if (no) { var w = no.closest("[data-comment-actions]"); var cid = w.closest("[data-comment]").getAttribute("data-comment"); w.innerHTML = '<button class="sgc-comment-del" type="button" data-comment-delete="' + esc(cid) + '">Apagar</button>'; }
  });

  // toque duplo curte, arrastar para o lado troca de visual
  var down = null, lastTap = 0;
  frame.addEventListener("pointerdown", function (e) {
    if (!e.target.closest("[data-viewer-media]") || e.target.closest("[data-product]")) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now() };
  });
  frame.addEventListener("pointerup", function (e) {
    if (!down || !e.target.closest("[data-viewer-media]")) { down = null; return; }
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    var start = down;
    down = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { go(dx < 0 ? 1 : -1); lastTap = 0; return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - start.t < 300) {
      var now = Date.now();
      if (now - lastTap < 320) {
        lastTap = 0;
        burst(frame.querySelector("[data-burst]"));
        toggleLike(posts[index], true);
      } else {
        lastTap = now;
      }
    }
  });
  frame.addEventListener("dblclick", function (e) { if (e.target.closest("[data-viewer-media]")) e.preventDefault(); });

  // sessão define se aparece o campo de comentário ou o "entre para comentar"
  var unsubscribe = null;
  (window.SG.auth ? window.SG.auth.getSession() : Promise.resolve(null)).then(function (s) {
    if (closed) return;
    session = s;
    renderCompose();
    if (opts.focusComment) { var inp = frame.querySelector("[data-comment-input]"); if (inp && !coarse) inp.focus(); else if (inp) inp.scrollIntoView({ block: "nearest" }); }
  });
  import("../src/services/AuthService.ts").then(function (m) {
    if (closed) return;
    unsubscribe = m.AuthService.onAuthStateChange(function (_e, s) {
      var had = !!session;
      session = s || null;
      if (closed) { if (unsubscribe) unsubscribe(); return; }
      if (had !== !!session) { renderCompose(); loadComments(posts[index]); }
    });
  });

  render();
  el.querySelector("[data-viewer-close]").focus({ preventScroll: true });

  var api = {
    close: close,
    get index() { return index; },
    show: function (i) { if (i >= 0 && i < posts.length) { index = i; render(); } },
    refresh: render,
  };
  return api;
}

// ---------- seletor "Peça no visual" ----------
/* <select> nativo não mostra imagem: lista própria com a foto pequena de cada
   peça (miniatura de 160px do catálogo, só carrega quando aparece na lista),
   busca, grupos por categoria e teclado (↑ ↓ Enter Esc). O valor escolhido
   fica num input hidden name="product". */
function pickerProducts() {
  return (window.SG_PRODUCTS || []).filter(function (p) { return !p.gone && !p.hidden && p.images && p.images.length; });
}
function thumbOf(p) { return (window.SG.thumbFor && window.SG.thumbFor(p.images[0])) || p.images[0]; }
function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

function noneRowHtml() {
  return '<span class="sgc-picker-thumb sgc-picker-thumb--none" aria-hidden="true"></span><span class="sgc-picker-name">Nenhuma — só o visual</span>';
}
function productRowHtml(p, lazy) {
  var t = thumbOf(p);
  return '<span class="sgc-picker-thumb" aria-hidden="true">' + (t ? "<img " + (lazy ? "data-src" : "src") + '="' + esc(t) + '" alt="" decoding="async">' : "") + "</span>" +
    '<span class="sgc-picker-name">' + esc(p.name) + "</span>";
}
function productPickerHtml() {
  return '<div class="sgc-field sgc-picker" data-picker>' +
    '<span id="sgc-picker-label">Peça no visual</span>' +
    '<input type="hidden" name="product" value="">' +
    '<button type="button" class="sgc-picker-trigger" data-picker-trigger aria-haspopup="listbox" aria-expanded="false" aria-labelledby="sgc-picker-label sgc-picker-current">' +
      '<span class="sgc-picker-current" id="sgc-picker-current" data-picker-current>' + noneRowHtml() + "</span>" +
      '<svg class="sgc-picker-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
    "</button>" +
    '<div class="sgc-picker-panel" data-picker-panel hidden>' +
      '<input type="search" class="sgc-picker-search" data-picker-search placeholder="Buscar peça (ex.: lupa 07)" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="sgc-picker-list" aria-autocomplete="list" aria-label="Buscar peça">' +
      '<ul class="sgc-picker-list" id="sgc-picker-list" role="listbox" aria-label="Peças Street Goose" data-picker-list></ul>' +
    "</div>" +
  "</div>";
}

function mountProductPicker(root, onChange) {
  var wrap = root.querySelector("[data-picker]");
  var hiddenInput = wrap.querySelector('input[name="product"]');
  var trigger = wrap.querySelector("[data-picker-trigger]");
  var current = wrap.querySelector("[data-picker-current]");
  var panel = wrap.querySelector("[data-picker-panel]");
  var search = wrap.querySelector("[data-picker-search]");
  var list = wrap.querySelector("[data-picker-list]");
  var products = pickerProducts();
  var options = []; // valores visíveis, na ordem da lista ("" = nenhuma)
  var active = -1;
  var thumbObs = null;

  function optionHtml(value, inner, i) {
    return '<li class="sgc-picker-option" role="option" id="sgc-opt-' + i + '" data-index="' + i + '" aria-selected="' + (value === hiddenInput.value) + '">' + inner + "</li>";
  }
  function render(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    var html = "", lastCat = null;
    options = [];
    if (!words.length) { html += optionHtml("", noneRowHtml(), 0); options.push(""); }
    products.forEach(function (p) {
      var hay = norm(p.name + " " + p.categoryLabel);
      if (!words.every(function (w) { return hay.indexOf(w) !== -1; })) return;
      if (p.categoryLabel !== lastCat) { lastCat = p.categoryLabel; html += '<li class="sgc-picker-group" role="presentation">' + esc(lastCat) + "</li>"; }
      html += optionHtml(p.id, productRowHtml(p, true), options.length);
      options.push(p.id);
    });
    list.innerHTML = options.length ? html : '<li class="sgc-picker-empty" role="presentation">Nenhuma peça com esse nome.</li>';
    var sel = options.indexOf(hiddenInput.value);
    setActive(sel >= 0 ? sel : (options.length ? 0 : -1), true);
    watchThumbs();
  }
  function scrollToOption(el, center) {
    var top = el.offsetTop, bottom = top + el.offsetHeight;
    if (center) list.scrollTop = top - list.clientHeight / 2 + el.offsetHeight / 2;
    else if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }
  function setActive(i, center) {
    var prev = list.querySelector(".is-active");
    if (prev) prev.classList.remove("is-active");
    active = i;
    var el = i >= 0 ? list.querySelector('[data-index="' + i + '"]') : null;
    if (!el) { search.removeAttribute("aria-activedescendant"); return; }
    el.classList.add("is-active");
    search.setAttribute("aria-activedescendant", el.id);
    scrollToOption(el, center);
  }
  function loadThumb(img) { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); }
  function watchThumbs() {
    if (thumbObs) thumbObs.disconnect();
    var imgs = list.querySelectorAll("img[data-src]");
    if (!("IntersectionObserver" in window)) { imgs.forEach(loadThumb); return; }
    thumbObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { loadThumb(en.target); thumbObs.unobserve(en.target); } });
    }, { root: list, rootMargin: "160px 0px" });
    imgs.forEach(function (img) { thumbObs.observe(img); });
  }
  function open() {
    if (!panel.hidden) return;
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    wrap.classList.add("is-open");
    search.value = "";
    render("");
    search.focus({ preventScroll: true });
  }
  function close(focusTrigger) {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    wrap.classList.remove("is-open");
    if (thumbObs) { thumbObs.disconnect(); thumbObs = null; }
    if (focusTrigger) trigger.focus({ preventScroll: true });
  }
  function choose(i) {
    var value = options[i];
    if (value === undefined) return;
    hiddenInput.value = value;
    var p = value ? products.find(function (x) { return x.id === value; }) : null;
    current.innerHTML = p ? productRowHtml(p, false) : noneRowHtml();
    wrap.classList.toggle("has-value", !!p);
    close(true);
    if (onChange) onChange(value || null);
  }
  function onOutside(e) { if (!panel.hidden && !wrap.contains(e.target)) close(false); }

  trigger.addEventListener("click", function () { if (panel.hidden) open(); else close(true); });
  trigger.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
  });
  search.addEventListener("input", function () { render(search.value); });
  search.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (options.length) setActive(Math.min(options.length - 1, active + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (options.length) setActive(Math.max(0, active - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (active >= 0) choose(active); }
    else if (e.key === "Tab") close(false);
  });
  list.addEventListener("mousedown", function (e) { e.preventDefault(); }); // foco fica na busca
  list.addEventListener("click", function (e) {
    var li = e.target.closest("[data-index]");
    if (li) choose(Number(li.getAttribute("data-index")));
  });
  list.addEventListener("mousemove", function (e) {
    var li = e.target.closest("[data-index]");
    if (li && Number(li.getAttribute("data-index")) !== active) setActive(Number(li.getAttribute("data-index")), false);
  });
  document.addEventListener("pointerdown", onOutside, true);

  return {
    isOpen: function () { return !panel.hidden; },
    close: close,
    value: function () { return hiddenInput.value || null; },
    reset: function () { hiddenInput.value = ""; current.innerHTML = noneRowHtml(); wrap.classList.remove("has-value"); },
    destroy: function () {
      document.removeEventListener("pointerdown", onOutside, true);
      if (thumbObs) thumbObs.disconnect();
    },
  };
}

// ---------- compositor: postar visual ----------
var ASPECTS = [
  { id: "original", label: "Original", value: null },
  { id: "4x5", label: "4:5", value: 4 / 5 },
  { id: "1x1", label: "1:1", value: 1 },
  { id: "16x9", label: "16:9", value: 16 / 9 },
];
var FILTERS = [
  { id: "none", label: "Original", css: "" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.12) brightness(1.03)" },
  { id: "chrome", label: "Chrome", css: "saturate(.72) contrast(1.12) brightness(1.05)" },
  { id: "ouro", label: "Ouro", css: "sepia(.28) saturate(1.2) contrast(1.05) brightness(1.03)" },
  { id: "rua", label: "Rua", css: "contrast(1.2) saturate(1.3)" },
  { id: "gelo", label: "Gelo", css: "hue-rotate(-10deg) saturate(.85) brightness(1.06) contrast(1.06)" },
];

/* opts: onPublished(result), onShowMine() — o chamador garante que há sessão */
export function openPublisher(opts) {
  opts = opts || {};
  var opener = document.activeElement;
  var overlay = document.createElement("div");
  overlay.className = "sgc-composer";
  overlay.setAttribute("data-sgc-publisher", "");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sgc-composer-title");
  overlay.innerHTML =
    '<div class="sgc-composer-backdrop" data-publish-close></div>' +
    '<div class="sgc-composer-panel" data-step="pick">' +
      '<header class="sgc-composer-bar">' +
        '<button class="sgc-icon" type="button" data-step-back aria-label="Voltar">' + ICONS.back + "</button>" +
        '<div class="sgc-composer-title"><h2 id="sgc-composer-title" data-step-title>Nova publicação</h2>' +
          '<ol class="sgc-composer-dots" aria-hidden="true"><li data-dot="pick"></li><li data-dot="edit"></li><li data-dot="details"></li></ol></div>' +
        '<div class="sgc-composer-right"><button class="sgc-composer-next" type="button" data-step-next>Avançar</button>' +
        '<button class="sgc-icon" type="button" data-publish-close aria-label="Fechar">' + ICONS.close + "</button></div>" +
      "</header>" +
      // 1 — escolher foto
      '<section class="sgc-pane sgc-pane--pick" data-pane="pick">' +
        '<label class="sgc-drop" data-drop>' +
          '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-photo-input>' +
          '<span class="sgc-drop-icon" aria-hidden="true">' + ICONS.image + "</span>" +
          "<b>Arraste a foto do seu visual</b>" +
          "<small>ou escolha da galeria · JPG, PNG, WEBP ou HEIC</small>" +
          '<span class="btn btn-primary sgc-drop-btn">Escolher foto</span>' +
        "</label>" +
        '<ul class="sgc-pick-tips"><li>' + ICONS.check + "Você (ou sua turma) usando Street Goose</li><li>" + ICONS.check + "Luz boa, peça aparecendo</li><li>" + ICONS.check + "<b>+30 XP</b> quando a equipe aprovar</li></ul>" +
      "</section>" +
      // 2 — ajustar
      '<section class="sgc-pane sgc-pane--edit" data-pane="edit">' +
        '<div class="sgc-stage" data-stage>' +
          '<div class="sgc-crop" data-crop><img data-crop-img alt="Prévia do seu visual" draggable="false"><span class="sgc-crop-grid" aria-hidden="true"></span></div>' +
          '<p class="sgc-stage-hint" data-crop-hint>Arraste a foto para enquadrar</p>' +
        "</div>" +
        '<div class="sgc-edit-tools">' +
          '<div class="sgc-tool"><p class="sgc-tool-label">Formato</p><div class="sgc-chips" role="radiogroup" aria-label="Formato" data-aspects>' +
            ASPECTS.map(function (a, i) { return '<button type="button" role="radio" class="sgc-chip" data-aspect="' + a.id + '" aria-checked="' + (i === 0) + '">' + a.label + "</button>"; }).join("") +
          "</div></div>" +
          '<div class="sgc-tool" data-filters-tool hidden><p class="sgc-tool-label">Filtro</p><div class="sgc-filters" role="radiogroup" aria-label="Filtro" data-filters></div></div>' +
        "</div>" +
      "</section>" +
      // 3 — detalhes + prévia como vai ficar no feed
      '<section class="sgc-pane sgc-pane--details" data-pane="details">' +
        '<div class="sgc-preview" aria-hidden="true">' +
          '<p class="sgc-tool-label">Como vai aparecer no feed</p>' +
          '<div class="sgc-card sgc-card--preview">' +
            '<div class="sgc-card-head"><span class="sgc-author">' + '<span class="sgc-ring"><span class="sgc-avatar" data-preview-avatar>S</span></span>' +
              '<span class="sgc-author-text"><b data-preview-name>Você</b><small>agora · em análise</small></span></span></div>' +
            '<div class="sgc-card-media" data-preview-media><img data-preview-img alt=""><span data-preview-tag></span></div>' +
            '<div class="sgc-card-actions"><span class="sgc-act">' + ICONS.heart + '</span><span class="sgc-act">' + ICONS.comment + '</span><span class="sgc-act">' + ICONS.share + "</span></div>" +
            '<div class="sgc-card-caption"><p class="sgc-caption-text"><b data-preview-name2>Você</b> <span data-preview-caption></span></p></div>' +
          "</div>" +
        "</div>" +
        '<form class="sgc-details" data-publish-form novalidate>' +
          '<p class="sgc-publisher-as" data-publish-as>Você aparece como…</p>' +
          '<label class="sgc-field">Legenda<textarea name="caption" rows="4" maxlength="500" placeholder="Onde foi, qual o rolê, o que a peça fez pelo visual…" data-caption-input></textarea><small data-caption-count>0/500</small></label>' +
          productPickerHtml() +
          '<details class="sgc-rules"><summary>Como funciona a aprovação</summary><ul>' +
            "<li>Foto sua (ou da sua turma) usando Street Goose.</li>" +
            "<li>A equipe aprova antes de entrar no feed — sem nudez, ódio ou marca de terceiros.</li>" +
            "<li><b>+30 XP</b> quando o visual for aprovado.</li>" +
          "</ul></details>" +
          '<p class="sgc-form-error" data-publish-error role="alert" hidden></p>' +
          '<button class="btn btn-primary sgc-publish-submit" type="submit" data-publish-submit>' + ICONS.send + "Publicar visual</button>" +
        "</form>" +
      "</section>" +
      // 4 — enviando
      '<section class="sgc-pane sgc-pane--sending" data-pane="sending" aria-live="polite">' +
        '<div class="sgc-sending-art"><img data-sending-img alt=""><span class="sgc-sending-ring" aria-hidden="true"></span></div>' +
        '<p class="sgc-sending-label" data-sending-label>Otimizando a foto…</p>' +
        '<div class="sgc-progress" aria-hidden="true"><span data-progress></span></div>' +
      "</section>" +
      // 5 — pronto
      '<section class="sgc-pane sgc-pane--done" data-pane="done">' +
        '<div class="sgc-done-art"><img data-done-img alt="Seu visual enviado"><span class="sgc-status is-pending">' + ICONS.clock + "Em análise</span></div>" +
        '<div class="sgc-done-copy">' +
          '<p class="kicker">ENVIADO</p><h2 tabindex="-1" data-done-title>Seu visual chegou na equipe.</h2>' +
          '<ol class="sgc-timeline">' +
            '<li class="is-done"><span>' + ICONS.check + "</span><div><b>Enviado</b><small>Foto otimizada e recebida</small></div></li>" +
            '<li class="is-current"><span>' + ICONS.clock + "</span><div><b>Em análise</b><small>A equipe confere antes de entrar no feed</small></div></li>" +
            '<li><span>' + ICONS.star + "</span><div><b>No feed · +30 XP</b><small>Você é avisado aqui quando aprovar</small></div></li>" +
          "</ol>" +
          '<div class="sgc-done-actions"><button class="btn btn-primary" type="button" data-publish-mine>Ver no meu perfil</button><button class="btn btn-ghost" type="button" data-publish-again>Postar outro</button></div>' +
        "</div>" +
      "</section>" +
      // descartar?
      '<div class="sgc-discard" data-discard hidden role="alertdialog" aria-labelledby="sgc-discard-title">' +
        '<div class="sgc-discard-card"><h3 id="sgc-discard-title">Descartar este visual?</h3><p>A foto e a legenda não ficam salvas.</p>' +
        '<button class="btn btn-primary" type="button" data-discard-yes>Descartar</button><button class="btn btn-ghost" type="button" data-discard-no>Continuar editando</button></div>' +
      "</div>" +
    "</div>";
  document.body.appendChild(overlay);
  document.documentElement.classList.add("sgc-lightbox-open");

  var panel = overlay.querySelector(".sgc-composer-panel");
  var input = overlay.querySelector("[data-photo-input]");
  var drop = overlay.querySelector("[data-drop]");
  var crop = overlay.querySelector("[data-crop]");
  var cropImg = overlay.querySelector("[data-crop-img]");
  var nextBtn = overlay.querySelector("[data-step-next]");
  var backBtn = overlay.querySelector("[data-step-back]");
  var titleEl = overlay.querySelector("[data-step-title]");
  var form = overlay.querySelector("[data-publish-form]");
  var errorEl = overlay.querySelector("[data-publish-error]");
  var caption = overlay.querySelector("[data-caption-input]");
  var count = overlay.querySelector("[data-caption-count]");
  var discard = overlay.querySelector("[data-discard]");
  var picker = mountProductPicker(overlay, function (pid) { updatePreviewTag(pid); });
  var step = "pick";
  var file = null;
  var previewUrl = null;
  var natural = { w: 0, h: 0 };
  var edit = { aspect: null, aspectId: "original", focusX: 0.5, focusY: 0.5, filterId: "none" };
  var busy = false;
  var closed = false;
  var svcRef = null;

  var TITLES = { pick: "Nova publicação", edit: "Ajustar", details: "Detalhes", sending: "Enviando", done: "Pronto" };
  function setStep(next) {
    step = next;
    panel.setAttribute("data-step", next);
    titleEl.textContent = TITLES[next];
    backBtn.hidden = !(next === "edit" || next === "details");
    nextBtn.hidden = next !== "edit";
    overlay.querySelectorAll("[data-dot]").forEach(function (d) {
      var order = ["pick", "edit", "details"];
      var di = order.indexOf(d.getAttribute("data-dot")), si = order.indexOf(next);
      d.classList.toggle("is-on", si === -1 ? true : di <= si);
    });
    if (next === "edit") requestAnimationFrame(layoutCrop);
    if (next === "details") { syncPreview(); caption.focus({ preventScroll: true }); }
  }

  service().then(function (svc) {
    svcRef = svc;
    if (svc.canFilter()) {
      overlay.querySelector("[data-filters-tool]").hidden = false;
    }
    return svc.getMyPublicName();
  }).then(function (name) {
    if (closed || !name) return;
    var as = overlay.querySelector("[data-publish-as]");
    as.innerHTML = "Você aparece como <b>" + esc(name) + '</b> · <a href="/conta">mudar apelido</a>';
    overlay.querySelectorAll("[data-preview-name], [data-preview-name2]").forEach(function (n) { n.textContent = name; });
    overlay.querySelector("[data-preview-avatar]").textContent = name.replace(/^@/, "").charAt(0).toUpperCase() || "S";
  });

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }

  function filterCss() {
    var f = FILTERS.filter(function (x) { return x.id === edit.filterId; })[0];
    return f ? f.css : "";
  }

  function renderFilters() {
    var box = overlay.querySelector("[data-filters]");
    box.innerHTML = FILTERS.map(function (f) {
      return '<button type="button" role="radio" class="sgc-filter" data-filter="' + f.id + '" aria-checked="' + (f.id === edit.filterId) + '">' +
        '<span class="sgc-filter-thumb"><img src="' + previewUrl + '" alt="" style="filter:' + (f.css || "none") + '"></span><span>' + f.label + "</span></button>";
    }).join("");
  }

  function setFile(f) {
    showError("");
    if (!f) return;
    service().then(function (svc) {
      var v = svc.validateFile(f);
      if (!v.ok) { toast(v.message.toUpperCase()); return; }
      var url = URL.createObjectURL(f);
      var probe = new Image();
      probe.onload = function () {
        if (closed) { URL.revokeObjectURL(url); return; }
        file = f;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = url;
        natural = { w: probe.naturalWidth, h: probe.naturalHeight };
        edit = { aspect: null, aspectId: "original", focusX: 0.5, focusY: 0.5, filterId: "none" };
        cropImg.src = url;
        overlay.querySelectorAll("[data-aspect]").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-aspect") === "original" ? "true" : "false"); });
        renderFilters();
        applyEdit();
        setStep("edit");
      };
      probe.onerror = function () {
        // HEIC fora do Safari: o navegador não mostra, mas o envio tenta mesmo assim
        if (closed) { URL.revokeObjectURL(url); return; }
        file = f;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = url;
        natural = { w: 0, h: 0 };
        setStep("details");
        overlay.querySelector("[data-preview-media]").classList.add("is-unreadable");
      };
      probe.src = url;
    });
  }

  function currentAspect() {
    if (edit.aspect) return edit.aspect;
    return natural.w && natural.h ? Math.min(2, Math.max(0.5, natural.w / natural.h)) : 0.8;
  }

  function layoutCrop() {
    var stage = overlay.querySelector("[data-stage]");
    var ar = currentAspect();
    var cs = getComputedStyle(stage);
    var maxW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var maxH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 34;
    var w = Math.min(maxW, maxH * ar);
    crop.style.width = Math.max(120, Math.floor(w)) + "px";
    crop.style.aspectRatio = String(ar);
  }

  function applyEdit() {
    var pos = (edit.focusX * 100).toFixed(2) + "% " + (edit.focusY * 100).toFixed(2) + "%";
    cropImg.style.objectPosition = pos;
    cropImg.style.filter = filterCss() || "none";
    overlay.querySelector("[data-crop-hint]").hidden = !edit.aspect;
    crop.classList.toggle("is-draggable", !!edit.aspect);
    layoutCrop();
  }

  function syncPreview() {
    var media = overlay.querySelector("[data-preview-media]");
    var img = overlay.querySelector("[data-preview-img]");
    var ar = currentAspect();
    media.style.aspectRatio = String(Math.min(1.6, Math.max(0.75, ar)));
    img.src = previewUrl || "";
    img.style.objectPosition = (edit.focusX * 100).toFixed(2) + "% " + (edit.focusY * 100).toFixed(2) + "%";
    img.style.filter = filterCss() || "none";
    overlay.querySelector("[data-preview-caption]").textContent = caption.value.trim() || "Sua legenda aparece aqui.";
    updatePreviewTag(picker.value());
  }

  function updatePreviewTag(pid) {
    var holder = overlay.querySelector("[data-preview-tag]");
    var p = productFor(pid);
    holder.innerHTML = p ? '<span class="sgc-tag">' + ICONS.bag + "<span>" + esc(p.name) + "</span></span>" : "";
  }

  // arrastar para enquadrar (só quando há recorte)
  var drag = null;
  crop.addEventListener("pointerdown", function (e) {
    if (!edit.aspect || !natural.w) return;
    drag = { x: e.clientX, y: e.clientY, fx: edit.focusX, fy: edit.focusY };
    crop.setPointerCapture(e.pointerId);
    crop.classList.add("is-dragging");
  });
  crop.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var r = crop.getBoundingClientRect();
    var imgRatio = natural.w / natural.h;
    var dispW = Math.max(r.width, r.height * imgRatio), dispH = Math.max(r.height, r.width / imgRatio);
    var overX = dispW - r.width, overY = dispH - r.height;
    if (overX > 1) edit.focusX = Math.min(1, Math.max(0, drag.fx - (e.clientX - drag.x) / overX));
    if (overY > 1) edit.focusY = Math.min(1, Math.max(0, drag.fy - (e.clientY - drag.y) / overY));
    cropImg.style.objectPosition = (edit.focusX * 100).toFixed(2) + "% " + (edit.focusY * 100).toFixed(2) + "%";
  });
  function endDrag() { drag = null; crop.classList.remove("is-dragging"); }
  crop.addEventListener("pointerup", endDrag);
  crop.addEventListener("pointercancel", endDrag);

  input.addEventListener("change", function () { setFile(input.files && input.files[0]); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-drag"); });
  });
  ["dragleave", "drop"].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-drag"); });
  });
  drop.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setFile(f);
  });
  caption.addEventListener("input", function () {
    count.textContent = caption.value.length + "/500";
    overlay.querySelector("[data-preview-caption]").textContent = caption.value.trim() || "Sua legenda aparece aqui.";
  });

  var STAGES = { optimizing: ["Otimizando a foto…", 28], uploading: ["Enviando…", 72], saving: ["Quase lá…", 92] };
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!file) { setStep("pick"); return; }
    busy = true;
    showError("");
    overlay.querySelector("[data-sending-img]").src = previewUrl || "";
    overlay.querySelector("[data-sending-img]").style.filter = filterCss() || "none";
    var bar = overlay.querySelector("[data-progress]");
    var label = overlay.querySelector("[data-sending-label]");
    bar.style.width = "8%";
    setStep("sending");
    var svc = svcRef || await service();
    var res = await svc.publish(file, caption.value, picker.value(), function (stage) {
      var s = STAGES[stage];
      if (s) { label.textContent = s[0]; bar.style.width = s[1] + "%"; }
    }, natural.w ? { aspect: edit.aspect, focusX: edit.focusX, focusY: edit.focusY, filter: filterCss() || null } : null);
    busy = false;
    if (closed) return;
    if (!res.ok) {
      setStep("details");
      showError(res.message);
      return;
    }
    bar.style.width = "100%";
    var doneImg = overlay.querySelector("[data-done-img]");
    doneImg.src = previewUrl || "";
    doneImg.style.objectPosition = (edit.focusX * 100).toFixed(2) + "% " + (edit.focusY * 100).toFixed(2) + "%";
    doneImg.style.filter = filterCss() || "none";
    overlay.querySelector(".sgc-done-art").style.aspectRatio = String(Math.min(1.6, Math.max(0.75, currentAspect())));
    setTimeout(function () {
      if (closed) return;
      setStep("done");
      overlay.querySelector("[data-done-title]").focus({ preventScroll: true });
    }, 380);
    if (opts.onPublished) opts.onPublished(res);
  });

  function hasDraft() { return !!file && (step === "edit" || step === "details"); }
  function requestClose() {
    if (busy) return;
    if (hasDraft()) { discard.hidden = false; discard.querySelector("[data-discard-no]").focus(); return; }
    close();
  }
  function resetAll() {
    file = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    caption.value = "";
    count.textContent = "0/500";
    picker.reset();
    showError("");
    overlay.querySelector("[data-preview-media]").classList.remove("is-unreadable");
    setStep("pick");
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("resize", onResize);
    picker.destroy();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    overlay.remove();
    if (!document.querySelector("[data-sgc-viewer]")) document.documentElement.classList.remove("sgc-lightbox-open");
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  function onResize() { if (step === "edit") layoutCrop(); }
  window.addEventListener("resize", onResize);

  function onKeydown(e) {
    if (e.key === "Escape" && !discard.hidden) { e.stopPropagation(); e.preventDefault(); discard.hidden = true; return; }
    // ESC com a lista de peças aberta fecha só a lista
    if (e.key === "Escape" && picker.isOpen()) { e.stopPropagation(); e.preventDefault(); picker.close(true); }
    else if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); requestClose(); }
    else if (e.key === "Tab") {
      var scope = discard.hidden ? overlay : discard;
      var f = Array.prototype.filter.call(scope.querySelectorAll("button, a[href], input, select, textarea, summary"), function (n) { return (n.offsetParent !== null || n === input) && !n.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKeydown, true);

  overlay.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-discard-yes]")) { discard.hidden = true; close(); return; }
    if (t.closest("[data-discard-no]")) { discard.hidden = true; return; }
    if (t.closest("[data-publish-close]")) { requestClose(); return; }
    if (t.closest("[data-step-back]")) { if (step === "details" && natural.w) setStep("edit"); else resetAll(); return; }
    if (t.closest("[data-step-next]")) { setStep("details"); return; }
    if (t.closest("[data-publish-mine]")) { close(); if (opts.onShowMine) opts.onShowMine(); return; }
    if (t.closest("[data-publish-again]")) { resetAll(); return; }
    var a = t.closest("[data-aspect]");
    if (a) {
      var spec = ASPECTS.filter(function (x) { return x.id === a.getAttribute("data-aspect"); })[0];
      edit.aspect = spec.value; edit.aspectId = spec.id; edit.focusX = 0.5; edit.focusY = 0.5;
      overlay.querySelectorAll("[data-aspect]").forEach(function (b) { b.setAttribute("aria-checked", b === a ? "true" : "false"); });
      applyEdit();
      return;
    }
    var f = t.closest("[data-filter]");
    if (f) {
      edit.filterId = f.getAttribute("data-filter");
      overlay.querySelectorAll("[data-filter]").forEach(function (b) { b.setAttribute("aria-checked", b === f ? "true" : "false"); });
      applyEdit();
    }
  });

  setStep("pick");
  input.focus({ preventScroll: true });
  return { close: close };
}

/** "Postar meu visual" de qualquer lugar: pede login primeiro (o arquivo não
 *  sobrevive ao redirect do Google, então depois do login a pessoa clica de
 *  novo). */
export async function startPublish(opts) {
  var session = window.SG.auth ? await window.SG.auth.getSession() : null;
  if (!session) {
    toast("ENTRE NA SUA CONTA PARA POSTAR");
    if (window.SG.auth) window.SG.auth.open();
    return null;
  }
  return openPublisher(opts);
}
