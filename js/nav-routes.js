/* Street Goose 034 — conecta botões de navegação global às rotas de app e
   intercepta cliques em <a href="/rota"> internas para navegar via SPA
   (router.js) em vez de recarregar a página inteira do zero. */
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-search]")) {
      e.preventDefault();
      if (window.SG_ROUTER) window.SG_ROUTER.navigate("/busca");
      return;
    }

    var link = e.target.closest("a[href]");
    if (!link || link.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = link.getAttribute("href");
    // só rotas internas de app (path absoluto começando com "/" e sem "//"
    // externo); âncoras "#..." já são tratadas por main.js
    if (!href || href.charAt(0) !== "/" || href.charAt(1) === "/") return;
    if (!window.SG_ROUTER) return;
    e.preventDefault();
    window.SG_ROUTER.navigate(href);
  });
})();

export {};
