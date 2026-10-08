/* Street Goose 034 — modal de autenticação + gate de ação pendente.
   window.SG.auth.requireAuth(action) é o gate: se AuthService não está
   configurado (sem credenciais Supabase), a ação roda direto — favoritar/
   carrinho continuam funcionando como hoje, sem exigir login que não existe
   ainda. Quando configurado, ação some sem login e volta sozinha depois do
   OAuth (sessionStorage sobrevive ao redirect, funções não). */
(function () {
  "use strict";

  var PENDING_KEY = "sgPendingAuthAction";
  var overlay = document.querySelector("[data-auth-modal]");
  var authSvc = null, i18nT = function (k) { return (window.SG.i18n && window.SG.i18n.t(k)) || k; };
  var mode = "signIn"; // "signIn" | "signUp"
  var currentSession = null;

  // logos oficiais inline (sem CDN externa, sem emoji) — silhueta preta da
  // Apple e o "G" multicolorido oficial do Google, cores/paths reais
  var APPLE_LOGO_SVG = '<svg class="oauth-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.365 1.43c0 1.14-.415 2.055-1.243 2.746-.885.744-1.925 1.171-2.878 1.093-.107-1.048.4-2.144 1.19-2.845.836-.727 2.008-1.202 2.93-1.24.001.082.001.164.001.246zm3.9 17.19c-.518 1.19-.766 1.72-1.43 2.774-.928 1.474-2.238 3.31-3.862 3.325-1.44.014-1.81-.943-3.762-.932-1.951.011-2.358.949-3.803.935-1.624-.015-2.862-1.673-3.79-3.148-2.6-4.106-2.873-8.93-1.27-11.5.06-.097-.03-.16-.03-.16C3.55 8.7 4.966 7.72 6.474 7.71c1.55-.01 2.523 1.043 3.804 1.043 1.24 0 1.996-1.045 3.784-1.045 1.318 0 2.716.72 3.71 1.965-3.264 1.79-2.734 6.457.493 7.947z"/></svg>';
  var GOOGLE_LOGO_SVG = '<svg class="oauth-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.55-5.17 3.55-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.25 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.87 12c0-.79.14-1.56.4-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.93.46 3.75 1.29 5.37l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/></svg>';

  async function loadAuthService() {
    if (!authSvc) authSvc = (await import("../src/services/AuthService.ts")).AuthService;
    return authSvc;
  }

  function renderHeaderAccount() {
    var btn = document.querySelector("[data-open-account]");
    var label = document.querySelector("[data-account-label]");
    var avatar = document.querySelector("[data-account-avatar]");
    var mobileBtn = document.querySelector(".mobile-menu-account-btn");
    var mobileLabel = document.querySelector("[data-account-label-mobile]");
    var mobileAvatar = document.querySelector("[data-account-avatar-mobile]");
    if (!btn || !label || !avatar) return;
    var GUEST_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.5-4.2 5-6 8-6s6.5 1.8 8 6"/></svg>';
    if (currentSession && currentSession.user) {
      var name = currentSession.user.user_metadata?.name || currentSession.user.email || "Conta";
      var initial = name.charAt(0).toUpperCase();
      var first = name.split(" ")[0];
      label.textContent = first;
      avatar.textContent = initial;
      btn.setAttribute("data-signed-in", "");
      if (mobileLabel) mobileLabel.textContent = first;
      if (mobileAvatar) mobileAvatar.textContent = initial;
      if (mobileBtn) mobileBtn.setAttribute("data-signed-in", "");
    } else {
      label.textContent = i18nT("nav.account.signedOut");
      avatar.innerHTML = GUEST_ICON;
      btn.removeAttribute("data-signed-in");
      if (mobileLabel) mobileLabel.textContent = i18nT("nav.account.signedOut");
      if (mobileAvatar) mobileAvatar.innerHTML = GUEST_ICON;
      if (mobileBtn) mobileBtn.removeAttribute("data-signed-in");
    }
  }

  function formHtml() {
    var isSignUp = mode === "signUp";
    return (
      '<div class="auth-modal-panel">' +
        '<button class="popup-close" type="button" data-auth-close aria-label="' + i18nT("common.close") + '">×</button>' +
        '<h2>' + i18nT(isSignUp ? "auth.title.signUp" : "auth.title.signIn") + "</h2>" +
        '<div class="auth-oauth-row">' +
          '<button class="btn btn-ghost auth-oauth-btn" type="button" data-oauth="apple">' + APPLE_LOGO_SVG + "<span>" + i18nT("auth.appleContinue") + "</span></button>" +
          '<button class="btn btn-ghost auth-oauth-btn" type="button" data-oauth="google">' + GOOGLE_LOGO_SVG + "<span>" + i18nT("auth.googleContinue") + "</span></button>" +
        "</div>" +
        '<p class="auth-divider">' + i18nT("auth.orEmail") + "</p>" +
        '<form class="auth-form" data-auth-form novalidate>' +
          (isSignUp ? '<label>' + i18nT("auth.name") + '<input type="text" name="name" required autocomplete="name"></label>' : "") +
          '<label>' + i18nT("auth.email") + '<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>' + i18nT("auth.password") + '<input type="password" name="password" required autocomplete="' + (isSignUp ? "new-password" : "current-password") + '" minlength="6"></label>' +
          (isSignUp ? '<label>' + i18nT("auth.confirmPassword") + '<input type="password" name="confirmPassword" required autocomplete="new-password" minlength="6"></label>' : "") +
          (isSignUp ? '<label class="auth-terms"><input type="checkbox" name="terms" required> <span>' + i18nT("auth.terms") + "</span></label>" : "") +
          '<p class="auth-error" data-auth-error hidden></p>' +
          '<button class="btn btn-primary auth-submit" type="submit" data-auth-submit>' + i18nT(isSignUp ? "auth.submitSignUp" : "auth.submitSignIn") + "</button>" +
        "</form>" +
        '<button class="text-link auth-switch" type="button" data-auth-switch>' + i18nT(isSignUp ? "auth.switchToSignIn" : "auth.switchToSignUp") + "</button>" +
        (!isSignUp ? '<button class="text-link auth-forgot" type="button" data-auth-forgot>' + i18nT("auth.forgotPassword") + "</button>" : "") +
      "</div>"
    );
  }

  function render() {
    overlay.innerHTML = formHtml();
    bindForm();
  }

  function showError(msg) {
    var el = overlay.querySelector("[data-auth-error]");
    el.textContent = msg;
    el.hidden = false;
  }

  function setLoading(isLoading) {
    var btn = overlay.querySelector("[data-auth-submit]");
    if (btn) { btn.disabled = isLoading; btn.textContent = isLoading ? i18nT("common.loading") : i18nT(mode === "signUp" ? "auth.submitSignUp" : "auth.submitSignIn"); }
  }

  function bindForm() {
    overlay.querySelector("[data-auth-close]").addEventListener("click", close);
    overlay.querySelector("[data-auth-switch]").addEventListener("click", function () {
      mode = mode === "signIn" ? "signUp" : "signIn";
      render();
    });
    var forgotBtn = overlay.querySelector("[data-auth-forgot]");
    if (forgotBtn) {
      forgotBtn.addEventListener("click", async function () {
        var email = overlay.querySelector('[name="email"]').value.trim();
        if (!email) { showError("Digite seu e-mail acima primeiro."); return; }
        var svc = await loadAuthService();
        var res = await svc.resetPassword(email);
        if (!res.ok) showError(res.message);
        else { if (window.SG.toast) window.SG.toast("LINK DE RECUPERAÇÃO ENVIADO, SE O E-MAIL EXISTIR"); }
      });
    }
    overlay.querySelectorAll("[data-oauth]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var svc = await loadAuthService();
        var res = await svc.signInWithOAuth(btn.getAttribute("data-oauth"));
        if (!res.ok) showError(res.message);
      });
    });
    overlay.querySelector("[data-auth-form]").addEventListener("submit", async function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var email = String(fd.get("email") || "").trim();
      var password = String(fd.get("password") || "");
      var name = String(fd.get("name") || "").trim();
      overlay.querySelector("[data-auth-error]").hidden = true;

      if (mode === "signUp" && fd.get("password") !== fd.get("confirmPassword")) {
        showError(i18nT("auth.confirmPassword") + " — não confere.");
        return;
      }
      if (mode === "signUp" && !fd.get("terms")) {
        showError(i18nT("auth.terms"));
        return;
      }

      setLoading(true);
      var svc = await loadAuthService();
      var res = mode === "signUp" ? await svc.signUpWithEmail(name, email, password) : await svc.signInWithEmail(email, password);
      setLoading(false);
      if (!res.ok) { showError(res.message); return; }
      close();
      await runPendingAction();
    });
  }

  function open() {
    mode = "signIn";
    overlay.hidden = false;
    document.body.classList.add("auth-modal-open");
    render();
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove("auth-modal-open");
    clearPendingAction();
  }

  function setPendingAction(action) {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(action)); } catch (e) {}
  }
  function clearPendingAction() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
  }
  function getPendingAction() {
    try { var raw = sessionStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  var ACTION_HANDLERS = {
    favorite: function (payload) { if (window.SG.wishlist) window.SG.wishlist.toggle(payload.productId); },
    addToCart: function (payload) { if (window.SG.cart) window.SG.cart.addWithFeedback(payload.productId); },
  };

  async function runPendingAction() {
    var action = getPendingAction();
    if (!action) return;
    clearPendingAction();
    var handler = ACTION_HANDLERS[action.type];
    if (handler) handler(action.payload || {});
    if (window.SG.toast) window.SG.toast("FEITO — AÇÃO CONCLUÍDA APÓS LOGIN");
  }

  async function requireAuth(action) {
    var svc = await loadAuthService();
    if (!svc.isConfigured()) {
      // sem backend configurado ainda: não há login real possível — a ação
      // roda direto, como sempre funcionou antes desta camada existir
      var handler = ACTION_HANDLERS[action.type];
      if (handler) handler(action.payload || {});
      return;
    }
    var session = await svc.getSession();
    if (session) {
      var handler2 = ACTION_HANDLERS[action.type];
      if (handler2) handler2(action.payload || {});
      return;
    }
    setPendingAction(action);
    open();
  }

  document.addEventListener("keydown", function (e) { if (!overlay.hidden && e.key === "Escape") close(); });
  document.addEventListener("click", function (e) {
    if (!overlay.hidden && e.target === overlay) close();
    if (e.target.closest("[data-open-account]")) {
      // se logado, o dropdown de conta trata o clique (ver account-menu.js);
      // se deslogado, abre direto o modal de login
      if (!currentSession) { e.preventDefault(); open(); }
    }
  });

  (async function init() {
    var svc = await loadAuthService();
    if (!svc.isConfigured()) { renderHeaderAccount(); return; }
    currentSession = await svc.getSession();
    renderHeaderAccount();
    if (currentSession) await runPendingAction();
    svc.onAuthStateChange(function (_event, session) {
      currentSession = session;
      renderHeaderAccount();
      if (session) runPendingAction();
    });
  })();

  window.SG.auth = { requireAuth: requireAuth, open: open, close: close, getSession: async function () { var svc = await loadAuthService(); return svc.getSession(); } };
})();

export {};
