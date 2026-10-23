/* Street Goose 034 — Portais de categoria.
   Seção separada do palco de 7 produtos (product-universe.js). Cinco cards
   quadrados com preview de vídeo autoplay independente do scroll (o loop
   completo da categoria toca depois do clique, em category-page.js).
   Só o card visível toca; fora da viewport pausa. Clique navega via router
   para /categoria/:slug — nunca mostra produto nenhum aqui, só o convite. */
(function () {
  "use strict";

  var grid = document.querySelector("[data-portal-grid]");
  if (!grid || !window.SG_CATALOG) return;

  var reducedMotion = window.SG.prefersReducedMotion();
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var limitedNetwork = !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "")));
  // Still images are the intentional fallback on very weak devices. This
  // avoids instantiating five hardware decoders for nonessential previews.
  var previewAllowed = !reducedMotion && !limitedNetwork && window.SG.perfTier !== "low";
  var cards = [];
  var intersecting = new WeakMap(); // card -> visibility, never a heavy scroll loop

  window.SG_CATALOG.forEach(function (cat) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "portal-card";
    card.style.setProperty("--portal-accent", cat.a);
    card.setAttribute("data-portal-slug", cat.slug);
    card.setAttribute("aria-label", "Explorar categoria " + cat.label);

    var media = document.createElement("div");
    media.className = "portal-card-media";
    // poster fica permanente por baixo, como <img> de verdade — nunca é
    // removido, então mesmo que o <video> pinte em branco/vazio antes do
    // primeiro frame decodificado (comportamento padrão de vários browsers),
    // o card nunca mostra nada além do poster ou do vídeo real
    var posterImg = document.createElement("img");
    posterImg.className = "portal-card-poster";
    // below the fold: fetched as the cards approach, never competing with
    // the hero poster for the first second of bandwidth
    posterImg.loading = "lazy";
    posterImg.decoding = "async";
    posterImg.src = cat.heroPoster;
    posterImg.alt = "";
    posterImg.setAttribute("aria-hidden", "true");
    media.appendChild(posterImg);

    if (previewAllowed) {
      var video = document.createElement("video");
      video.className = "portal-card-video";
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", ""); // alguns iOS antigos só respeitam o atributo
      // Nothing downloads until the card is near the screen (see nearIo
      // below); the poster covers the card until then, as it always did.
      video.preload = "none";
      video.poster = cat.heroPoster;
      var source = document.createElement("source");
      source.setAttribute("data-src", cat.heroPreview);
      source.type = "video/mp4";
      video.appendChild(source);
      // só revela o vídeo depois de ter dado real decodificado — antes disso
      // o poster (sempre presente, nunca removido) é que aparece
      function markReady() {
        if (video.readyState >= 2) media.classList.add("is-video-ready");
      }
      video.addEventListener("loadeddata", markReady);
      video.addEventListener("canplay", markReady);
      video.addEventListener("playing", markReady);
      media.appendChild(video);
      card.setAttribute("data-portal-video", "");
    }
    card.appendChild(media);

    var body = document.createElement("div");
    body.className = "portal-card-body";
    body.innerHTML = '<p class="portal-card-name">' + cat.label + "</p>";
    card.appendChild(body);

    card.addEventListener("click", function () {
      if (window.SG_ROUTER) window.SG_ROUTER.navigate("/categoria/" + cat.slug);
    });

    grid.appendChild(card);
    cards.push(card);
  });

  /* ---------------- Scroll nativo + descoberta dos próximos portais ----------------
     Um único listener passivo e um rAF por frame. Sem drag JS nem GSAP no
     touch: o gesto horizontal e o scroll snap continuam nativos no Safari. */
  var mobileMq = window.matchMedia("(max-width: 640px)");
  var prevButton = document.querySelector("[data-portal-prev]");
  var nextButton = document.querySelector("[data-portal-next]");
  var counter = document.querySelector("[data-portal-count]");
  var hint = document.querySelector("[data-portal-hint]");
  var shell = grid.closest(".portal-rail-shell");
  var currentCard = 0;
  var scrollQueued = false;
  var discovered = false;

  function markDiscovered() {
    if (discovered) return;
    discovered = true;
    if (hint) hint.classList.add("is-discovered");
  }
  function closestCardIndex() {
    var bounds = grid.getBoundingClientRect();
    var winner = 0;
    var minimum = Infinity;
    cards.forEach(function (card, i) {
      var distance = Math.abs(card.getBoundingClientRect().left - bounds.left - 2);
      if (distance < minimum) { minimum = distance; winner = i; }
    });
    return winner;
  }
  function updateRail() {
    scrollQueued = false;
    if (!mobileMq.matches || !cards.length) return;
    currentCard = closestCardIndex();
    if (counter) counter.textContent = String(currentCard + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
    if (prevButton) prevButton.hidden = currentCard === 0;
    if (nextButton) nextButton.hidden = currentCard === cards.length - 1;
    if (shell) shell.classList.toggle("is-at-end", currentCard === cards.length - 1);
  }
  function scheduleRailUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateRail);
  }
  function navigateRail(delta) {
    if (!mobileMq.matches || !cards.length) return;
    var target = Math.max(0, Math.min(cards.length - 1, closestCardIndex() + delta));
    markDiscovered();
    var bounds = grid.getBoundingClientRect();
    // Uses scrollLeft + local geometry, so margins and scroll-padding
    // cannot shift the intended card on iOS Safari.
    var left = grid.scrollLeft + cards[target].getBoundingClientRect().left - bounds.left - 2;
    grid.scrollTo({
      left: left,
      behavior: reducedMotion ? "auto" : "smooth"
    });
    // The scroll event runs while native inertia progresses.
    scheduleRailUpdate();
  }
  if (nextButton) nextButton.addEventListener("click", function () { navigateRail(1); });
  if (prevButton) prevButton.addEventListener("click", function () { navigateRail(-1); });
  grid.addEventListener("scroll", function () { markDiscovered(); scheduleRailUpdate(); }, { passive: true });
  window.addEventListener("resize", scheduleRailUpdate, { passive: true });
  requestAnimationFrame(updateRail);

  /* ---------------- One active video decoder per visible collection ----------------
     Before this revision, all five autoplay previews could run on desktop.
     Only the most central, visible card now plays; the other four retain
     their crisp posters. Hidden cards never download an MP4. */
  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var activePreview = null;
  var videoQueued = false;
  function loadCard(card) {
    var video = card.querySelector(".portal-card-video");
    var source = video && video.querySelector("source[data-src]");
    if (!source) return;
    source.src = source.getAttribute("data-src");
    source.removeAttribute("data-src");
    video.preload = "metadata";
    video.load();
  }
  function playCard(card) {
    var video = card.querySelector(".portal-card-video");
    if (!video) return;
    loadCard(card);
    try {
      var promise = video.play();
      if (promise && typeof promise.catch === "function") promise.catch(function () {});
    } catch (_) {} // autoplay gesture restrictions: poster remains
  }
  function pauseCard(card) {
    var video = card.querySelector(".portal-card-video");
    if (video && !video.paused) video.pause();
  }
  function reconcilePreviews() {
    videoQueued = false;
    if (!previewAllowed) return;
    if (document.hidden) {
      if (activePreview) pauseCard(activePreview);
      activePreview = null;
      return;
    }
    var best = null;
    var minimum = Infinity;
    var center = window.innerWidth / 2;
    cards.forEach(function (card) {
      if (!intersecting.get(card)) return;
      var bounds = card.getBoundingClientRect();
      var distance = Math.abs(bounds.left + bounds.width / 2 - center);
      if (distance < minimum) { minimum = distance; best = card; }
    });
    if (best === activePreview) return;
    if (activePreview) pauseCard(activePreview);
    activePreview = best;
    if (best) playCard(best);
  }
  function schedulePreviewReconcile() {
    if (videoQueued || !previewAllowed) return;
    videoQueued = true;
    requestAnimationFrame(reconcilePreviews);
  }
  if (previewAllowed && "IntersectionObserver" in window) {
    var mediaIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        intersecting.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.24);
      });
      schedulePreviewReconcile();
    }, { threshold: [0, 0.24, 0.5] });
    cards.forEach(function (card) { mediaIo.observe(card); });
    grid.addEventListener("scroll", schedulePreviewReconcile, { passive: true });
    window.addEventListener("resize", schedulePreviewReconcile, { passive: true });
    document.addEventListener("visibilitychange", schedulePreviewReconcile);
  } else if (previewAllowed) {
    // Older browsers: never start five competing decoders in the fallback.
    var firstVideo = cards.find(function (card) { return !!card.querySelector(".portal-card-video"); });
    if (firstVideo) playCard(firstVideo);
    document.addEventListener("visibilitychange", function () {
      if (!firstVideo) return;
      if (document.hidden) pauseCard(firstVideo);
      else playCard(firstVideo);
    });
  }

  /* ---------------- Entrada em stagger ---------------- */
  // Mobile paint stays cheap: no clip-path animation across five large videos.
  if (window.SG.hasGSAP && !reducedMotion && !mobileMq.matches && window.SG.perfTier !== "low") {
    window.gsap.set(cards, { opacity: 0, y: 26, clipPath: "inset(12% 0 12% 0)" });
    var revealIo = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      window.gsap.to(cards, {
        opacity: 1, y: 0, clipPath: "inset(0% 0 0% 0)",
        duration: window.SG.motion.base, ease: window.SG.motion.easeOut, stagger: 0.08
      });
      revealIo.disconnect();
    }, { threshold: 0.2 });
    revealIo.observe(grid);
  } else {
    cards.forEach(function (card) { card.style.opacity = "1"; });
  }

  /* ---------------- Pointer tilt (desktop) ---------------- */
  if (isPointerFine) {
    cards.forEach(function (card) {
      var tiltFrame = 0;
      var mouseX = 0, mouseY = 0;
      card.addEventListener("pointermove", function (e) {
        mouseX = e.clientX; mouseY = e.clientY;
        if (tiltFrame) return;
        tiltFrame = requestAnimationFrame(function () {
          tiltFrame = 0;
          var r = card.getBoundingClientRect();
          var x = (mouseX - r.left) / r.width - 0.5;
          var y = (mouseY - r.top) / r.height - 0.5;
          card.style.transform = "rotateY(" + (x * 6) + "deg) rotateX(" + (y * -6) + "deg) translateY(-6px)";
        });
      }, { passive: true });
      card.addEventListener("pointerleave", function () {
        if (tiltFrame) cancelAnimationFrame(tiltFrame);
        tiltFrame = 0;
        card.style.transform = "";
      });
    });
  }
})();

export {};
