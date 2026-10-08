/* Street Goose 034 — tema claro/escuro/sistema.
   O flash inicial já foi resolvido por um script síncrono no <head> (roda
   antes do CSS pintar); este módulo só assume o controle depois disso —
   troca via classe/atributo em <html>, nunca remonta DOM, então hero e
   vídeos cinematográficos não reiniciam ao trocar de tema. */
(function () {
  "use strict";

  var STORAGE_KEY = "sgTheme";
  var root = document.documentElement;
  var mq = matchMedia("(prefers-color-scheme: light)");

  function current() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return saved === "dark" || saved === "light" ? saved : "system";
  }

  function effective() {
    var mode = current();
    if (mode === "system") return mq.matches ? "light" : "dark";
    return mode;
  }

  function apply(mode) {
    if (mode === "dark" || mode === "light") {
      root.setAttribute("data-theme", mode);
    } else {
      root.removeAttribute("data-theme");
    }
    root.style.colorScheme = effective();
  }

  function set(mode) {
    try {
      if (mode === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {}
    apply(mode);
    document.dispatchEvent(new CustomEvent("sg:theme-change", { detail: { mode: mode, effective: effective() } }));
  }

  mq.addEventListener("change", function () {
    if (current() === "system") apply("system");
  });

  apply(current());

  window.SG.theme = { get: current, getEffective: effective, set: set };
})();

export {};
