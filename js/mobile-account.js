/* Street Goose 034 — conta e preferências no menu lateral do mobile.
   Usa exatamente os mesmos componentes do desktop: window.SG.accountPanel
   (js/account-menu.js) e window.SG.prefsPanel (js/settings-menu.js), então
   estrutura, estética e comportamento são idênticos nos dois. Repinta a
   cada abertura do menu (sessão/XP/admin sempre atuais). */
(function () {
  "use strict";

  var menu = document.querySelector("[data-mobile-menu]");
  if (!menu) return;
  var acctBox = menu.querySelector("[data-mobile-account]");
  var prefsBox = menu.querySelector("[data-mobile-prefs]");

  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  function esc(v) { return window.SG.esc ? window.SG.esc(v) : String(v == null ? "" : v); }
  function isOpen() { return menu.classList.contains("is-open"); }
  function closeMenu() {
    var c = menu.querySelector(".menu-close");
    if (c && isOpen()) c.click();
  }

  var GUEST_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.5-4.2 5-6 8-6s6.5 1.8 8 6"/></svg>';
  var GEAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>';

  var paintSeq = 0;
  async function paintAccount() {
    if (!acctBox) return;
    var seq = ++paintSeq;
    var session = null;
    try { session = window.SG.auth ? await window.SG.auth.getSession() : null; } catch (e) { session = null; }
    if (seq !== paintSeq) return; // outra pintura começou depois desta
    if (session && session.user && window.SG.accountPanel) {
      acctBox.innerHTML = '<div class="acct-panel" role="menu" aria-label="' + esc(t("nav.account.myAccount")) + '"></div>';
      window.SG.accountPanel.fill(acctBox.firstChild, session, isOpen);
      return;
    }
    acctBox.innerHTML =
      '<div class="acct-panel acct-guest">' +
        '<div class="acct-head">' +
          '<span class="acct-avatar acct-avatar--guest">' + GUEST_ICON + "</span>" +
          '<span class="acct-id"><span class="acct-name">' + esc(t("nav.account.guestTitle")) + "</span>" +
          '<span class="acct-email">' + esc(t("nav.account.guestSub")) + "</span></span>" +
        "</div>" +
        '<button class="acct-guest-cta" type="button" data-mobile-login>' + esc(t("nav.account.guestCta")) + "</button>" +
      "</div>";
  }

  function paintPrefs() {
    if (!prefsBox || !window.SG.prefsPanel) return;
    prefsBox.innerHTML =
      '<div class="acct-panel mobile-prefs-panel">' +
        '<div class="pref-panel-head">' +
          '<span class="pref-panel-icon" aria-hidden="true">' + GEAR_ICON + "</span>" +
          '<div><p class="pref-panel-title">' + esc(t("prefs.title")) + '</p><p class="pref-panel-sub">' + esc(t("prefs.sub")) + "</p></div>" +
        "</div>" +
        window.SG.prefsPanel.html() +
      "</div>";
  }

  if (acctBox) {
    acctBox.addEventListener("click", async function (e) {
      if (e.target.closest("[data-account-signout]")) {
        await window.SG.accountPanel.signOut();
        paintAccount();
        return;
      }
      if (e.target.closest("[data-mobile-login]")) {
        closeMenu();
        if (window.SG.auth) window.SG.auth.open();
        return;
      }
      // links do painel (conta, pedidos, favoritos...) navegam e fecham o menu
      if (e.target.closest("a[href]")) closeMenu();
    });
  }

  // repinta ao abrir (classe is-open) — sessão, XP e admin sempre atuais
  var wasOpen = false;
  new MutationObserver(function () {
    var nowOpen = isOpen();
    if (nowOpen && !wasOpen) { paintAccount(); paintPrefs(); }
    wasOpen = nowOpen;
  }).observe(menu, { attributes: true, attributeFilter: ["class"] });

  document.addEventListener("sg:prefs-change", function () { if (isOpen()) paintPrefs(); });
  document.addEventListener("sg:lang-change", function () { if (isOpen()) { paintAccount(); paintPrefs(); } });

  paintPrefs();
})();

export {};
