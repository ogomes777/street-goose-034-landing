/* Street Goose 034 — detalhes do header de vidro: pílula que desliza sob o
   link em hover/foco e ponto de seção atual (scroll-spy). Só enfeite: sem
   este módulo o nav continua funcionando igual. */
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
