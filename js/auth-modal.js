import { announceAuthRequest } from "./auth-send-notice.js";
import "./auth-modal.css";
/* Street Goose 034 — modal de autenticação + gate de ação pendente.
   window.SG.auth.requireAuth(action) é o gate: se AuthService não está
   configurado (sem credenciais Supabase), a ação roda direto — favoritar/
   carrinho continuam funcionando como hoje, sem exigir login que não existe
   ainda. Quando configurado, ação some sem login e volta sozinha depois do
   OAuth (sessionStorage sobrevive ao redirect, funções não). */
import { updateHeaderLevelSession } from './header-level-badge.js';

(function () {
  "use strict";

  var PENDING_KEY = "sgPendingAuthAction";
  var overlay = document.querySelector("[data-auth-modal]");
  var authSvc = null, i18nT = function (k) { return (window.SG.i18n && window.SG.i18n.t(k)) || k; };
  var mode = "signIn"; // "signIn" | "signUp"
  var currentSession = null;
  var codeEmail = "", resendAfter = 0, codeRecovery = false;

  // logos oficiais inline (sem CDN externa, sem emoji) — silhueta preta da
  // Apple e o "G" multicolorido oficial do Google, cores/paths reais
  var APPLE_LOGO_SVG = '<svg class="oauth-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.365 1.43c0 1.14-.415 2.055-1.243 2.746-.885.744-1.925 1.171-2.878 1.093-.107-1.048.4-2.144 1.19-2.845.836-.727 2.008-1.202 2.93-1.24.001.082.001.164.001.246zm3.9 17.19c-.518 1.19-.766 1.72-1.43 2.774-.928 1.474-2.238 3.31-3.862 3.325-1.44.014-1.81-.943-3.762-.932-1.951.011-2.358.949-3.803.935-1.624-.015-2.862-1.673-3.79-3.148-2.6-4.106-2.873-8.93-1.27-11.5.06-.097-.03-.16-.03-.16C3.55 8.7 4.966 7.72 6.474 7.71c1.55-.01 2.523 1.043 3.804 1.043 1.24 0 1.996-1.045 3.784-1.045 1.318 0 2.716.72 3.71 1.965-3.264 1.79-2.734 6.457.493 7.947z"/></svg>';
  var GOOGLE_LOGO_SVG = '<svg class="oauth-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.55-5.17 3.55-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.25 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.87 12c0-.79.14-1.56.4-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.93.46 3.75 1.29 5.37l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/></svg>';

  async function loadAuthService() {
    if (!authSvc) authSvc = (await import("../src/services/AuthService.ts")).AuthService;
    return authSvc;
  }

  function renderHeaderAccount() {
    updateHeaderLevelSession(currentSession);
    var btn = document.querySelector("[data-open-account]");
    var label = document.querySelector("[data-account-label]");
    var avatar = document.querySelector("[data-account-avatar]");
    var mobileBtn = document.querySelector(".mobile-menu-account-btn");
    var mobileLabel = document.querySelector("[data-account-label-mobile]");
    var mobileAvatar = document.querySelector("[data-account-avatar-mobile]");
    if (!btn || !label || !avatar) return;
    var GUEST_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.5-4.2 5-6 8-6s6.5 1.8 8 6"/></svg>';
    if (currentSession && currentSession.user) {
      var meta = currentSession.user.user_metadata || {};
      var name = meta.name || currentSession.user.email || "Conta";
      var initial = name.charAt(0).toUpperCase();
      var first = name.split(" ")[0];
      // foto escolhida no perfil (sg_avatar_url; "none" = tirou de propósito),
      // senão a do login social, senão a inicial
      var photo = meta.sg_avatar_url === "none" ? null
        : [meta.sg_avatar_url, meta.avatar_url, meta.picture].filter(function (u) { return typeof u === "string" && /^https:\/\//.test(u); })[0] || null;
      label.textContent = first;
      if (photo) {
        avatar.innerHTML = '<img src="' + window.SG.esc(photo) + '" alt="" referrerpolicy="no-referrer">';
        avatar.setAttribute("data-has-photo", "");
      } else { avatar.textContent = initial; avatar.removeAttribute("data-has-photo"); }
      btn.setAttribute("data-signed-in", "");
      if (mobileLabel) mobileLabel.textContent = first;
      if (mobileAvatar) {
        if (photo) { mobileAvatar.innerHTML = '<img src="' + window.SG.esc(photo) + '" alt="" referrerpolicy="no-referrer">'; mobileAvatar.setAttribute("data-has-photo", ""); }
        else { mobileAvatar.textContent = initial; mobileAvatar.removeAttribute("data-has-photo"); }
      }
      if (mobileBtn) mobileBtn.setAttribute("data-signed-in", "");
    } else {
      label.textContent = i18nT("nav.account.signedOut");
      avatar.innerHTML = GUEST_ICON;
      avatar.removeAttribute("data-has-photo");
      btn.removeAttribute("data-signed-in");
      if (mobileLabel) mobileLabel.textContent = i18nT("nav.account.signedOut");
      if (mobileAvatar) { mobileAvatar.innerHTML = GUEST_ICON; mobileAvatar.removeAttribute("data-has-photo"); }
      if (mobileBtn) mobileBtn.removeAttribute("data-signed-in");
    }
  }

  function formHtml() {
    if (mode === "newPassword") return '<div class="auth-modal-panel"><button class="popup-close" type="button" data-auth-close aria-label="Fechar">×</button><h2>Nova senha</h2><p>Seu acesso foi confirmado. Escolha uma senha com pelo menos 8 caracteres, com letras e números.</p><form class="auth-form" data-new-password><label>Nova senha<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>Confirmar senha<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label><p class="auth-error" data-auth-error role="status" hidden></p><button class="btn btn-primary" type="submit">Salvar nova senha</button></form></div>';

    if (mode === "emailCode") return '<div class="auth-modal-panel"><button class="popup-close" type="button" data-auth-close aria-label="Fechar">×</button><h2>' + (codeRecovery ? 'Recuperar senha' : 'Entrar por e-mail') + '</h2><p>' + (codeRecovery ? 'Confirme o código recebido no seu e-mail para escolher uma nova senha.' : 'Já tem conta? Receba um código por e-mail. No primeiro acesso, crie sua conta.') + '</p><form class="auth-form" data-code-form><label>E-mail<input name="email" type="email" required autocomplete="email" value="' + window.SG.esc(codeEmail) + '"></label><label>Código<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" minlength="6" maxlength="8"></label><div data-auth-captcha></div><p class="auth-error" data-auth-error role="status" hidden></p><button class="btn btn-primary" type="button" data-send-code>Enviar código</button><button class="btn btn-primary" type="submit">Confirmar código</button></form><button class="text-link" data-code-signup type="button">Criar conta</button><button class="text-link" data-code-back type="button">Voltar ao login</button></div>';
    var isSignUp = mode === "signUp";
    return (
      '<div class="auth-modal-panel">' +
        '<button class="popup-close" type="button" data-auth-close aria-label="' + i18nT("common.close") + '">×</button>' +
        '<h2>' + i18nT(isSignUp ? "auth.title.signUp" : "auth.title.signIn") + "</h2>" +
        '<p class="auth-entry-note">Escolha como entrar. Depois, personalize sua ficha e seus avisos.</p>' +
        '<div class="auth-oauth-row">' +
          '<button class="btn btn-ghost auth-oauth-btn" type="button" data-oauth="apple">' + APPLE_LOGO_SVG + "<span>" + i18nT("auth.appleContinue") + "</span></button>" +
          '<button class="btn btn-ghost auth-oauth-btn" type="button" data-oauth="google">' + GOOGLE_LOGO_SVG + "<span>" + i18nT("auth.googleContinue") + "</span></button>" +
        "</div>" +
        '<p class="auth-divider">' + i18nT("auth.orEmail") + "</p>" +
        '<form class="auth-form" data-auth-form novalidate>' +
          (isSignUp ? '<label>' + i18nT("auth.name") + '<input type="text" name="name" required autocomplete="name"></label>' : "") +
          '<label>' + i18nT("auth.email") + '<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>' + i18nT("auth.password") + '<input type="password" name="password" required autocomplete="' + (isSignUp ? "new-password" : "current-password") + '" minlength="' + (isSignUp ? 8 : 6) + '"></label>' +
          (isSignUp ? '<label>' + i18nT("auth.confirmPassword") + '<input type="password" name="confirmPassword" required autocomplete="new-password" minlength="8"></label>' : "") +
          (isSignUp ? '<label class="auth-terms"><input type="checkbox" name="terms" required> <span>' + termsWithLinks(i18nT("auth.terms")) + "</span></label>" : "") +
          '<div class="auth-captcha" data-auth-captcha></div>' +
          '<p class="auth-error" data-auth-error hidden></p>' +
          '<button class="btn btn-primary auth-submit" type="submit" data-auth-submit>' + i18nT(isSignUp ? "auth.submitSignUp" : "auth.submitSignIn") + "</button>" +
        "</form>" +
        '<button class="text-link auth-switch" type="button" data-auth-switch>' + i18nT(isSignUp ? "auth.switchToSignIn" : "auth.switchToSignUp") + "</button>" +
        (!isSignUp ? '<button class="text-link auth-forgot" type="button" data-auth-forgot>' + i18nT("auth.forgotPassword") + "</button>" : "") +
      '<button class="text-link" type="button" data-resend-confirmation>Reenviar confirmação de e-mail</button>' +
      (!isSignUp ? '<button class="text-link auth-switch" type="button" data-email-code>Entrar com código por e-mail</button>' : "") +
      "</div>"
    );
  }

  var captcha = null, captchaGeneration = 0, captchaState = "loading";
  async function mountCaptchaWidget() {
    var generation = ++captchaGeneration;
    if (captcha) { captcha.destroy(); captcha = null; }
    var box = overlay.querySelector("[data-auth-captcha]");
    captchaState = box ? "loading" : "disabled";
    if (!box) return;
    try {
      var mod = await import("../src/lib/captcha.ts");
      if (generation !== captchaGeneration || !box.isConnected) return;
      var handle = await mod.mountCaptcha(box);
      if (generation !== captchaGeneration || !box.isConnected) { if (handle) handle.destroy(); return; }
      captcha = handle; captchaState = handle ? "ready" : "disabled";
    } catch (e) {
      if (generation !== captchaGeneration) return;
      captchaState = "failed";
      showError("A proteção não carregou. Feche e abra esta tela para tentar novamente.");
    }
  }
  function captchaToken() {
    return captcha ? captcha.getToken() : null;
  }
  function needsCaptcha() {
    if (captchaState === "loading" || captchaState === "failed") {
      showError(captchaState === "loading" ? "Aguarde a proteção carregar antes de continuar." : "A proteção não carregou. Feche e abra esta tela para tentar novamente."); return true;
    }
    if (!captcha) return false;
    if (captcha.getToken()) return false;
    showError("Confirma que você não é robô antes de continuar.");
    return true;
  }

  function render() {
    overlay.innerHTML = formHtml();
    if (mode === "emailCode") bindCodeForm(); else if (mode === "newPassword") bindNewPassword(); else bindForm();
    mountCaptchaWidget();
  }

  // "termos" / "política de privacidade" in any language open the documents
  // in a new tab, so the half-filled sign-up form is never lost.
  function termsWithLinks(text) {
    var link = function (href) { return function (word) { return '<a href="' + href + '" target="_blank" rel="noopener">' + word + "</a>"; }; };
    return window.SG.esc(text)
      .replace(/(termos|terms|términos)/i, link("/termos"))
      .replace(/(política de privacidade|privacy policy|política de privacidad)/i, link("/privacidade"));
  }

  function showError(msg, success) {
    var el = overlay.querySelector("[data-auth-error]");
    el.textContent = msg;
    el.classList.toggle("auth-status-success", Boolean(success));
    el.hidden = false;
  }

  function setLoading(isLoading) {
    var btn = overlay.querySelector("[data-auth-submit]");
    if (btn) { btn.disabled = isLoading; btn.textContent = isLoading ? i18nT("common.loading") : i18nT(mode === "signUp" ? "auth.submitSignUp" : "auth.submitSignIn"); }
  }

  function validEmail(input) {
    input.value = input.value.trim();
    if (!input.value || !input.validity.valid) { showError("Confira o e-mail completo, incluindo @ e o domínio. Exemplo: nome@gmail.com."); input.focus(); return false; }
    return true;
  }
  function bindNewPassword() {
    overlay.querySelector("[data-auth-close]").addEventListener("click", close);
    var form = overlay.querySelector("[data-new-password]");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.password.value !== form.elements.confirm.value) { showError("As senhas não conferem."); return; }
      var btn = form.querySelector('[type="submit"]'); if (btn.disabled) return; btn.disabled = true;
      try {
        var svc = await loadAuthService(); var result = await svc.updatePassword(form.elements.password.value);
        if (!result.ok) { showError(result.message); return; }
        form.reset(); close(); if (window.SG.toast) window.SG.toast("SENHA ATUALIZADA");
      } catch (e) { showError("Não foi possível salvar agora. Tente novamente."); }
      finally { btn.disabled = false; }
    });
  }
  function bindCodeForm() {
    overlay.querySelector("[data-auth-close]").addEventListener("click", close);
    overlay.querySelector("[data-code-back]").addEventListener("click", function () { codeRecovery = false; mode = "signIn"; render(); });
    overlay.querySelector("[data-code-signup]").addEventListener("click", function () {
      var email = overlay.querySelector('[name="email"]').value.trim();
      codeRecovery = false; mode = "signUp"; render();
      overlay.querySelector('[name="email"]').value = email;
    });
    var form = overlay.querySelector("[data-code-form]");
    var send = overlay.querySelector("[data-send-code]");
    send.addEventListener("click", async function () {
      if (send.disabled) return;
      var input = form.elements.email;
      if (!validEmail(input)) return;
      if (Date.now() < resendAfter) { showError("Aguarde " + Math.ceil((resendAfter - Date.now()) / 1000) + " segundos para reenviar."); return; }
      var captchaBox = form.querySelector("[data-auth-captcha]"); if (captchaBox) captchaBox.hidden = false;
      if (needsCaptcha()) return;
      send.disabled = true;
      try {
        var svc = await loadAuthService();
        var email = input.value.trim();
        var res = await svc.sendEmailCode(email, captchaToken());
        if (!res.ok) { showError(res.message); return; }
        codeEmail = email; resendAfter = Date.now() + 60000;
        void announceAuthRequest("Pedido de código aceito. Confira seu e-mail, inclusive o spam. A entrega ainda não foi confirmada.");
        showError("Pedido de código aceito. Confira sua caixa de entrada e o spam. Para confirmar o código, não é preciso repetir a proteção.", true);
        var box = form.querySelector("[data-auth-captcha]"); if (box) box.hidden = true;
        form.elements.code.focus();
      } catch (err) { showError("Não foi possível enviar agora. Tente novamente."); }
      finally { send.disabled = false; if (captcha) captcha.reset(); }
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var token = form.elements.code.value.trim();
      if (!validEmail(form.elements.email)) return;
      if (!/^[0-9]{6,8}$/.test(token)) { showError("Digite o código recebido por e-mail."); return; }
      if (form.elements.email.value.trim() !== codeEmail) { showError("Solicite um código para este e-mail primeiro."); return; }
      var btn = form.querySelector('[type="submit"]'); if (btn.disabled) return; btn.disabled = true;
      try {
        var svc = await loadAuthService(); var res = await svc.verifyEmailCode(codeEmail, token);
        if (!res.ok) { showError(res.message); return; }
        if (codeRecovery) { mode = "newPassword"; render(); return; }
        await runPendingAction(); close();
      } catch (err) { showError("Não foi possível confirmar agora. Tente novamente."); }
      finally { btn.disabled = false; }
    });
  }

  function bindForm() {
    overlay.querySelector("[data-auth-close]").addEventListener("click", close);
    overlay.querySelector("[data-auth-switch]").addEventListener("click", function () {
      mode = mode === "signIn" ? "signUp" : "signIn";
      render();
    });
    var codeBtn = overlay.querySelector("[data-email-code]");
    if (codeBtn) codeBtn.addEventListener("click", function () { codeRecovery = false; mode = "emailCode"; render(); });
    var confirmationBtn = overlay.querySelector("[data-resend-confirmation]");
    confirmationBtn.addEventListener("click", async function () {
      var input = overlay.querySelector('[name="email"]');
      if (!validEmail(input) || needsCaptcha()) return;
      confirmationBtn.disabled = true;
      try {
        var svc = await loadAuthService();
        var result = await svc.resendConfirmation(input.value.trim(), captchaToken());
        showError(result.ok ? "Se houver uma confirmação pendente, confira o novo e-mail e use o link mais recente." : result.message, result.ok);
        if (result.ok) void announceAuthRequest("Pedido de confirmação aceito. Se houver cadastro pendente, confira seu e-mail. A entrega ainda não foi confirmada.");
      } catch (e) { showError("Não foi possível reenviar agora. Tente novamente."); }
      finally { confirmationBtn.disabled = false; if (captcha) captcha.reset(); }
    });
    var forgotBtn = overlay.querySelector("[data-auth-forgot]");
    if (forgotBtn) {
      forgotBtn.addEventListener("click", function () {
        codeEmail = overlay.querySelector('[name="email"]').value.trim();
        codeRecovery = true; mode = "emailCode"; render();
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
      if (overlay.querySelector("[data-auth-submit]").disabled) return;
      if (!validEmail(e.target.elements.email)) return;
      var fd = new FormData(e.target);
      var email = String(fd.get("email") || "").trim();
      var password = String(fd.get("password") || "");
      var name = String(fd.get("name") || "").trim();
      overlay.querySelector("[data-auth-error]").hidden = true;

      if (mode === "signUp" && password.length < 8) {
        showError("A senha precisa de pelo menos 8 caracteres.");
        return;
      }
      if (mode === "signUp" && fd.get("password") !== fd.get("confirmPassword")) {
        showError(i18nT("auth.confirmPassword") + ". não confere.");
        return;
      }
      if (mode === "signUp" && !fd.get("terms")) {
        showError(i18nT("auth.terms"));
        return;
      }

      if (needsCaptcha()) return;
      setLoading(true);
      try {
        var svc = await loadAuthService();
        var token = captchaToken();
        var res = mode === "signUp" ? await svc.signUpWithEmail(name, email, password, token) : await svc.signInWithEmail(email, password, token);
        if (!res.ok) { showError(res.message); return; }
        if (res.confirmationRequired) { showError("Confira seu e-mail para confirmar sua conta antes de entrar.", true); void announceAuthRequest("Pedido de cadastro aceito. Confira seu e-mail para confirmar a conta. A entrega ainda não foi confirmada."); return; }
        await runPendingAction(); close();
      } catch (e) { showError("Não foi possível conectar agora. Tente novamente."); }
      finally { setLoading(false); if (captcha) captcha.reset(); }

    });
  }

  function open() {
    codeRecovery = false; mode = "signIn";
    overlay.hidden = false;
    document.body.classList.add("auth-modal-open");
    render();
  }
  function close() {
    ++captchaGeneration;
    if (captcha) { captcha.destroy(); captcha = null; }
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

  // a ação pendente roda logo no boot (sessão já existe após o OAuth), antes
  // de cart.js/wishlist.js carregarem — esperar o módulo em vez de descartar
  // a ação em silêncio (o toast dizia "FEITO" e o item não entrava)
  function whenReady(name, eventName) {
    if (window.SG[name]) return Promise.resolve(window.SG[name]);
    return new Promise(function (resolve) {
      document.addEventListener(eventName, function () { resolve(window.SG[name]); }, { once: true });
    });
  }

  var ACTION_HANDLERS = {
    favorite: function (payload) { return whenReady("wishlist", "sg:wishlist-change").then(function (w) { w.toggle(payload.productId); }); },
    addToCart: function (payload) { return whenReady("cart", "sg:cart-change").then(function (c) { c.addWithFeedback(payload.productId); }); },
  };

  async function runPendingAction() {
    var action = getPendingAction();
    if (!action) return;
    clearPendingAction();
    var handler = ACTION_HANDLERS[action.type];
    if (!handler) return;
    await handler(action.payload || {});
    if (window.SG.toast) window.SG.toast("FEITO. AÇÃO CONCLUÍDA APÓS LOGIN");
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
    if (currentSession) { await runPendingAction(); setTimeout(function () { import("./customer-onboarding.js").then(function(m){return m.offerCustomerOnboarding(currentSession);}).catch(function(){}); }, 0); }
    svc.onAuthStateChange(function (_event, session) {
      currentSession = session;
      if (!session) setTimeout(function(){import("../src/services/NotificationRealtime.ts").then(function(m){return m.watchCustomerNotifications(null);}).catch(function(){});},0);
      renderHeaderAccount();
      if (session) { runPendingAction(); if (_event === "SIGNED_IN" && !codeRecovery) setTimeout(function () { import("./customer-onboarding.js").then(function(m){return m.offerCustomerOnboarding(session);}).catch(function(){}); }, 0); }
    });
  })();

  window.SG.auth = { requireAuth: requireAuth, open: open, close: close, getSession: async function () { var svc = await loadAuthService(); return svc.getSession(); } };
})();

export {};
