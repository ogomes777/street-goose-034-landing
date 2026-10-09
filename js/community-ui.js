/* Street Goose 034 — SG Community: peças compartilhadas entre o mural da
   home (community-home.js) e o feed de /comunidade (community-page.js):
   card do post, visualizador em tela cheia, curtir, compartilhar e o
   formulário de publicação. Todo texto vindo do banco passa por SG.esc. */

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
};

// fotos de campanha da marca (convite do mural vazio). new URL(): o Vite
// empacota e versiona — caminho em string pura quebrava no build.
var CAMPAIGN_PHOTOS = [
  new URL("../assets/lifestyle/web/street-01.webp", import.meta.url).href,
  new URL("../assets/lifestyle/web/street-02.webp", import.meta.url).href,
  new URL("../assets/lifestyle/web/street-03.webp", import.meta.url).href,
];

/** convite "seja o primeiro visual" — ctaHtml é o botão/link de postar */
export function emptyStateHtml(ctaHtml, extraClass) {
  return '<div class="sgc-empty' + (extraClass ? " " + extraClass : "") + '">' +
    '<div class="sgc-empty-art" aria-hidden="true">' +
      CAMPAIGN_PHOTOS.map(function (src) { return '<img src="' + src + '" alt="" loading="lazy" decoding="async">'; }).join("") +
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

export function altFor(post) {
  return post.caption
    ? "Visual de " + post.author.name + ": " + post.caption.slice(0, 140)
    : "Visual de " + post.author.name + " na SG Community";
}

function countLabel(n) {
  if (n >= 10000) return Math.round(n / 1000) + " mil";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + " mil";
  return String(n);
}

export function likeButtonHtml(post, extraClass) {
  return '<button class="sgc-like' + (extraClass ? " " + extraClass : "") + '" type="button" data-like="' + esc(post.id) + '" aria-pressed="' + (post.liked ? "true" : "false") + '" aria-label="' + (post.liked ? "Descurtir" : "Curtir") + '">' +
    ICONS.heart + '<span data-like-count>' + countLabel(post.likeCount) + "</span></button>";
}

export function productChipHtml(post) {
  var p = productFor(post.productId);
  if (!p) return "";
  return '<button class="sgc-product-chip" type="button" data-product="' + esc(p.id) + '">' +
    (p.images && p.images[0] ? '<img src="' + esc(p.images[0]) + '" alt="" loading="lazy" decoding="async">' : "") +
    "<span><small>Usando</small><b>" + esc(p.name) + "</b></span></button>";
}

export function postCardHtml(post, i) {
  return '<article class="sgc-post" data-post="' + esc(post.id) + '" style="--i:' + (i || 0) + '">' +
    '<header class="sgc-post-head">' + avatarHtml(post.author) +
      '<p class="sgc-who"><b>' + esc(post.author.name) + "</b><span>Nível " + (post.author.level || 1) + " · " + esc(timeAgo(post.createdAt)) + "</span></p>" +
      (post.featured ? '<span class="sgc-badge">Destaque</span>' : "") +
    "</header>" +
    '<button class="sgc-post-media" type="button" data-open-post="' + esc(post.id) + '" style="aspect-ratio:' + ratio(post).toFixed(4) + '" aria-label="Abrir visual de ' + esc(post.author.name) + '">' +
      (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="' + esc(altFor(post)) + '" loading="lazy" decoding="async">' : '<span class="sgc-media-missing">Foto indisponível</span>') +
    "</button>" +
    '<div class="sgc-post-actions">' + likeButtonHtml(post) +
      '<button class="sgc-icon-btn" type="button" data-share="' + esc(post.id) + '" aria-label="Compartilhar">' + ICONS.share + "</button>" +
      productChipHtml(post) +
    "</div>" +
    (post.caption ? '<p class="sgc-caption">' + esc(post.caption) + "</p>" : "") +
  "</article>";
}

// ---------- curtir / compartilhar ----------
export function syncLike(post) {
  document.querySelectorAll('[data-like="' + CSS.escape(post.id) + '"]').forEach(function (btn) {
    btn.setAttribute("aria-pressed", post.liked ? "true" : "false");
    btn.setAttribute("aria-label", post.liked ? "Descurtir" : "Curtir");
    var c = btn.querySelector("[data-like-count]");
    if (c) c.textContent = countLabel(post.likeCount);
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

export async function sharePost(post) {
  var url = postUrl(post);
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: "SG Community — Street Goose 034", text: "Visual de " + post.author.name + " na Street Goose 034", url: url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast("LINK DO VISUAL COPIADO"); }
  catch (e) { toast("NÃO FOI POSSÍVEL COPIAR O LINK"); }
}

export function openProduct(id) {
  var p = productFor(id);
  if (p && window.SG.openQuickView) window.SG.openQuickView(p);
}

function burst(el) {
  if (!el) return;
  el.classList.remove("is-on");
  void el.offsetWidth;
  el.classList.add("is-on");
}

function anyModalOnTop() {
  return !!document.querySelector(".quickview.is-open, .zoom-viewer.is-open, .auth-modal:not([hidden]), [data-sgc-publisher]");
}

// ---------- visualizador em tela cheia ----------
/* opts: posts (array, pode crescer), index, onIndex(i), onClose(), loadMore()
   → Promise<boolean> (true se chegaram mais posts) */
export function openViewer(opts) {
  var posts = opts.posts;
  var index = opts.index;
  var opener = document.activeElement;
  var el = document.createElement("div");
  el.className = "sgc-viewer";
  el.setAttribute("data-sgc-viewer", "");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Visual da SG Community");
  el.innerHTML =
    '<div class="sgc-viewer-backdrop" data-viewer-close></div>' +
    '<div class="sgc-viewer-frame" data-viewer-frame></div>' +
    '<button class="sgc-viewer-btn sgc-viewer-close" type="button" data-viewer-close aria-label="Fechar">' + ICONS.close + "</button>" +
    '<button class="sgc-viewer-btn sgc-viewer-prev" type="button" data-viewer-prev aria-label="Visual anterior">' + ICONS.prev + "</button>" +
    '<button class="sgc-viewer-btn sgc-viewer-next" type="button" data-viewer-next aria-label="Próximo visual">' + ICONS.next + "</button>";
  document.body.appendChild(el);
  var frame = el.querySelector("[data-viewer-frame]");
  var closed = false;
  var loadingMore = false;

  function render() {
    var post = posts[index];
    if (!post) return;
    frame.innerHTML =
      '<div class="sgc-viewer-media" data-viewer-media>' +
        (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="' + esc(altFor(post)) + '" draggable="false">' : '<span class="sgc-media-missing">Foto indisponível</span>') +
        '<span class="sgc-burst" data-burst aria-hidden="true">' + ICONS.heart + "</span>" +
      "</div>" +
      '<aside class="sgc-viewer-side">' +
        '<header class="sgc-post-head">' + avatarHtml(post.author) +
          '<p class="sgc-who"><b>' + esc(post.author.name) + "</b><span>Nível " + (post.author.level || 1) + (post.author.levelName ? " — " + esc(post.author.levelName) : "") + " · " + esc(timeAgo(post.createdAt)) + "</span></p>" +
          (post.featured ? '<span class="sgc-badge">Destaque</span>' : "") +
        "</header>" +
        (post.caption ? '<p class="sgc-viewer-caption">' + esc(post.caption) + "</p>" : "") +
        viewerProductHtml(post) +
        '<div class="sgc-viewer-actions">' + likeButtonHtml(post, "sgc-like--big") +
          '<button class="sgc-icon-btn" type="button" data-share="' + esc(post.id) + '" aria-label="Compartilhar">' + ICONS.share + "<span>Compartilhar</span></button>" +
        "</div>" +
        '<p class="sgc-viewer-hint">' + (matchMedia("(pointer: coarse)").matches ? "Toque duas vezes na foto para curtir, arraste para o lado para trocar" : "Clique duas vezes na foto para curtir, use ← → para trocar") + " · " + (index + 1) + " de " + posts.length + (opts.hasMore && opts.hasMore() ? "+" : "") + "</p>" +
      "</aside>";
    el.querySelector("[data-viewer-prev]").hidden = index === 0;
    el.querySelector("[data-viewer-next]").hidden = index >= posts.length - 1 && !(opts.hasMore && opts.hasMore());
    // pré-carrega a próxima foto: navegação sem tela vazia
    var nextPost = posts[index + 1];
    if (nextPost && nextPost.imageUrl) { var pre = new Image(); pre.src = nextPost.imageUrl; }
  }

  function viewerProductHtml(post) {
    var p = productFor(post.productId);
    if (!p) return "";
    return '<div class="sgc-viewer-product">' +
      (p.images && p.images[0] ? '<img src="' + esc(p.images[0]) + '" alt="" loading="lazy" decoding="async">' : "") +
      "<div><small>Peça no visual</small><b>" + esc(p.name) + '</b><span data-price-for="' + esc(p.id) + '">' + esc(p.priceLabel || "") + "</span></div>" +
      '<button class="btn btn-ghost" type="button" data-product="' + esc(p.id) + '">Ver peça</button>' +
    "</div>";
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
    document.removeEventListener("keydown", onKeydown, true);
    el.remove();
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    if (opts.onClose) opts.onClose(!!fromHistory);
  }

  function onKeydown(e) {
    if (anyModalOnTop()) return;
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "Tab") {
      var f = el.querySelectorAll('button:not([hidden]), a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKeydown, true);

  el.addEventListener("click", function (e) {
    if (e.target.closest("[data-viewer-close]")) { close(); return; }
    if (e.target.closest("[data-viewer-prev]")) { go(-1); return; }
    if (e.target.closest("[data-viewer-next]")) { go(1); return; }
    var like = e.target.closest("[data-like]");
    if (like) { toggleLike(posts[index]); return; }
    if (e.target.closest("[data-share]")) { sharePost(posts[index]); return; }
    var prod = e.target.closest("[data-product]");
    if (prod) openProduct(prod.getAttribute("data-product"));
  });

  // toque duplo curte, arrastar para o lado troca de visual
  var down = null, lastTap = 0;
  frame.addEventListener("pointerdown", function (e) {
    if (!e.target.closest("[data-viewer-media]")) return;
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

  render();
  el.querySelector("[data-viewer-close]").focus({ preventScroll: true });

  return {
    close: close,
    get index() { return index; },
    show: function (i) { if (i >= 0 && i < posts.length) { index = i; render(); } },
    refresh: render,
  };
}

// ---------- publicar visual ----------
function productOptionsHtml() {
  var byCat = {};
  var order = [];
  (window.SG_PRODUCTS || []).forEach(function (p) {
    if (p.gone || p.hidden) return;
    var label = p.categoryLabel || "Outros";
    if (!byCat[label]) { byCat[label] = []; order.push(label); }
    byCat[label].push(p);
  });
  return '<option value="">Nenhuma — só o visual</option>' + order.map(function (label) {
    return '<optgroup label="' + esc(label) + '">' + byCat[label].map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>";
    }).join("") + "</optgroup>";
  }).join("");
}

/* opts: onPublished() — chamado depois do envio dar certo (ex.: abrir "Meus
   posts"). O chamador garante que há sessão. */
export function openPublisher(opts) {
  opts = opts || {};
  var opener = document.activeElement;
  var overlay = document.createElement("div");
  overlay.className = "sgc-publisher";
  overlay.setAttribute("data-sgc-publisher", "");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sgc-publisher-title");
  overlay.innerHTML =
    '<div class="sgc-publisher-backdrop" data-publish-close></div>' +
    '<div class="sgc-publisher-panel">' +
      '<button class="sgc-viewer-btn sgc-publisher-close" type="button" data-publish-close aria-label="Fechar">' + ICONS.close + "</button>" +
      '<form class="sgc-publisher-form" data-publish-form novalidate>' +
        '<label class="sgc-drop" data-drop>' +
          '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-photo-input>' +
          '<span class="sgc-drop-empty" data-drop-empty>' + ICONS.camera + "<b>Escolher foto</b><small>ou arraste aqui · JPG, PNG, WEBP ou HEIC</small></span>" +
          '<img class="sgc-drop-preview" data-drop-preview alt="Prévia do seu visual" hidden>' +
          '<span class="sgc-drop-change" data-drop-change hidden>Trocar foto</span>' +
        "</label>" +
        '<div class="sgc-publisher-fields">' +
          '<p class="kicker">SG COMMUNITY</p>' +
          '<h2 id="sgc-publisher-title">Postar meu visual</h2>' +
          '<p class="sgc-publisher-as" data-publish-as>Você aparece como…</p>' +
          '<label class="sgc-field">Legenda<textarea name="caption" rows="3" maxlength="500" placeholder="Onde foi, qual o rolê, o que a peça fez pelo visual…"></textarea><small data-caption-count>0/500</small></label>' +
          '<label class="sgc-field">Peça no visual<select name="product">' + productOptionsHtml() + "</select></label>" +
          '<ul class="sgc-publisher-rules">' +
            "<li>Foto sua (ou da sua turma) usando Street Goose.</li>" +
            "<li>A equipe aprova antes de entrar no feed — sem nudez, ódio ou marca de terceiros.</li>" +
            "<li><b>+30 XP</b> quando o visual for aprovado.</li>" +
          "</ul>" +
          '<p class="sgc-form-error" data-publish-error role="alert" hidden></p>' +
          '<button class="btn btn-primary sgc-publish-submit" type="submit" data-publish-submit>Enviar para aprovação</button>' +
        "</div>" +
      "</form>" +
      '<div class="sgc-publisher-done" data-publish-done hidden>' +
        '<p class="kicker">RECEBIDO</p><h2>Seu visual está em análise.</h2>' +
        "<p>Quando a equipe aprovar, ele entra no feed da SG Community e você ganha <b>+30 XP</b>.</p>" +
        '<div class="sgc-publisher-done-actions"><button class="btn btn-primary" type="button" data-publish-mine>Ver meus posts</button><button class="btn btn-ghost" type="button" data-publish-close>Fechar</button></div>' +
      "</div>" +
    "</div>";
  document.body.appendChild(overlay);

  var form = overlay.querySelector("[data-publish-form]");
  var input = overlay.querySelector("[data-photo-input]");
  var drop = overlay.querySelector("[data-drop]");
  var preview = overlay.querySelector("[data-drop-preview]");
  var errorEl = overlay.querySelector("[data-publish-error]");
  var submitBtn = overlay.querySelector("[data-publish-submit]");
  var caption = overlay.querySelector('[name="caption"]');
  var count = overlay.querySelector("[data-caption-count]");
  var file = null;
  var previewUrl = null;
  var busy = false;
  var closed = false;

  service().then(function (svc) { return svc.getMyPublicName(); }).then(function (name) {
    var as = overlay.querySelector("[data-publish-as]");
    if (as && name) as.innerHTML = "Você aparece como <b>" + esc(name) + '</b> · <a href="/conta">mudar apelido</a>';
  });

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }

  function setFile(f) {
    showError("");
    if (!f) return;
    service().then(function (svc) {
      var v = svc.validateFile(f);
      if (!v.ok) { showError(v.message); return; }
      file = f;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(f);
      preview.onload = function () { drop.style.setProperty("--ratio", String(Math.min(1.6, Math.max(0.6, preview.naturalWidth / preview.naturalHeight)))); };
      preview.onerror = function () { preview.hidden = true; overlay.querySelector("[data-drop-empty]").hidden = false; overlay.querySelector("[data-drop-empty] b").textContent = f.name; };
      preview.src = previewUrl;
      preview.hidden = false;
      overlay.querySelector("[data-drop-empty]").hidden = true;
      overlay.querySelector("[data-drop-change]").hidden = false;
      drop.classList.add("has-file");
    });
  }

  input.addEventListener("change", function () { setFile(input.files && input.files[0]); });
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
  caption.addEventListener("input", function () { count.textContent = caption.value.length + "/500"; });

  var STAGES = { optimizing: "Otimizando a foto…", uploading: "Enviando…", saving: "Quase lá…" };
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    if (!file) { showError("Escolha a foto do seu visual."); input.focus(); return; }
    busy = true;
    showError("");
    submitBtn.disabled = true;
    var svc = await service();
    var res = await svc.publish(file, caption.value, overlay.querySelector('[name="product"]').value || null, function (stage) {
      submitBtn.textContent = STAGES[stage] || "Enviando…";
    });
    busy = false;
    if (closed) return;
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar para aprovação";
    if (!res.ok) { showError(res.message); return; }
    form.hidden = true;
    var done = overlay.querySelector("[data-publish-done]");
    done.hidden = false;
    done.querySelector("[data-publish-mine]").focus();
    if (opts.onPublished) opts.onPublished();
  });

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown, true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    overlay.remove();
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  function onKeydown(e) {
    if (e.key === "Escape" && !busy) { e.stopPropagation(); e.preventDefault(); close(); }
    else if (e.key === "Tab") {
      var f = Array.prototype.filter.call(overlay.querySelectorAll("button, a[href], input, select, textarea"), function (n) { return n.offsetParent !== null || n === input; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKeydown, true);
  overlay.addEventListener("click", function (e) {
    if (e.target.closest("[data-publish-close]") && !busy) close();
    else if (e.target.closest("[data-publish-mine]")) { close(); if (opts.onShowMine) opts.onShowMine(); }
  });
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
