/* Street Goose 034 — dropdown de conta (visível só quando logado; deslogado
   o clique no botão abre o modal de login direto, tratado em auth-modal.js). */
(function () {
  "use strict";

  var wrap = document.querySelector("[data-account-menu-wrap]");
  var btn = document.querySelector("[data-open-account]");
  var dropdown = document.querySelector("[data-account-dropdown]");
  if (!wrap || !btn || !dropdown) return;

  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  function render() {
    dropdown.innerHTML =
      '<a class="account-dropdown-item" href="/conta">' + t("nav.account.myAccount") + "</a>" +
      '<a class="account-dropdown-item" href="/conta/pedidos">' + t("nav.account.orders") + "</a>" +
      '<a class="account-dropdown-item" href="/favoritos">' + t("nav.account.favorites") + "</a>" +
      '<a class="account-dropdown-item" href="/ranking">' + t("nav.account.level") + "</a>" +
      '<a class="account-dropdown-item" href="/recompensas">' + t("nav.account.rewards") + "</a>" +
      '<div class="account-dropdown-divider"></div>' +
      '<button class="account-dropdown-item" type="button" data-account-signout>' + t("nav.account.signOut") + "</button>";
  }

  var open = false;
  function setOpen(v) {
    open = v;
    dropdown.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
    if (v) render();
  }

  btn.addEventListener("click", function (e) {
    if (!btn.hasAttribute("data-signed-in")) return; // deslogado: auth-modal.js já tratou o clique
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  });

  dropdown.addEventListener("click", async function (e) {
    if (e.target.closest("[data-account-signout]")) {
      var mod = await import("../src/services/AuthService.ts");
      await mod.AuthService.signOut();
      setOpen(false);
      if (window.SG.toast) window.SG.toast("SESSÃO ENCERRADA");
    }
  });

  document.addEventListener("click", function (e) {
    if (open && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (open && e.key === "Escape") setOpen(false);
  });
})();

export {};
