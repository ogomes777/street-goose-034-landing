/* Street Goose 034 — Página de categoria (montada sob demanda pelo router).
   Hero com vídeo sincronizado ao scroll via ScrollTrigger — única fonte de
   verdade de progresso, mas o <video>.currentTime nunca é escrito direto no
   onUpdate: um único RAF (gate por requestVideoFrameCallback quando
   disponível) lê um targetProgress e só dispara um novo seek quando a
   diferença passa de ~1 frame E o seek anterior já resolveu. Isso evita
   engasgo por seeks empilhados em vídeo com GOP longo.
   Produtos da categoria ficam ocultos até o hero chegar perto do fim
   (~0.995) — voltar o scroll esconde tudo de novo, nada é "on enter"
   irreversível. scroller aponta pro overlay (.category-page), que é quem
   tem overflow-y:auto — o document/window não rola enquanto a categoria
   está aberta (body fica position:fixed, ver router.js). */
export function mountCategoryPage(root, slug, onRequestClose) {
  var cat = window.SG_CATALOG_BY_SLUG && window.SG_CATALOG_BY_SLUG[slug];
  if (!cat) {
    root.innerHTML = '<p style="color:#fff;padding:120px 24px;text-align:center">Categoria não encontrada.</p>';
    return function () {};
  }

  root.style.setProperty("--portal-accent", cat.a);

  // arquivo escolhido uma única vez, antes de montar — nunca troca de <source>
  // no meio do scrub, mesmo se a janela for redimensionada depois
  var isMobileHero = window.innerWidth <= 860 && cat.heroVideoMobile;
  var heroVideoSrc = isMobileHero ? cat.heroVideoMobile : cat.heroVideo;

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
    '<div class="cat-hero" data-cat-hero>' +
      '<div class="cat-hero-sticky">' +
        '<img class="cat-hero-bg" src="' + cat.heroPoster + '" alt="" aria-hidden="true" />' +
        '<img class="cat-hero-poster" src="' + cat.heroPoster + '" alt="" />' +
        '<video class="cat-hero-video" data-cat-video muted playsinline preload="auto" poster="' + cat.heroPoster + '"><source src="' + heroVideoSrc + '" type="video/mp4" /></video>' +
        '<div class="cat-hero-scrim"></div>' +
        '<div class="cat-hero-copy"><p class="cat-hero-kicker">STREET GOOSE 034</p><h2 class="cat-hero-title">' + cat.label + "</h2></div>" +
        '<div class="cat-hero-progress"><div class="cat-hero-progress-track"><div class="cat-hero-progress-fill" data-cat-progress></div></div></div>' +
      "</div>" +
    "</div>" +
    '<div class="cat-catalog" data-cat-catalog>' +
      '<div class="cat-catalog-head"><h3>' + cat.label + "</h3><p>" + cat.count + " peças</p></div>" +
      '<div class="cat-catalog-grid" data-cat-grid>' + itemsHtml + "</div>" +
    "</div>";

  // root é reaproveitado entre categorias (só o innerHTML troca) — sem isso
  // o scrollTop de uma categoria anterior vaza pra próxima, o ScrollTrigger
  // mede o range do hero novo a partir de uma posição errada e o vídeo nunca
  // termina de scrubar (bug real: reproduzido testando abrir categoria B
  // logo depois de ter rolado a categoria A até o fim)
  root.scrollTop = 0;

  var closeBtn = root.querySelector("[data-cat-close]");
  var heroSection = root.querySelector("[data-cat-hero]");
  var video = root.querySelector("[data-cat-video]");
  var progressFill = root.querySelector("[data-cat-progress]");
  var grid = root.querySelector("[data-cat-grid]");
  var items = Array.prototype.slice.call(grid.children);

  function close() { onRequestClose(); }
  closeBtn.addEventListener("click", close);
  function onKeydown(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKeydown);

  // preço do banco chegou depois de montar (ex.: deep link /categoria/...):
  // troca só o corpo do card — preço e, se a peça ganhou/perdeu preço, o
  // botão (sacola ↔ WhatsApp). Hero, scrub e reveal não são tocados.
  function onPrices() {
    cat.items.forEach(function (item) {
      var body = grid.querySelector('[data-product-id="' + item.id + '"] .cat-item-body');
      if (body) body.innerHTML = itemBodyHtml(item);
    });
  }
  window.addEventListener("sg:prices", onPrices);

  // produto novo/removido/reordenado no painel e o banco respondeu depois de
  // montar (cache antigo): refaz só a grade; hero e scrub seguem intactos
  function onCatalog() {
    grid.innerHTML = cat.items.map(itemHtml).join("");
    items = Array.prototype.slice.call(grid.children);
    var countEl = root.querySelector(".cat-catalog-head p");
    if (countEl) countEl.textContent = cat.count + " peças";
    if (revealed || !canScrub) items.forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; });
  }
  window.addEventListener("sg:catalog", onCatalog);

  var reduced = window.SG.prefersReducedMotion();
  var canScrub = window.SG.hasGSAP && window.ScrollTrigger && !reduced;

  var revealTween = null;
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    if (window.gsap) {
      if (revealTween) revealTween.kill();
      revealTween = window.gsap.to(items, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out", stagger: 0.035 });
    } else {
      items.forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; });
    }
  }
  function unreveal() {
    if (!revealed) return;
    revealed = false;
    if (window.gsap) {
      if (revealTween) revealTween.kill();
      revealTween = window.gsap.to(items, { opacity: 0, y: 24, scale: 0.97, duration: 0.35, ease: "power2.in", stagger: 0.01 });
    } else {
      items.forEach(function (el) { el.style.opacity = "0"; });
    }
  }

  /* ---------------- Fallback estático: reduced motion / sem GSAP ---------------- */
  if (!canScrub) {
    heroSection.classList.add("cat-hero--static");
    video.setAttribute("preload", "none");
    items.forEach(function (el) { el.style.opacity = "1"; el.style.transform = "none"; });
    return function () {
      closeBtn.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("sg:prices", onPrices);
      window.removeEventListener("sg:catalog", onCatalog);
    };
  }

  // sem isso o <video> pinta uma área branca (comportamento padrão de vários
  // browsers antes do primeiro frame decodificado) por cima do poster —
  // nunca aparece até termos loadedmetadata + readyState>=2 + um seeked real
  video.style.opacity = "0";
  var firstFrameReady = false;
  var hasLoadedMeta = false;
  var hasSeekedOnce = false;
  function tryRevealFirstFrame() {
    if (firstFrameReady || !hasLoadedMeta || !hasSeekedOnce || video.readyState < 2) return;
    firstFrameReady = true;
    video.style.transition = "opacity .18s linear";
    video.style.opacity = "1";
  }
  // depois do primeiro frame, NUNCA mais escondemos por "waiting"/"seeking" —
  // o browser já preserva o último frame válido sozinho durante um seek; ficar
  // alternando opacidade a cada evento de scrub é exatamente o que causava a
  // "piscada" (não tela branca real, e sim o vídeo sumindo e voltando à toa)
  video.addEventListener("seeked", function () { hasSeekedOnce = true; tryRevealFirstFrame(); });
  video.addEventListener("canplay", tryRevealFirstFrame);

  var videoReady = false;
  var duration = 0;
  var catST = null;
  var refreshedAfterMeta = false;
  function onLoadedMeta() {
    duration = video.duration || 0;
    videoReady = true;
    hasLoadedMeta = true;
    tryRevealFirstFrame();
    // um único refresh, depois que o vídeo (que define a proporção sticky)
    // e o layout já assentaram — nunca durante o próprio scroll
    if (!refreshedAfterMeta && window.ScrollTrigger) {
      refreshedAfterMeta = true;
      window.ScrollTrigger.refresh();
    }
  }
  video.addEventListener("loadedmetadata", onLoadedMeta);
  video.load();

  var REVEAL_AT = 0.995;
  var targetProgress = 0;
  var isSeeking = false;
  var syncRaf = 0;
  var destroyed = false;
  var lastAppliedTime = -1;
  var FRAME_DURATION = 1 / 30; // vídeos rodam a 30fps — não vale a pena seekar por menos que isso

  // Máquina de estados explícita: category-selection (já passou, é essa
  // função sendo chamada) → hero-loading → hero-active → hero-completed →
  // products. Sem isso, qualquer refresh do ScrollTrigger (resize da barra
  // de endereço do Safari, troca de layout, IntersectionObserver oscilando)
  // podia recalcular self.progress um pouco abaixo do limiar de revelação
  // mesmo sem o usuário ter rolado nada, chamando unreveal() sozinho — o
  // "hero volta sozinho depois de concluído". Uma vez COMPLETED, o estado é
  // travado: só fechar e abrir a categoria de novo (nova entrada) reseta.
  var HERO_STATE = { LOADING: "hero-loading", ACTIVE: "hero-active", COMPLETED: "hero-completed" };
  var heroState = HERO_STATE.LOADING;

  video.addEventListener("seeking", function () { isSeeking = true; });
  video.addEventListener("seeked", function () { isSeeking = false; });

  // requestVideoFrameCallback existe, mas na prática só dispara de forma
  // confiável durante playback — pra vídeo pausado e só sendo "seekado" (o
  // caso do scrub) ele pode nunca disparar de novo depois do primeiro tick
  // em alguns browsers, travando a sincronização inteira (currentTime fica
  // parado em 0 pro resto da sessão — bug real encontrado testando). RAF
  // simples é o driver confiável aqui; o ganho de rVFC não vale o risco.
  function syncVideoToTarget() {
    if (destroyed) return;
    if (videoReady && !isSeeking && duration > 0) {
      var desired = Math.max(0, Math.min(duration, targetProgress * duration));
      if (Math.abs(desired - lastAppliedTime) > FRAME_DURATION) {
        video.currentTime = desired;
        lastAppliedTime = desired;
      }
    }
    syncRaf = requestAnimationFrame(syncVideoToTarget);
  }
  syncVideoToTarget();

  function completeHero() {
    if (heroState === HERO_STATE.COMPLETED) return;
    heroState = HERO_STATE.COMPLETED;
    progressFill.style.width = "100%";
    reveal();
    video.pause();
    // encerra o próprio trigger — nada mais escreve currentTime ou chama
    // reveal/unreveal depois disso; scroll na região do hero só mostra o
    // último frame parado, como esperado de "hero concluído"
    if (catST) { catST.kill(); catST = null; }
  }

  function applyProgress(p) {
    if (heroState === HERO_STATE.COMPLETED) return;
    targetProgress = p;
    progressFill.style.width = (Math.min(1, p) * 100).toFixed(1) + "%";
    if (p >= REVEAL_AT) {
      completeHero();
      return;
    }
    heroState = HERO_STATE.ACTIVE;
    unreveal();
  }

  catST = window.ScrollTrigger.create({
    trigger: heroSection, scroller: root, start: "top top", end: "bottom bottom", scrub: 0.18,
    invalidateOnRefresh: true,
    onUpdate: function (self) { applyProgress(self.progress); }
  });
  // o overlay é montado depois do DOM já existir com altura 0 no primeiro
  // paint — sem isso o ScrollTrigger mede o trigger antes do layout assentar
  requestAnimationFrame(function () { if (window.ScrollTrigger && !refreshedAfterMeta) window.ScrollTrigger.refresh(); });

  function onVisibilityChange() {
    if (document.hidden) { video.pause(); return; }
    lastAppliedTime = -1; // força ressincronizar ao voltar, o tempo pode ter ficado velho
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  return function destroy() {
    destroyed = true;
    if (catST) catST.kill();
    if (revealTween) revealTween.kill();
    if (syncRaf) cancelAnimationFrame(syncRaf);
    video.removeEventListener("loadedmetadata", onLoadedMeta);
    video.removeEventListener("canplay", tryRevealFirstFrame);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    closeBtn.removeEventListener("click", close);
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("sg:prices", onPrices);
    window.removeEventListener("sg:catalog", onCatalog);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}
