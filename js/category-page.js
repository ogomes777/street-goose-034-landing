/* Street Goose 034 — Página de categoria (montada sob demanda pelo router).
   Hero com vídeo em loop infinito tocando sozinho — não depende do scroll.
   Os arquivos de assets/heroes/loop/ já saem do encode com o fim emendado
   no começo por uma dissolução curta (sem o flash/preto das pontas do
   original), então o `loop` nativo dá a volta sem piscar. O poster é o
   primeiro frame do próprio loop: a troca poster → vídeo não tem salto.
   O vídeo só toca enquanto o hero está na tela e a aba está visível.
   Produtos aparecem uma única vez quando a grade entra na tela — nada se
   esconde de novo ao voltar o scroll. scroller é o overlay
   (.category-page), que tem overflow-y:auto — o document/window não rola
   enquanto a categoria está aberta (body fica position:fixed, ver router.js). */
export function mountCategoryPage(root, slug, onRequestClose) {
  var cat = window.SG_CATALOG_BY_SLUG && window.SG_CATALOG_BY_SLUG[slug];
  if (!cat) {
    root.innerHTML = '<p style="color:#fff;padding:120px 24px;text-align:center">Categoria não encontrada.</p>';
    return function () {};
  }

  root.style.setProperty("--portal-accent", cat.a);

  // arquivo escolhido uma única vez, antes de montar — nunca troca de <source>
  // com o vídeo tocando, mesmo se a janela for redimensionada depois
  var isMobileHero = window.innerWidth <= 860 && cat.heroVideoMobile;
  var heroVideoSrc = isMobileHero ? cat.heroVideoMobile : cat.heroVideo;
  var reduced = window.SG.prefersReducedMotion();

  function itemBodyHtml(item) {
    return (
      '<p class="cat-item-name">' + window.SG.esc(item.name) + "</p>" +
      '<p class="cat-item-price">' + item.priceLabel + "</p>" +
      (item.soldOut ? "" : item.consultWhatsApp
        ? '<a class="round-btn round-btn--wa" href="' + window.SG.waProductLink(item) + '" target="_blank" rel="noopener" aria-label="Consultar preço de ' + window.SG.esc(item.name) + ' no WhatsApp">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg></a>'
        : '<button class="round-btn" aria-label="Adicionar ' + window.SG.esc(item.name) + ' à sacola" data-add-to-cart="' + item.id + '">+</button>')
    );
  }

  function itemHtml(item) {
    return (
      '<article class="cat-item' + (item.soldOut ? " is-soldout" : "") + '" data-product-id="' + item.id + '">' +
        '<button class="favorite-btn" data-favorite-toggle="' + item.id + '" aria-pressed="false" aria-label="Favoritar ' + window.SG.esc(item.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4C22 4 23.6 7.6 22 11.1 19.5 15.9 12 20.5 12 20.5z"/></svg></button>' +
        '<div class="cat-item-img" data-open-quickview="' + item.id + '"><img src="' + window.SG.esc(item.images[0]) + '" alt="' + window.SG.esc(item.alt) + '" loading="lazy" /></div>' +
        '<div class="cat-item-body">' + itemBodyHtml(item) + "</div>" +
      "</article>"
    );
  }
  var itemsHtml = cat.items.map(itemHtml).join("");

  root.innerHTML =
    '<button class="cat-close" type="button" data-cat-close aria-label="Fechar categoria">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    "</button>" +
    '<section class="cat-hero" data-cat-hero>' +
      '<img class="cat-hero-bg" src="' + cat.heroPoster + '" alt="" aria-hidden="true" />' +
      '<img class="cat-hero-poster" src="' + cat.heroPoster + '" alt="" />' +
      (reduced ? "" :
        '<video class="cat-hero-video" data-cat-video muted loop playsinline preload="auto" poster="' + cat.heroPoster + '" aria-hidden="true"><source src="' + heroVideoSrc + '" type="video/mp4" /></video>') +
      '<div class="cat-hero-scrim"></div>' +
      '<div class="cat-hero-copy"><p class="cat-hero-kicker">STREET GOOSE 034</p><h2 class="cat-hero-title">' + cat.label + "</h2></div>" +
      '<button class="cat-hero-cue" type="button" data-cat-cue>Ver as peças' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
      "</button>" +
    "</section>" +
    '<div class="cat-catalog" data-cat-catalog>' +
      '<div class="cat-catalog-head"><h3>' + cat.label + "</h3><p>" + cat.count + " peças</p></div>" +
      '<div class="cat-catalog-grid" data-cat-grid>' + itemsHtml + "</div>" +
    "</div>";

  // root é reaproveitado entre categorias (só o innerHTML troca) — sem isso
  // o scrollTop de uma categoria anterior vaza pra próxima
  root.scrollTop = 0;

  var closeBtn = root.querySelector("[data-cat-close]");
  var cueBtn = root.querySelector("[data-cat-cue]");
  var heroSection = root.querySelector("[data-cat-hero]");
  var catalog = root.querySelector("[data-cat-catalog]");
  var video = root.querySelector("[data-cat-video]");
  var grid = root.querySelector("[data-cat-grid]");
  var items = Array.prototype.slice.call(grid.children);

  function close() { onRequestClose(); }
  closeBtn.addEventListener("click", close);
  function onKeydown(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKeydown);

  function onCue() {
    root.scrollTo({ top: catalog.offsetTop, behavior: reduced ? "auto" : "smooth" });
  }
  cueBtn.addEventListener("click", onCue);

  /* ---------------- Grade: entra uma vez, quando aparece ---------------- */
  var revealed = false;
  var revealTween = null;
  function showNow(list) {
    list.forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; });
  }
  function reveal() {
    if (revealed) return;
    revealed = true;
    if (window.gsap && !reduced) {
      revealTween = window.gsap.to(items, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out", stagger: 0.035 });
    } else {
      showNow(items);
    }
  }

  var gridIo = null;
  if ("IntersectionObserver" in window && !reduced) {
    gridIo = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      reveal();
      gridIo.disconnect();
      gridIo = null;
    }, { root: root, rootMargin: "0px 0px -8% 0px" });
    gridIo.observe(grid);
  } else {
    reveal();
  }

  // preço do banco chegou depois de montar (ex.: deep link /categoria/...):
  // troca só o corpo do card — preço e, se a peça ganhou/perdeu preço, o
  // botão (sacola ↔ WhatsApp). Hero e vídeo não são tocados.
  function onPrices() {
    cat.items.forEach(function (item) {
      var body = grid.querySelector('[data-product-id="' + item.id + '"] .cat-item-body');
      if (body) body.innerHTML = itemBodyHtml(item);
    });
  }
  window.addEventListener("sg:prices", onPrices);

  // produto novo/removido/reordenado no painel e o banco respondeu depois de
  // montar (cache antigo): refaz só a grade; hero e vídeo seguem intactos
  function onCatalog() {
    if (revealTween) { revealTween.kill(); revealTween = null; }
    grid.innerHTML = cat.items.map(itemHtml).join("");
    items = Array.prototype.slice.call(grid.children);
    var countEl = root.querySelector(".cat-catalog-head p");
    if (countEl) countEl.textContent = cat.count + " peças";
    if (revealed) showNow(items);
  }
  window.addEventListener("sg:catalog", onCatalog);

  function teardownCommon() {
    if (gridIo) gridIo.disconnect();
    if (revealTween) revealTween.kill();
    closeBtn.removeEventListener("click", close);
    cueBtn.removeEventListener("click", onCue);
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("sg:prices", onPrices);
    window.removeEventListener("sg:catalog", onCatalog);
  }

  /* ---------------- Reduced motion: só o poster, sem vídeo ---------------- */
  if (!video) return teardownCommon;

  /* ---------------- Vídeo em loop ---------------- */
  video.muted = true;
  video.defaultMuted = true;

  // o <video> fica invisível até ter frame decodificado de verdade — antes
  // disso alguns browsers pintam branco/vazio por cima do poster
  function markReady() {
    if (video.readyState >= 2) heroSection.classList.add("is-video-ready");
  }
  video.addEventListener("loadeddata", markReady);
  video.addEventListener("playing", markReady);

  var heroVisible = true; // o hero é o topo da página: começa na tela
  function play() {
    if (document.hidden || !heroVisible) return;
    // autoplay bloqueado (iPhone em economia de bateria, etc.) só rejeita a
    // promise — o poster, que é o mesmo primeiro frame, continua ali
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  // fora da tela não decodifica à toa (GPU livre pra rolar a grade)
  var heroIo = null;
  if ("IntersectionObserver" in window) {
    heroIo = new IntersectionObserver(function (entries) {
      heroVisible = entries[entries.length - 1].isIntersecting;
      if (heroVisible) play();
      else video.pause();
    }, { root: root });
    heroIo.observe(heroSection);
  }

  function onVisibilityChange() {
    if (document.hidden) video.pause();
    else play();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  play();

  return function destroy() {
    teardownCommon();
    if (heroIo) heroIo.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    video.removeEventListener("loadeddata", markReady);
    video.removeEventListener("playing", markReady);
    video.pause();
    // solta o decoder e o buffer na hora, sem esperar o GC
    video.removeAttribute("src");
    Array.prototype.forEach.call(video.querySelectorAll("source"), function (s) { s.removeAttribute("src"); });
    video.load();
  };
}
