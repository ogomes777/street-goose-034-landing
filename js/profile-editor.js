/* Street Goose 034 — editar perfil público (foto, nome, @, bio).
   Usado na SG Community e em /conta. Foto: recorte redondo (arrastar +
   zoom) gerado no próprio aparelho em 512×512, ou a foto do login Google,
   ou nenhuma. Tudo validado de novo no servidor (community_save_profile,
   0109). opts.onSaved(profile) recebe { name, handle, bio, avatarUrl }. */
import "./profile-editor.css";

var svcPromise = null;
function service() {
  if (!svcPromise) svcPromise = import("../src/services/CommunityService.ts").then(function (m) { return m.CommunityService; });
  return svcPromise;
}
function esc(v) { return window.SG.esc(v == null ? "" : String(v)); }
function toast(msg) { if (window.SG.toast) window.SG.toast(msg); }

var ICON = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>',
  google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6z"/><path d="M12 21c2.4 0 4.4-.8 5.9-2.2L15 16.6c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21z"/><path d="M7 13.8a5.4 5.4 0 0 1 0-3.6V7.9H4a9 9 0 0 0 0 8.2z"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 4 7.9l3 2.3c.7-2.1 2.7-3.6 5-3.6z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>',
  minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
};
var HANDLE_RE = /^[A-Za-z0-9_.]{3,24}$/;
var CROP_OUT = 512;

function googlePhoto(session) {
  var meta = (session && session.user && session.user.user_metadata) || {};
  var u = meta.avatar_url || meta.picture;
  return typeof u === "string" && /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//.test(u) ? u : null;
}

