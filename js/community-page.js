/* Street Goose 034 — /comunidade. Feed público (posts aprovados) + upload
   com moderação (nasce 'pending', só aparece público quando 'approved'). */
import { escapeHtml } from "../src/lib/html.ts";

export function mountCommunityPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("community.title") + '</h1>' +
    '<div class="app-page-head-actions">' +
      '<button class="btn btn-primary" data-community-publish>' + t("community.publish") + "</button>" +
      '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    "</div></div>" +
    '<div class="app-page-body" data-community-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-community-body]");
  var lightboxIndex = -1;
  var currentPosts = [];

  async function renderFeed() {
    var mod = await import("../src/services/CommunityService.ts");
    var svc = mod.CommunityService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("community.empty") + "</h2></div>";
      return;
    }
    currentPosts = await svc.getApprovedFeed();
    if (!currentPosts.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("community.empty") + "</h2></div>";
      return;
    }
    bodyEl.innerHTML = '<div class="community-grid">' + currentPosts.map(function (p, i) {
      return (
        '<figure class="community-card" data-community-open="' + i + '">' +
          '<img src="' + escapeHtml(p.imageUrl) + '" alt="' + escapeHtml(p.caption) + '" loading="lazy">' +
          (p.caption ? "<figcaption>" + escapeHtml(p.caption) + "</figcaption>" : "") +
        "</figure>"
      );
    }).join("") + "</div>";
  }

  function openLightbox(i) {
    lightboxIndex = i;
    renderLightbox();
  }
  function renderLightbox() {
    var existing = document.querySelector("[data-community-lightbox]");
    if (existing) existing.remove();
    if (lightboxIndex < 0) return;
    var p = currentPosts[lightboxIndex];
    var el = document.createElement("div");
    el.className = "community-lightbox";
    el.setAttribute("data-community-lightbox", "");
    el.innerHTML =
      '<button class="popup-close" data-lightbox-close aria-label="' + t("common.close") + '">×</button>' +
      '<button class="community-lightbox-nav community-lightbox-prev" data-lightbox-prev aria-label="Anterior">‹</button>' +
      '<img src="' + escapeHtml(p.imageUrl) + '" alt="' + escapeHtml(p.caption) + '">' +
      '<button class="community-lightbox-nav community-lightbox-next" data-lightbox-next aria-label="Próxima">›</button>' +
      (p.caption ? '<p class="community-lightbox-caption">' + escapeHtml(p.caption) + "</p>" : "");
    document.body.appendChild(el);
    el.querySelector("[data-lightbox-close]").addEventListener("click", function () { lightboxIndex = -1; renderLightbox(); });
    el.querySelector("[data-lightbox-prev]").addEventListener("click", function () { lightboxIndex = (lightboxIndex - 1 + currentPosts.length) % currentPosts.length; renderLightbox(); });
    el.querySelector("[data-lightbox-next]").addEventListener("click", function () { lightboxIndex = (lightboxIndex + 1) % currentPosts.length; renderLightbox(); });
  }

  function onLightboxKeydown(e) {
    if (lightboxIndex < 0) return;
    if (e.key === "Escape") { lightboxIndex = -1; renderLightbox(); }
    else if (e.key === "ArrowLeft") { lightboxIndex = (lightboxIndex - 1 + currentPosts.length) % currentPosts.length; renderLightbox(); }
    else if (e.key === "ArrowRight") { lightboxIndex = (lightboxIndex + 1) % currentPosts.length; renderLightbox(); }
  }

  function openPublishForm() {
    var overlay = document.createElement("div");
    overlay.className = "community-publish-overlay";
    overlay.setAttribute("data-community-publish-overlay", "");
    overlay.innerHTML =
      '<div class="auth-modal-panel">' +
        '<button class="popup-close" data-publish-close>×</button>' +
        "<h2>" + t("community.publish") + "</h2>" +
        '<form class="auth-form" data-publish-form>' +
          '<label>Foto<input type="file" name="photo" accept="image/*" required></label>' +
          '<div class="community-publish-preview" data-publish-preview hidden><img alt=""></div>' +
          '<label>Legenda<textarea name="caption" rows="3" style="background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--input-text);padding:10px;font-family:inherit"></textarea></label>' +
          '<p class="auth-error" data-publish-error hidden></p>' +
          '<button class="btn btn-primary" type="submit" data-publish-submit>' + t("community.publish") + "</button>" +
        "</form>" +
      "</div>";
    document.body.appendChild(overlay);

    var fileInput = overlay.querySelector('[name="photo"]');
    var preview = overlay.querySelector("[data-publish-preview]");
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (!file) { preview.hidden = true; return; }
      var url = URL.createObjectURL(file);
      preview.querySelector("img").src = url;
      preview.hidden = false;
    });

    overlay.querySelector("[data-publish-close]").addEventListener("click", function () { overlay.remove(); });
    overlay.querySelector("[data-publish-form]").addEventListener("submit", async function (e) {
      e.preventDefault();
      var mod = await import("../src/services/CommunityService.ts");
      var svc = mod.CommunityService;
      var errorEl = overlay.querySelector("[data-publish-error]");
      errorEl.hidden = true;
      if (!svc.isConfigured()) { errorEl.textContent = t("auth.notConfigured"); errorEl.hidden = false; return; }
      var file = fileInput.files[0];
      if (!file) return;
      var caption = overlay.querySelector('[name="caption"]').value.trim();
      var submitBtn = overlay.querySelector("[data-publish-submit]");
      submitBtn.disabled = true; submitBtn.textContent = t("common.loading");
      var res = await svc.publish(file, caption, null, null);
      submitBtn.disabled = false; submitBtn.textContent = t("community.publish");
      if (!res.ok) { errorEl.textContent = res.message; errorEl.hidden = false; return; }
      overlay.remove();
      if (window.SG.toast) window.SG.toast(t("community.pending").toUpperCase());
    });
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  root.querySelector("[data-community-publish]").addEventListener("click", async function () {
    // upload de arquivo não sobrevive a um redirect de OAuth (File não é
    // serializável), então aqui só pedimos login — o usuário clica de novo
    // em "Publicar" depois, não reabrimos o formulário sozinhos
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    if (!session) { if (window.SG.auth) window.SG.auth.open(); return; }
    openPublishForm();
  });
  bodyEl.addEventListener("click", function (e) {
    var card = e.target.closest("[data-community-open]");
    if (card) openLightbox(Number(card.getAttribute("data-community-open")));
  });

  function onKeydown(e) { if (lightboxIndex < 0 && e.key === "Escape") onClose(); else onLightboxKeydown(e); }
  document.addEventListener("keydown", onKeydown);

  renderFeed();

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
    var lb = document.querySelector("[data-community-lightbox]");
    if (lb) lb.remove();
    var pub = document.querySelector("[data-community-publish-overlay]");
    if (pub) pub.remove();
  };
}
