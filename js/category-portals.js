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
  var cards = [];
  var intersecting = new WeakMap(); // card -> bool, pra retomar certo depois de visibilitychange

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
    posterImg.src = cat.heroPoster;
    posterImg.alt = "";
    posterImg.setAttribute("aria-hidden", "true");
    media.appendChild(posterImg);

    if (!reducedMotion) {
      var video = document.createElement("video");
      video.className = "portal-card-video";
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", ""); // alguns iOS antigos só respeitam o atributo
      video.preload = "metadata";
      video.poster = cat.heroPoster;
      var source = document.createElement("source");
      source.src = cat.heroPreview;
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

  /* ---------------- Play/pause — autoplay por visibilidade, nunca por hover ----------------
     Todo preview visível toca sozinho em loop, sem depender de hover/focus/
     clique/scroll sobre o card — hover só afeta escala/glow via CSS (ver
     :hover em styles.css), nunca controla o <video>. Desktop pode ter os 5
     tocando ao mesmo tempo (são previews leves, ~1MB cada). Fora da
     viewport pausa pra liberar decodificação; ao voltar, retoma sozinho. */
  var isPointerFine = window.SG.perfTier !== "low" && matchMedia("(hover:hover) and (pointer:fine)").matches;

  function playCard(card) {
    var video = card.querySelector(".portal-card-video");
    if (!video) return;
    // autoplay bloqueado (iPhone em economia de bateria, etc.) só rejeita a
    // promise — o poster continua visível por baixo, nunca fica vazio
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }
  function pauseCard(card) {
    var video = card.querySelector(".portal-card-video");
    if (video) video.pause();
  }

  if (!reducedMotion && "IntersectionObserver" in window) {
    var mediaIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        intersecting.set(entry.target, entry.isIntersecting);
        if (entry.isIntersecting) playCard(entry.target);
        else pauseCard(entry.target);
      });
    }, { threshold: 0.25 });
    cards.forEach(function (card) { mediaIo.observe(card); });

    // trocar de aba não deve reiniciar os 5 vídeos do zero: só retoma quem
    // já estava visível antes de sumir, pausa todo mundo enquanto oculto
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        cards.forEach(pauseCard);
      } else {
        cards.forEach(function (card) { if (intersecting.get(card)) playCard(card); });
      }
    });
  } else if (!reducedMotion) {
    cards.forEach(playCard);
  }

  /* ---------------- Entrada em stagger ---------------- */
  if (window.SG.hasGSAP && !reducedMotion) {
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
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "rotateY(" + (x * 6) + "deg) rotateX(" + (y * -6) + "deg) translateY(-6px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }
})();

export {};