export async function openProfileEditor(opts) {
  opts = opts || {};
  if (document.querySelector("[data-pfe]")) return null;
  var session = window.SG.auth ? await window.SG.auth.getSession() : null;
  if (!session) {
    toast("ENTRE NA SUA CONTA PARA EDITAR O PERFIL");
    if (window.SG.auth) window.SG.auth.open();
    return null;
  }
  var svc = await service();
  var current = await svc.getEditableProfile();
  if (!current) { toast("EDIÇÃO DE PERFIL INDISPONÍVEL AGORA"); return null; }
  var meta = session.user.user_metadata || {};
  if (!current.name) current.name = meta.name || meta.full_name || "";
  var google = googlePhoto(session);
  var state = { avatarUrl: current.avatarUrl, pendingBlob: null, pendingUrl: null };
  var opener = document.activeElement;
  var closed = false;
  var busy = false;

  var el = document.createElement("div");
  el.className = "pfe";
  el.setAttribute("data-pfe", "");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "pfe-title");
  el.innerHTML =
    '<div class="pfe-backdrop" data-pfe-close></div>' +
    '<div class="pfe-panel">' +
      '<header class="pfe-bar"><h2 id="pfe-title">Editar perfil</h2>' +
        '<button class="pfe-x" type="button" data-pfe-close aria-label="Fechar">' + ICON.close + "</button></header>" +
      '<div class="pfe-scroll">' +
        '<section class="pfe-hero" data-pfe-hero>' +
          '<div class="pfe-aura" aria-hidden="true"></div>' +
          '<div class="pfe-avatar-wrap">' +
            '<span class="pfe-ring"><span class="pfe-avatar" data-pfe-avatar></span></span>' +
            '<label class="pfe-cam" title="Trocar foto">' + ICON.camera + '<span class="pfe-vh">Trocar foto</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-pfe-file></label>' +
          "</div>" +
          '<p class="pfe-who"><b data-pfe-prev-handle></b><small data-pfe-prev-name></small></p>' +
          '<div class="pfe-photo-actions">' +
            '<label class="pfe-chip">' + ICON.camera + "Trocar foto" + '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" data-pfe-file></label>' +
            (google ? '<button class="pfe-chip" type="button" data-pfe-google>' + ICON.google + "Usar foto do Google</button>" : "") +
            '<button class="pfe-chip is-danger" type="button" data-pfe-remove>' + ICON.trash + "Remover</button>" +
          "</div>" +
        "</section>" +
        '<section class="pfe-crop" data-pfe-crop hidden aria-label="Enquadrar foto">' +
          '<p class="pfe-crop-title">Enquadre sua foto</p>' +
          '<div class="pfe-crop-frame" data-crop-frame><img data-crop-img alt="Sua foto" draggable="false"><span class="pfe-crop-ring" aria-hidden="true"></span></div>' +
          '<div class="pfe-zoom"><button type="button" data-zoom-step="-1" aria-label="Diminuir zoom">' + ICON.minus + '</button>' +
            '<input type="range" min="1" max="3" step="0.01" value="1" data-crop-zoom aria-label="Zoom">' +
            '<button type="button" data-zoom-step="1" aria-label="Aumentar zoom">' + ICON.plus + "</button></div>" +
          '<div class="pfe-crop-actions"><button class="pfe-btn pfe-btn--ghost" type="button" data-crop-cancel>Cancelar</button><button class="pfe-btn pfe-btn--primary" type="button" data-crop-apply>Usar esta foto</button></div>' +
        "</section>" +
        '<form class="pfe-form" data-pfe-form novalidate>' +
          '<label class="pfe-field"><span>Nome</span><input name="name" maxlength="60" autocomplete="name" required value="' + esc(current.name) + '">' +
            "<small>Seu nome na conta. Sem @, o feed mostra só o primeiro nome.</small></label>" +
          '<label class="pfe-field"><span>@ de usuário</span><span class="pfe-at"><i aria-hidden="true">@</i><input name="handle" maxlength="25" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="seu.nome" value="' + esc(current.handle || "") + '"></span>' +
            '<small data-handle-msg>Aparece no feed, nos comentários e no ranking.</small></label>' +
          '<label class="pfe-field"><span>Bio</span><textarea name="bio" rows="3" maxlength="160" placeholder="Seu estilo em uma linha…">' + esc(current.bio || "") + "</textarea>" +
            '<small data-bio-count>' + (current.bio || "").length + "/160</small></label>" +
          '<p class="pfe-error" data-pfe-error role="alert" hidden></p>' +
          '<button class="pfe-btn pfe-btn--primary pfe-save" type="submit" data-pfe-save><span data-save-label>Salvar perfil</span></button>' +
        "</form>" +
      "</div>" +
    "</div>";
  document.body.appendChild(el);

  var form = el.querySelector("[data-pfe-form]");
  var nameIn = form.querySelector('[name="name"]');
  var handleIn = form.querySelector('[name="handle"]');
  var bioIn = form.querySelector('[name="bio"]');
  var handleMsg = el.querySelector("[data-handle-msg]");
  var errorEl = el.querySelector("[data-pfe-error]");
  var saveBtn = el.querySelector("[data-pfe-save]");
  var cropSec = el.querySelector("[data-pfe-crop]");
  var heroSec = el.querySelector("[data-pfe-hero]");

  function initialOf() { return ((handleIn.value.replace(/^@/, "") || nameIn.value || "S").trim().charAt(0) || "S").toUpperCase(); }
  function shownAvatar() { return state.pendingUrl || state.avatarUrl; }
  function renderAvatar() {
    var box = el.querySelector("[data-pfe-avatar]");
    var url = shownAvatar();
    box.innerHTML = url ? '<img src="' + esc(url) + '" alt="" referrerpolicy="no-referrer">' : "<span>" + esc(initialOf()) + "</span>";
    el.querySelector("[data-pfe-remove]").hidden = !url;
    var g = el.querySelector("[data-pfe-google]");
    if (g) g.hidden = url === google;
  }
  function renderWho() {
    var h = handleIn.value.trim().replace(/^@/, "");
    var first = nameIn.value.trim().split(/\s+/)[0] || "";
    el.querySelector("[data-pfe-prev-handle]").textContent = h ? "@" + h : (first || "Seu nome");
    el.querySelector("[data-pfe-prev-name]").textContent = h ? first : "Membro Street Goose";
    if (!shownAvatar()) renderAvatar();
  }
  renderAvatar();
  renderWho();

  // ---------- @ ao vivo ----------
  var handleTimer = null, handleState = "ok", handleSeq = 0;
  function setHandleMsg(text, kind) {
    handleMsg.textContent = text;
    handleMsg.className = kind ? "is-" + kind : "";
  }
  function checkHandle() {
    clearTimeout(handleTimer);
    var raw = handleIn.value.trim();
    if (raw.charAt(0) === "@") { handleIn.value = raw = raw.slice(1); }
    renderWho();
    if (!raw) { handleState = "ok"; setHandleMsg("Sem @, aparece o seu primeiro nome.", ""); return; }
    if (!HANDLE_RE.test(raw)) { handleState = "bad"; setHandleMsg("De 3 a 24 caracteres: letras, números, ponto ou _.", "bad"); return; }
    if (current.handle && raw.toLowerCase() === current.handle.toLowerCase()) { handleState = "ok"; setHandleMsg("Esse é o seu @ atual.", "ok"); return; }
    handleState = "checking";
    setHandleMsg("Conferindo…", "");
    var n = ++handleSeq;
    handleTimer = setTimeout(function () {
      svc.isHandleAvailable(raw).then(function (free) {
        if (closed || n !== handleSeq) return;
        if (free === null) { handleState = "ok"; setHandleMsg("Aparece no feed, nos comentários e no ranking.", ""); return; }
        handleState = free ? "ok" : "taken";
        setHandleMsg(free ? "@" + raw + " está livre." : "Esse @ já é de outra pessoa.", free ? "ok" : "bad");
      });
    }, 380);
  }
  handleIn.addEventListener("input", checkHandle);
  nameIn.addEventListener("input", renderWho);
  bioIn.addEventListener("input", function () { el.querySelector("[data-bio-count]").textContent = bioIn.value.length + "/160"; });

  // ---------- recorte redondo ----------
  var crop = { img: null, url: null, w: 0, h: 0, base: 1, zoom: 1, ox: 0, oy: 0, size: 0 };
  var cropImg = el.querySelector("[data-crop-img]");
  var frame = el.querySelector("[data-crop-frame]");
  var zoomIn = el.querySelector("[data-crop-zoom]");

  function clampCrop() {
    var iw = crop.w * crop.base * crop.zoom, ih = crop.h * crop.base * crop.zoom;
    crop.ox = Math.min(0, Math.max(crop.size - iw, crop.ox));
    crop.oy = Math.min(0, Math.max(crop.size - ih, crop.oy));
    cropImg.style.width = iw + "px";
    cropImg.style.height = ih + "px";
    cropImg.style.transform = "translate3d(" + crop.ox + "px," + crop.oy + "px,0)";
  }
  function setZoom(z) {
    var prev = crop.zoom;
    crop.zoom = Math.min(3, Math.max(1, z));
    // zoom a partir do centro do círculo
    var c = crop.size / 2, k = crop.zoom / prev;
    crop.ox = c - (c - crop.ox) * k;
    crop.oy = c - (c - crop.oy) * k;
    zoomIn.value = String(crop.zoom);
    clampCrop();
  }
  function startCrop(file) {
    errorEl.hidden = true;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) { toast("ENVIE UMA FOTO (JPG, PNG OU WEBP)"); return; }
    if (file.size > 30 * 1024 * 1024) { toast("FOTO MAIOR QUE 30MB"); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      if (closed) { URL.revokeObjectURL(url); return; }
      if (crop.url) URL.revokeObjectURL(crop.url);
      crop.img = img; crop.url = url; crop.w = img.naturalWidth; crop.h = img.naturalHeight;
      cropSec.hidden = false;
      heroSec.hidden = true;
      form.hidden = true;
      cropImg.src = url;
      requestAnimationFrame(function () {
        crop.size = frame.clientWidth;
        crop.base = Math.max(crop.size / crop.w, crop.size / crop.h);
        crop.zoom = 1;
        zoomIn.value = "1";
        crop.ox = (crop.size - crop.w * crop.base) / 2;
        crop.oy = (crop.size - crop.h * crop.base) / 2;
        clampCrop();
        el.querySelector("[data-crop-apply]").focus({ preventScroll: true });
      });
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast("NÃO DEU PARA LER ESSA FOTO AQUI — TENTE JPG OU PNG"); };
    img.src = url;
  }
  function endCrop() {
    cropSec.hidden = true;
    heroSec.hidden = false;
    form.hidden = false;
  }
  function applyCrop() {
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = CROP_OUT;
    var ctx = canvas.getContext("2d");
    if (!ctx) { toast("NÃO DEU PARA PREPARAR A FOTO"); return; }
    var s = CROP_OUT / crop.size;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(crop.img, 0, 0, crop.w, crop.h, crop.ox * s, crop.oy * s, crop.w * crop.base * crop.zoom * s, crop.h * crop.base * crop.zoom * s);
    canvas.toBlob(function (blob) {
      function done(b) {
        canvas.width = canvas.height = 0;
        if (!b) { toast("NÃO DEU PARA PREPARAR A FOTO"); return; }
        if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
        state.pendingBlob = b;
        state.pendingUrl = URL.createObjectURL(b);
        endCrop();
        renderAvatar();
        var ring = el.querySelector(".pfe-ring");
        ring.classList.remove("is-new"); void ring.offsetWidth; ring.classList.add("is-new");
      }
      if (blob && blob.type === "image/webp") done(blob);
      else canvas.toBlob(done, "image/jpeg", 0.9);
    }, "image/webp", 0.9);
  }

  var drag = null;
  frame.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, ox: crop.ox, oy: crop.oy };
    frame.setPointerCapture(e.pointerId);
    frame.classList.add("is-dragging");
  });
  frame.addEventListener("pointermove", function (e) {
    if (!drag) return;
    crop.ox = drag.ox + (e.clientX - drag.x);
    crop.oy = drag.oy + (e.clientY - drag.y);
    clampCrop();
  });
  function endDrag() { drag = null; frame.classList.remove("is-dragging"); }
  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);
  frame.addEventListener("wheel", function (e) { e.preventDefault(); setZoom(crop.zoom - e.deltaY * 0.0015); }, { passive: false });
  zoomIn.addEventListener("input", function () { setZoom(Number(zoomIn.value)); });

  el.querySelectorAll("[data-pfe-file]").forEach(function (inp) {
    inp.addEventListener("change", function () { var f = inp.files && inp.files[0]; inp.value = ""; if (f) startCrop(f); });
  });

  // ---------- salvar ----------
  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = !msg; }
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    showError("");
    var name = nameIn.value.trim();
    var handle = handleIn.value.trim().replace(/^@/, "") || null;
    if (!name) { showError("Coloca o seu nome."); nameIn.focus(); return; }
    if (handle && !HANDLE_RE.test(handle)) { showError("O @ precisa ter de 3 a 24 caracteres: letras, números, ponto ou _."); handleIn.focus(); return; }
    if (handleState === "taken") { showError("Esse @ já é de outra pessoa. Tenta outro."); handleIn.focus(); return; }
    busy = true;
    saveBtn.disabled = true;
    saveBtn.classList.add("is-busy");
    var label = el.querySelector("[data-save-label]");
    var avatarUrl = state.avatarUrl;
    if (state.pendingBlob) {
      label.textContent = "Enviando foto…";
      var up = await svc.uploadAvatar(state.pendingBlob);
      if (closed) return;
      if (!up.ok) { busy = false; saveBtn.disabled = false; saveBtn.classList.remove("is-busy"); label.textContent = "Salvar perfil"; showError(up.message); return; }
      avatarUrl = up.url;
    }
    label.textContent = "Salvando…";
    var res = await svc.saveProfile({ name: name, handle: handle, bio: bioIn.value.trim() || null, avatarUrl: avatarUrl || null });
    if (closed) return;
    busy = false;
    saveBtn.classList.remove("is-busy");
    if (!res.ok) { saveBtn.disabled = false; label.textContent = "Salvar perfil"; showError(res.message); if (res.reason === "handle_taken" || res.reason === "invalid_handle") handleIn.focus(); return; }
    state.avatarUrl = res.profile.avatarUrl;
    saveBtn.classList.add("is-done");
    label.innerHTML = ICON.check + "Perfil salvo";
    toast("PERFIL ATUALIZADO");
    if (opts.onSaved) opts.onSaved(res.profile);
    setTimeout(close, 650);
  });

  // ---------- fechar / teclado ----------
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown, true);
    if (crop.url) URL.revokeObjectURL(crop.url);
    if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
    el.classList.add("is-leaving");
    setTimeout(function () { el.remove(); }, 220);
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  function onKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation(); e.preventDefault();
      if (!cropSec.hidden) endCrop();
      else if (!busy) close();
    } else if (e.key === "Tab") {
      var f = Array.prototype.filter.call(el.querySelectorAll("button, input, textarea, label.pfe-chip, label.pfe-cam"), function (n) { return n.offsetParent !== null && !n.disabled && !(n.tagName === "INPUT" && n.type === "file"); });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", onKeydown, true);
  el.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-pfe-close]") && !busy) { close(); return; }
    if (t.closest("[data-pfe-google]")) {
      if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
      state.pendingBlob = null; state.pendingUrl = null; state.avatarUrl = google;
      renderAvatar();
      return;
    }
    if (t.closest("[data-pfe-remove]")) {
      if (state.pendingUrl) URL.revokeObjectURL(state.pendingUrl);
      state.pendingBlob = null; state.pendingUrl = null; state.avatarUrl = null;
      renderAvatar();
      return;
    }
    if (t.closest("[data-crop-cancel]")) { endCrop(); return; }
    if (t.closest("[data-crop-apply]")) { applyCrop(); return; }
    var step = t.closest("[data-zoom-step]");
    if (step) setZoom(crop.zoom + Number(step.getAttribute("data-zoom-step")) * 0.2);
  });
  // labels com input file: Enter/Espaço abre a galeria
  el.querySelectorAll("label.pfe-chip, label.pfe-cam").forEach(function (lb) {
    lb.tabIndex = 0;
    lb.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lb.querySelector("input").click(); } });
  });
  requestAnimationFrame(function () { nameIn.focus({ preventScroll: true }); });
  return { close: close };
}
