/* Street Goose 034 — painel de Preferências (tema + idioma).
   Popover no desktop, bottom sheet no mobile (mesmo componente, o CSS troca
   o layout por media query). data-set-theme/data-set-lang são delegados
   globalmente no document, então os botões fixos do menu mobile (que não
   estão dentro do dropdown) também funcionam sem duplicar lógica. */
(function () {
  "use strict";

  var wrap = document.querySelector("[data-settings-menu-wrap]");
  var btn = document.querySelector("[data-open-settings]");
  var dropdown = document.querySelector("[data-settings-dropdown]");
  var backdrop = document.querySelector("[data-settings-backdrop]");
  if (!wrap || !btn || !dropdown) return;

  var THEME_OPTIONS = [
    { value: "dark", key: "theme.dark", icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>' },
    { value: "light", key: "theme.light", icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
    { value: "system", key: "theme.system", icon: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>' }
  ];
  var LANG_OPTIONS = [
    { value: "pt-BR", label: "PT", full: "Português" },
    { value: "en", label: "EN", full: "English" },
    { value: "es", label: "ES", full: "Español" }
  ];

  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  // corpo das preferências (tema + idioma), compartilhado entre o popover
  // do header e o menu lateral do mobile (js/mobile-account.js)
  function prefsBodyHtml() {
    var currentTheme = window.SG.theme.get();
    var currentLang = window.SG.i18n ? window.SG.i18n.get() : "pt-BR";
    var CHECK = '<svg class="pref-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';

    // cartões de tema com prévia em miniatura (fundo + linha de destaque + texto)
    var themeHtml = THEME_OPTIONS.map(function (opt, i) {
      var active = currentTheme === opt.value;
      var label = opt.value === "system" ? t("theme.systemShort") : t(opt.key);
      return (
        '<button class="pref-theme' + (active ? " is-active" : "") + '" data-set-theme="' + opt.value + '" aria-pressed="' + active + '" title="' + t(opt.key) + '" style="--i:' + i + '">' +
          '<span class="pref-theme-preview pref-theme-preview--' + opt.value + '" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<span class="pref-theme-label"><svg viewBox="0 0 24 24" aria-hidden="true">' + opt.icon + "</svg>" + label + "</span>" +
          (active ? CHECK : "") +
        "</button>"
      );
    }).join("");

    var langHtml = LANG_OPTIONS.map(function (opt, i) {
      var active = currentLang === opt.value;
      return (
        '<button class="pref-lang' + (active ? " is-active" : "") + '" data-set-lang="' + opt.value + '" aria-pressed="' + active + '" style="--i:' + (i + 3) + '">' +
          '<span class="pref-lang-code">' + opt.label + "</span><span class=\"pref-lang-name\">" + opt.full + "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<p class="pref-group-label">' + t("theme.label") + '</p><div class="pref-theme-grid">' + themeHtml + "</div>" +
      '<p class="pref-group-label">' + t("lang.label") + '</p><div class="pref-lang-seg" role="group" aria-label="' + t("lang.label") + '">' + langHtml + "</div>" +
      '<p class="pref-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>' + t("prefs.note") + "</p>"
    );
  }
  window.SG.prefsPanel = { html: prefsBodyHtml };

  function render() {
    dropdown.innerHTML =
      '<div class="pref-panel-head">' +
        '<span class="pref-panel-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg></span>' +
        "<div><p class=\"pref-panel-title\">" + t("prefs.title") + "</p><p class=\"pref-panel-sub\">" + t("prefs.sub") + "</p></div>" +
        '<button class="pref-panel-close" type="button" data-pref-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      "</div>" +
      prefsBodyHtml();

    dropdown.querySelector("[data-pref-close]").addEventListener("click", function () { setOpen(false); });
  }

  function syncFixedControls() {
    var currentTheme = window.SG.theme.get();
    var currentLang = window.SG.i18n ? window.SG.i18n.get() : "pt-BR";
    document.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-set-theme") === currentTheme);
    });
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-set-lang") === currentLang);
    });
  }

  var open = false;
  function setOpen(v, keepFocus) {
    if (v === open) return;
    open = v;
    if (v) document.dispatchEvent(new CustomEvent("sg:menu-open", { detail: "settings" }));
    dropdown.hidden = !v;
    if (backdrop) backdrop.hidden = !v;
    btn.setAttribute("aria-expanded", String(v));
    document.body.classList.toggle("pref-panel-open", v);
    if (v) render();
    else if (!keepFocus) btn.focus();
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!open);
  });
  if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });

  document.addEventListener("click", function (e) {
    var themeBtn = e.target.closest("[data-set-theme]");
    if (themeBtn) { window.SG.theme.set(themeBtn.getAttribute("data-set-theme")); if (open) render(); syncFixedControls(); document.dispatchEvent(new CustomEvent("sg:prefs-change")); return; }
    var langBtn = e.target.closest("[data-set-lang]");
    if (langBtn && window.SG.i18n) { window.SG.i18n.set(langBtn.getAttribute("data-set-lang")); if (open) render(); syncFixedControls(); document.dispatchEvent(new CustomEvent("sg:prefs-change")); return; }
    if (open && !wrap.contains(e.target)) setOpen(false, true);
  });
  document.addEventListener("keydown", function (e) {
    if (open && e.key === "Escape") setOpen(false);
  });
  document.addEventListener("sg:lang-change", function () { if (open) render(); });
  // só um menu do topo aberto por vez (o da conta avisa quando abre)
  document.addEventListener("sg:menu-open", function (e) {
    if (open && e.detail !== "settings") setOpen(false, true);
  });

  syncFixedControls();
})();

export {};
