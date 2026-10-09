/* Street Goose 034 — detalhes do header de vidro: pílula que desliza sob o
   link em hover/foco, ponto de seção atual (scroll-spy), cor da barra que
   acompanha a seção sob ela e linha de progresso. Só enfeite: sem este
   módulo o nav continua funcionando igual (laranja padrão). */
(function () {
  "use strict";

  var nav = document.querySelector(".desktop-nav");
  if (!nav) return;

  var glider = document.createElement("span");
  glider.className = "nav-glider";
  glider.setAttribute("aria-hidden", "true");
  nav.insertBefore(glider, nav.firstChild);

  function moveTo(link, instant) {
    if (instant) glider.style.transition = "none";
    glider.style.setProperty("--gx", link.offsetLeft + "px");
    glider.style.setProperty("--gw", link.offsetWidth + "px");
    if (instant) { void glider.offsetWidth; glider.style.transition = ""; }
  }
  function show(e) {
    var link = e.target.closest && e.target.closest("a");
    if (!link || !nav.contains(link)) return;
    // primeira entrada: posiciona sem animar (não "voa" da esquerda)
    moveTo(link, !nav.classList.contains("is-gliding"));
    nav.classList.add("is-gliding");
  }
  nav.addEventListener("mouseover", show);
  nav.addEventListener("focusin", show);
  nav.addEventListener("mouseleave", function () { nav.classList.remove("is-gliding"); });
  nav.addEventListener("focusout", function (e) {
    if (!nav.contains(e.relatedTarget)) nav.classList.remove("is-gliding");
  });

  // ---------- cor da barra acompanha a seção sob ela ----------
  // Lê a cor que a própria seção já define inline (hero: --accent do slide
  // atual; filme: --accent; universo: --universe-bg-a do produto em foco;
  // categorias: --portal-accent). data-hdr-tint="#hex" força uma cor.
  // Sem nada definido, volta para o laranja da marca.
  var header = document.querySelector("[data-header]");
  var DEFAULT_TINT = "#f06423";
  var TINT_PROPS = ["--universe-bg-a", "--portal-accent", "--accent"];
  var currentTint = "";
  function tintAt(el) {
    for (var node = el; node && node !== document.body && node.nodeType === 1; node = node.parentElement) {
      if (header.contains(node)) return null;
      var forced = node.getAttribute("data-hdr-tint");
      if (forced) return forced;
      for (var i = 0; i < TINT_PROPS.length; i++) {
        var v = node.style && node.style.getPropertyValue(TINT_PROPS[i]);
        if (v && v.trim()) return v.trim();
      }
    }
    return DEFAULT_TINT;
  }
  function updateTint() {
    if (!header) return;
    var r = header.getBoundingClientRect();
    var y = Math.min(window.innerHeight - 1, r.bottom + 10);
    var stack = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, y) : [];
    var tint = null;
    for (var i = 0; i < stack.length && !tint; i++) tint = tintAt(stack[i]);
    tint = tint || DEFAULT_TINT;
    if (tint !== currentTint) {
      currentTint = tint;
      header.style.setProperty("--hdr-tint", tint);
    }
  }
  // progresso da página como linha fina dentro da pílula
  function updateProgress() {
    if (!header) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    header.style.setProperty("--hdr-progress", pct.toFixed(4));
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; updateTint(); updateProgress(); });
  }
  if (header) {
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    // slides do hero, universo de produtos e overlays trocam de cor sem
    // rolagem: confere de leve a cada 500ms com a aba visível
    setInterval(function () { if (!document.hidden) { updateTint(); updateProgress(); } }, 500);
    updateTint();
    updateProgress();
  }

  // seção atual: a primeira âncora de cada id recebe o ponto quando a seção
  // cruza o meio da tela (no hero, nenhuma fica marcada)
  if (!("IntersectionObserver" in window)) return;
  var linkById = {};
  Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
    var id = a.getAttribute("href").slice(1);
    if (id && !linkById[id]) linkById[id] = a;
  });
  var visible = {};
  function paint() {
    var current = null;
    Object.keys(linkById).forEach(function (id) { if (visible[id]) current = current || id; });
    Object.keys(linkById).forEach(function (id) { linkById[id].classList.toggle("is-current", id === current); });
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
    paint();
  }, { rootMargin: "-45% 0px -50% 0px" });
  Object.keys(linkById).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });
})();

export {};
